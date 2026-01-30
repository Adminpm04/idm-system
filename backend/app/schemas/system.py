from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from app.models.system import SystemType, AccessLevel, CriticalityLevel


# System Schemas
class SystemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    system_type: SystemType = SystemType.APPLICATION
    criticality_level: CriticalityLevel = CriticalityLevel.MEDIUM
    url: Optional[str] = None
    documentation_url: Optional[str] = None
    owner_id: Optional[int] = None


class SystemCreate(SystemBase):
    pass


class SystemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_type: Optional[SystemType] = None
    criticality_level: Optional[CriticalityLevel] = None
    url: Optional[str] = None
    documentation_url: Optional[str] = None
    owner_id: Optional[int] = None
    is_active: Optional[bool] = None


class SystemResponse(SystemBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Access Role Schemas
class AccessRoleBase(BaseModel):
    system_id: int
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    access_level: AccessLevel
    risk_level: int = Field(default=1, ge=1, le=3)


class AccessRoleCreate(AccessRoleBase):
    pass


class AccessRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    access_level: Optional[AccessLevel] = None
    risk_level: Optional[int] = Field(None, ge=1, le=3)
    is_active: Optional[bool] = None


class AccessRoleResponse(AccessRoleBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Approval Chain Schemas
class ApprovalChainBase(BaseModel):
    system_id: int
    access_role_id: Optional[int] = None
    step_number: int = Field(..., ge=1)
    approver_role: Optional[str] = None
    approver_user_id: Optional[int] = None
    is_required: bool = True


class ApprovalChainCreate(ApprovalChainBase):
    pass


class ApprovalChainUpdate(BaseModel):
    approver_role: Optional[str] = None
    approver_user_id: Optional[int] = None
    is_required: Optional[bool] = None


class ApprovalChainResponse(ApprovalChainBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# System with details
class SystemDetailResponse(SystemResponse):
    access_roles: List[AccessRoleResponse] = []
    approval_chains: List[ApprovalChainResponse] = []
