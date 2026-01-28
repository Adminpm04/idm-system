from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.schemas.user import LoginRequest, Token, UserResponse
from app.models import User
from app.core.security import verify_password, create_access_token, create_refresh_token, get_password_hash
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.ldap_auth import ldap_service

router = APIRouter()


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


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint with AD integration"""
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

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    from app.core.security import decode_token
    
    payload = decode_token(refresh_token)
    
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
