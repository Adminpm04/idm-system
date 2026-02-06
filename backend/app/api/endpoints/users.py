from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import os
import uuid
from app.db.session import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPasswordUpdate
from app.models import User, Role
from app.api.deps import get_current_user, get_current_superuser
from app.core.security import get_password_hash


# Profile update schema
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


# Avatar upload directory
AVATAR_DIR = "/opt/idm-system/backend/uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users with roles"""
    users = db.query(User).options(
        joinedload(User.roles)
    ).offset(skip).limit(limit).all()
    return users


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create new user (admin only)"""
    # Check if user exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create user
    user = User(
        **user_in.model_dump(exclude={'password', 'role_ids'}),
        hashed_password=get_password_hash(user_in.password)
    )

    # Assign roles if provided
    if user_in.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        user.roles = roles

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Tour endpoints - must be before /{user_id} routes
@router.post("/me/tour-complete", response_model=UserResponse)
async def complete_tour(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark onboarding tour as completed for current user"""
    current_user.tour_completed = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/tour-reset", response_model=UserResponse)
async def reset_tour(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset onboarding tour for current user (to see it again)"""
    current_user.tour_completed = False
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/profile", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile"""
    return current_user


@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile (name, email, phone, etc.)"""
    update_data = profile_update.model_dump(exclude_unset=True)

    # Check email uniqueness if being changed
    if 'email' in update_data and update_data['email'] != current_user.email:
        existing = db.query(User).filter(User.email == update_data['email']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )

    # Update fields
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload profile avatar"""
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP"
        )

    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 5MB"
        )

    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    # Delete old avatar if exists
    if current_user.avatar_url:
        old_filename = current_user.avatar_url.split('/')[-1]
        old_path = os.path.join(AVATAR_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new avatar
    with open(filepath, 'wb') as f:
        f.write(contents)

    # Update user avatar_url
    current_user.avatar_url = f"/api/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
async def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete profile avatar"""
    if current_user.avatar_url:
        filename = current_user.avatar_url.split('/')[-1]
        filepath = os.path.join(AVATAR_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

        current_user.avatar_url = None
        db.commit()
        db.refresh(current_user)

    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user"""
    # Only superuser or self can update
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Handle roles separately
    if 'role_ids' in update_data:
        role_ids = update_data.pop('role_ids')
        if role_ids is not None:
            roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
            user.roles = roles
    
    # Update other fields
    for field, value in update_data.items():
        if field != 'password' or value:  # Only update password if provided
            if field == 'password' and value:
                setattr(user, 'hashed_password', get_password_hash(value))
            else:
                setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_update: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only change own password"
        )
    
    from app.core.security import verify_password
    
    if not verify_password(password_update.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    current_user.hashed_password = get_password_hash(password_update.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Delete user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Нельзя удалить самого себя
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db.delete(user)
    db.commit()
    return None
