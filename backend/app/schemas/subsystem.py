from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SubsystemBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True


class SubsystemCreate(SubsystemBase):
    system_id: int


class SubsystemUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SubsystemResponse(SubsystemBase):
    id: int
    system_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
