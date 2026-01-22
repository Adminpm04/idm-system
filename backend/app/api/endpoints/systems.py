from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.system import (
    SystemCreate, SystemUpdate, SystemResponse, SystemDetailResponse,
    AccessRoleCreate, AccessRoleUpdate, AccessRoleResponse
)
from app.models import System, AccessRole, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[SystemResponse])
async def list_systems(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all systems"""
    query = db.query(System)
    
    if is_active is not None:
        query = query.filter(System.is_active == is_active)
    
    systems = query.offset(skip).limit(limit).all()
    return systems


@router.post("", response_model=SystemResponse, status_code=status.HTTP_201_CREATED)
async def create_system(
    system_in: SystemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new system"""
    # Check if code exists
    if db.query(System).filter(System.code == system_in.code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System code already exists"
        )
    
    system = System(**system_in.model_dump())
    db.add(system)
    db.commit()
    db.refresh(system)
    return system


@router.get("/{system_id}", response_model=SystemDetailResponse)
async def get_system(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system details"""
    system = db.query(System).filter(System.id == system_id).first()
    if not system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System not found"
        )
    return system


@router.put("/{system_id}", response_model=SystemResponse)
async def update_system(
    system_id: int,
    system_update: SystemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update system"""
    system = db.query(System).filter(System.id == system_id).first()
    if not system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System not found"
        )
    
    update_data = system_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(system, field, value)
    
    db.commit()
    db.refresh(system)
    return system


@router.post("/{system_id}/roles", response_model=AccessRoleResponse)
async def create_access_role(
    system_id: int,
    role_in: AccessRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create access role for system"""
    system = db.query(System).filter(System.id == system_id).first()
    if not system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System not found"
        )
    
    role = AccessRole(**role_in.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/{system_id}/roles", response_model=List[AccessRoleResponse])
async def list_access_roles(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List access roles for system"""
    roles = db.query(AccessRole).filter(
        AccessRole.system_id == system_id,
        AccessRole.is_active == True
    ).all()
    return roles

@router.delete("/{system_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete system"""
    system = db.query(System).filter(System.id == system_id).first()
    if not system:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System not found"
        )
    db.delete(system)
    db.commit()
    return None
