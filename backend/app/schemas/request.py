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


class AttachmentResponseBasic(BaseModel):
    """Basic attachment info for detail response"""
    id: int
    filename: str
    file_size: int
    content_type: str
    description: Optional[str] = None
    attachment_type: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    uploaded_by_name: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class AccessRequestDetailResponse(AccessRequestResponse):
    approvals: List[ApprovalResponse] = []
    comments: List[RequestCommentResponse] = []
    attachments: List[AttachmentResponseBasic] = []


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


# Bulk Request Schemas
class BulkRequestCreate(BaseModel):
    """Input data for creating multiple requests at once"""
    user_ids: List[int] = Field(..., min_length=1, max_length=20)
    system_id: int
    subsystem_id: Optional[int] = None
    access_role_id: int
    request_type: RequestType
    purpose: str = Field(..., min_length=10)
    is_temporary: bool = False
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class BulkRequestResponse(BaseModel):
    """Response for bulk request creation"""
    total: int
    created: int
    skipped: List[dict] = []
    request_ids: List[int]


# Attachment Schemas
class AttachmentResponse(BaseModel):
    """Response schema for file attachment"""
    id: int
    request_id: int
    filename: str
    file_size: int
    content_type: str
    description: Optional[str] = None
    attachment_type: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    uploaded_by_name: Optional[str] = None
    uploaded_at: datetime
    download_count: int
    last_downloaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    """Response after successful upload"""
    id: int
    filename: str
    file_size: int
    content_type: str
    message: str


# Recommendation Schemas (ML-based suggestions)
class SystemRecommendation(BaseModel):
    """Recommended system for the user"""
    system_id: int
    system_name: str
    system_code: str
    score: float  # 0-100
    reason: str   # "На основе ваших заявок" / "Популярно в вашем отделе"


class RoleRecommendation(BaseModel):
    """Recommended role for a selected system"""
    access_role_id: int
    role_name: str
    access_level: str
    risk_level: int
    score: float  # 0-100
    reason: str


class RecommendationsResponse(BaseModel):
    """Response with recommended systems and roles"""
    recommended_systems: List[SystemRecommendation] = []
    recommended_roles: List[RoleRecommendation] = []
