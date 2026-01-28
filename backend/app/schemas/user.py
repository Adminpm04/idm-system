from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=255)
    department: Optional[str] = None
    position: Optional[str] = None
    manager_id: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role_ids: Optional[List[int]] = None


class UserPasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    is_demo: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
    auth_source: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    roles: List["RoleResponse"] = []


# Role Schemas
class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    id: int
    is_system: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class RoleDetailResponse(RoleResponse):
    permissions: List["PermissionResponse"] = []


# Permission Schemas
class PermissionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    resource: str = Field(..., min_length=1, max_length=100)
    action: str = Field(..., min_length=1, max_length=50)


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[int] = None
    exp: Optional[int] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# Resolve forward references
UserResponse.model_rebuild()
RoleDetailResponse.model_rebuild()
