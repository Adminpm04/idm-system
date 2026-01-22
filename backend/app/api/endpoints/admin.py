from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.session import get_db
from app.schemas.user import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from app.models import Role, Permission, User, AuditLog, AccessRequest
from app.api.deps import get_current_superuser

router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """List all roles"""
    roles = db.query(Role).all()
    return roles


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create new role"""
    if db.query(Role).filter(Role.name == role_in.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    role = Role(
        name=role_in.name,
        description=role_in.description
    )
    
    # Add permissions
    if role_in.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_in.permission_ids)
        ).all()
        role.permissions = permissions
    
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """List all permissions"""
    permissions = db.query(Permission).all()
    return permissions


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Get audit logs with full details"""
    # Загружаем логи с связанными данными
    logs = db.query(AuditLog).options(
        joinedload(AuditLog.user),
        joinedload(AuditLog.request).joinedload(AccessRequest.system),
        joinedload(AuditLog.request).joinedload(AccessRequest.target_user)
    ).order_by(
        AuditLog.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return logs
