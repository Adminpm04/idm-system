from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
from app.schemas.user import LoginRequest, Token, UserResponse
from app.models import User
from app.core.security import verify_password, create_access_token, create_refresh_token, get_password_hash
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.ldap_auth import ldap_service
from pydantic import BaseModel
import secrets
import hashlib

router = APIRouter()

# In-memory store for 2FA codes (in production, use Redis)
_2fa_codes = {}


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set httpOnly cookies for JWT tokens"""
    # Access token cookie (shorter lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        domain=settings.COOKIE_DOMAIN
    )
    # Refresh token cookie (longer lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth/refresh",  # Only sent to refresh endpoint
        domain=settings.COOKIE_DOMAIN
    )


def clear_auth_cookies(response: Response):
    """Clear auth cookies on logout"""
    response.delete_cookie(key="access_token", path="/", domain=settings.COOKIE_DOMAIN)
    response.delete_cookie(key="refresh_token", path="/api/auth/refresh", domain=settings.COOKIE_DOMAIN)

# 2FA code expiration time in seconds
TWO_FA_CODE_EXPIRY = 180  # 3 minutes

class TwoFactorRequest(BaseModel):
    username: str
    password: str

class TwoFactorResponse(BaseModel):
    requires_2fa: bool = True
    session_token: str
    code_expiry_seconds: int = TWO_FA_CODE_EXPIRY
    message: str = "Verification code sent"

class VerifyCodeRequest(BaseModel):
    session_token: str
    code: str

def generate_2fa_code():
    """Generate a 6-digit verification code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def store_2fa_code(user_id: int, code: str) -> str:
    """Store 2FA code and return session token"""
    # Create a session token
    session_token = secrets.token_urlsafe(32)

    # Store code with expiration
    _2fa_codes[session_token] = {
        'user_id': user_id,
        'code': code,
        'expires_at': datetime.now(timezone.utc) + timedelta(seconds=TWO_FA_CODE_EXPIRY),
        'created_at': datetime.now(timezone.utc)
    }

    # Clean up old codes
    cleanup_expired_codes()

    return session_token

def verify_2fa_code(session_token: str, code: str) -> int:
    """Verify 2FA code and return user_id if valid"""
    if session_token not in _2fa_codes:
        return None

    stored = _2fa_codes[session_token]

    # Check expiration
    if datetime.now(timezone.utc) > stored['expires_at']:
        del _2fa_codes[session_token]
        return None

    # Check code
    if stored['code'] != code:
        return None

    # Code is valid, remove it and return user_id
    user_id = stored['user_id']
    del _2fa_codes[session_token]
    return user_id

def cleanup_expired_codes():
    """Remove expired 2FA codes"""
    now = datetime.now(timezone.utc)
    expired = [token for token, data in _2fa_codes.items() if now > data['expires_at']]
    for token in expired:
        del _2fa_codes[token]


def find_manager_by_dn(db: Session, manager_dn: str) -> User:
    """Find manager user by AD distinguished name"""
    if not manager_dn:
        return None

    # First try to find by ad_dn
    manager = db.query(User).filter(User.ad_dn == manager_dn).first()
    if manager:
        return manager

    # If not found, try to get manager's username from AD and find by username
    manager_data = ldap_service.get_user_by_dn(manager_dn)
    if manager_data and manager_data.get('sAMAccountName'):
        manager = db.query(User).filter(User.username == manager_data['sAMAccountName']).first()
        return manager

    return None


def sync_user_from_ad(db: Session, user: User, ad_data: dict) -> User:
    """Sync user data from Active Directory"""
    # Update basic fields
    if ad_data.get('email'):
        user.email = ad_data['email']
    if ad_data.get('full_name'):
        user.full_name = ad_data['full_name']
    if ad_data.get('department'):
        user.department = ad_data['department']
    if ad_data.get('title'):
        user.position = ad_data['title']
    if ad_data.get('phone'):
        user.phone = ad_data['phone']

    # Update AD-specific fields
    user.auth_source = 'ldap'
    if ad_data.get('object_guid'):
        user.ad_guid = ad_data['object_guid']
    if ad_data.get('distinguished_name'):
        user.ad_dn = ad_data['distinguished_name']
    if ad_data.get('manager_dn'):
        user.ad_manager_dn = ad_data['manager_dn']
        # Try to link manager
        manager = find_manager_by_dn(db, ad_data['manager_dn'])
        if manager:
            user.manager_id = manager.id

    # Update disabled status
    user.ad_disabled = ad_data.get('is_disabled', False)
    user.last_ad_sync = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user


