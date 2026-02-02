from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.models import User
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from cookie or Authorization header"""
    # Try to get token from httpOnly cookie first
    token = request.cookies.get("access_token")

    # Fall back to Authorization header
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify user is superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


async def get_admin_reader(
    current_user: User = Depends(get_current_user)
) -> User:
    """Allow superusers and demo users (read-only access for demo)"""
    if current_user.is_superuser or current_user.is_demo:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions",
    )


async def get_admin_writer(
    current_user: User = Depends(get_current_user)
) -> User:
    """Only allow real superusers (not demo) for write operations"""
    if current_user.is_superuser and not current_user.is_demo:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Demo users have read-only access",
    )


def check_permission(resource: str, action: str):
    """Check if user has specific permission"""
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Superuser has all permissions
        if current_user.is_superuser:
            return current_user
        
        # Check user's roles and permissions
        from app.models import Permission
        
        has_permission = False
        for role in current_user.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    has_permission = True
                    break
            if has_permission:
                break
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {resource}:{action}",
            )
        
        return current_user
    
    return permission_checker
