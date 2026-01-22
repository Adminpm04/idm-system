from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ApprovalChainBase(BaseModel):
    system_id: int
    step_number: int
    approver_id: int
    approver_role: Optional[str] = None
    is_required: bool = True


class ApprovalChainCreate(ApprovalChainBase):
    pass


class ApprovalChainResponse(ApprovalChainBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
