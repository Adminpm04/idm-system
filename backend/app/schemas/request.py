from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.models.request import RequestType, RequestStatus, ApprovalStatus


# Access Request Schemas
class AccessRequestBase(BaseModel):
    target_user_id: int
    system_id: int
    subsystem_id: Optional[int] = None
    access_role_id: int
    request_type: RequestType
    purpose: str = Field(..., min_length=10)
    is_temporary: bool = False
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class AccessRequestCreate(AccessRequestBase):
    pass


class AccessRequestUpdate(BaseModel):
    purpose: Optional[str] = Field(None, min_length=10)
    valid_until: Optional[date] = None


class AccessRequestSubmit(BaseModel):
    """Submit a draft request for approval"""
    pass


class AccessRequestCancel(BaseModel):
    reason: Optional[str] = None


# Approval Schemas
class ApprovalDecision(BaseModel):
    decision: ApprovalStatus  # approved or rejected
    comment: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: int
    request_id: int
    step_number: int
    approver_id: int
    approver_role: Optional[str] = None
    status: ApprovalStatus
    decision_date: Optional[datetime] = None
    comment: Optional[str] = None
    created_at: datetime
    
    # Approver info
    approver_name: Optional[str] = None
    approver_email: Optional[str] = None
    
    class Config:
        from_attributes = True


# Comment Schemas
class RequestCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)
    is_internal: bool = False


class RequestCommentResponse(BaseModel):
    id: int
    request_id: int
    user_id: Optional[int] = None
    comment: str
    is_internal: bool
    created_at: datetime
    
    # User info
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: int
    request_id: Optional[int] = None
    user_id: Optional[int] = None
    action: str
    details: Optional[str] = None
    created_at: datetime
    
    # User info
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# Access Request Response
class AccessRequestResponse(BaseModel):
    id: int
    request_number: str
    requester_id: Optional[int] = None
    target_user_id: int
    system_id: int
    subsystem_id: Optional[int] = None
    access_role_id: int
    request_type: RequestType
    status: RequestStatus
    purpose: str
    is_temporary: bool
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    current_step: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Related object names
    requester_name: Optional[str] = None
    target_user_name: Optional[str] = None
    system_name: Optional[str] = None
    subsystem_name: Optional[str] = None
    access_role_name: Optional[str] = None

    # Decision info (for /my-decisions endpoint)
    my_decision: Optional[str] = None
    my_decision_date: Optional[str] = None
    my_decision_comment: Optional[str] = None

    class Config:
        from_attributes = True


class AccessRequestDetailResponse(AccessRequestResponse):
    approvals: List[ApprovalResponse] = []
    comments: List[RequestCommentResponse] = []


# List/Filter Schemas
class AccessRequestFilter(BaseModel):
    status: Optional[RequestStatus] = None
    request_type: Optional[RequestType] = None
    requester_id: Optional[int] = None
    target_user_id: Optional[int] = None
    system_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None


# Dashboard/Statistics
class RequestStatistics(BaseModel):
    total_requests: int
    pending_approval: int
    approved: int
    rejected: int
    implemented: int
    my_pending_approvals: int


class MyRequestsSummary(BaseModel):
    drafts: int
    pending: int
    approved: int
    rejected: int