def create_user_from_ad(db: Session, ad_data: dict) -> User:
    """Create a new user from Active Directory data"""
    # Generate a random password hash (user will auth via AD, not local password)
    import secrets
    random_password = secrets.token_urlsafe(32)

    user = User(
        username=ad_data['username'],
        email=ad_data.get('email') or f"{ad_data['username']}@corp.orien.tj",
        full_name=ad_data.get('full_name') or ad_data['username'],
        hashed_password=get_password_hash(random_password),
        department=ad_data.get('department'),
        position=ad_data.get('title'),
        phone=ad_data.get('phone'),
        is_active=True,
        is_superuser=False,
        auth_source='ldap',
        ad_guid=ad_data.get('object_guid'),
        ad_dn=ad_data.get('distinguished_name'),
        ad_manager_dn=ad_data.get('manager_dn'),
        ad_disabled=ad_data.get('is_disabled', False),
        last_ad_sync=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Try to link manager after user is created
    if ad_data.get('manager_dn'):
        manager = find_manager_by_dn(db, ad_data['manager_dn'])
        if manager:
            user.manager_id = manager.id
            db.commit()

    return user


@router.post("/login")
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint with AD integration and 2FA"""
    user = None
    ad_authenticated = False

    # Try AD authentication first if enabled
    if settings.LDAP_ENABLED:
        ad_data = ldap_service.authenticate(login_data.username, login_data.password)
        if ad_data:
            # Check if account is disabled in AD
            if ad_data.get('is_disabled'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is disabled in Active Directory. Please contact IT support.",
                )

            ad_authenticated = True
            # Check if user exists in local DB
            user = db.query(User).filter(User.username == ad_data['username']).first()

            if not user:
                # Auto-create user from AD data
                user = create_user_from_ad(db, ad_data)
            else:
                # Sync user info from AD (updates all fields including manager)
                user = sync_user_from_ad(db, user, ad_data)

    # If AD auth failed, try local authentication (fallback for admin)
    if not ad_authenticated:
        user = db.query(User).filter(User.username == login_data.username).first()
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Check if demo user has expired
    if user.is_demo and user.demo_expires_at:
        if user.demo_expires_at < datetime.now(timezone.utc):
            # Deactivate the demo user
            user.is_active = False
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo access has expired. Please contact administrator.",
            )

    # Check if AD user is disabled (only for LDAP users, not local users)
    if user.auth_source == 'ldap' and user.ad_disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is disabled in AD. Please contact IT support.",
        )

    # Check if 2FA is required (only for admins, not demo users)
    if user.is_superuser and not user.is_demo:
        # Generate 2FA code
        code = generate_2fa_code()
        session_token = store_2fa_code(user.id, code)

        # Send code via email
        from app.core.email import send_2fa_email
        email_sent = send_2fa_email(user.email, code, user.full_name)

        if not email_sent:
            logger.warning(f"Failed to send 2FA email to {user.email}")

        logger.info(f"2FA code generated for user {user.username}")

        return {
            "requires_2fa": True,
            "session_token": session_token,
            "code_expiry_seconds": TWO_FA_CODE_EXPIRY,
            "message": "Verification code sent"
        }

    # Regular users and demo users - direct login without 2FA
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/verify-2fa", response_model=Token)
@limiter.limit("10/minute")  # Max 10 2FA attempts per minute per IP
async def verify_2fa(
    request: Request,
    response: Response,
    verify_data: VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    """Verify 2FA code and complete login"""
    user_id = verify_2fa_code(verify_data.session_token, verify_data.code)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification code",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(response: Response):
    """Logout endpoint - clears auth cookies"""
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=Token)
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    refresh_token_body: str = None,
    db: Session = Depends(get_db)
):
    """Refresh access token - reads from cookie or body"""
    from app.core.security import decode_token

    # Try to get refresh token from cookie first, then body
    token = request.cookies.get("refresh_token") or refresh_token_body

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    payload = decode_token(token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, new_refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user
