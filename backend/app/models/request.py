from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class RequestType(str, enum.Enum):
    NEW_ACCESS = "new_access"
    MODIFY_ACCESS = "modify_access"
    REVOKE_ACCESS = "revoke_access"
    TEMPORARY_ACCESS = "temporary_access"


class RequestStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"
    CANCELLED = "cancelled"


class AccessRequest(Base):
    """Main access request entity"""
    __tablename__ = "access_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., REQ-2025-00001
    
    # Who is requesting and for whom
    requester_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    target_user_id = Column(Integer, ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)

    # What access
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='RESTRICT'), nullable=False)
    subsystem_id = Column(Integer, ForeignKey('subsystems.id', ondelete='SET NULL'), nullable=True)
    access_role_id = Column(Integer, ForeignKey('access_roles.id', ondelete='RESTRICT'), nullable=False)
    
    # Request details
    request_type = Column(Enum(RequestType), nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.DRAFT, nullable=False)
    
    purpose = Column(Text, nullable=False)  # Business justification
    
    # Temporary access
    is_temporary = Column(Boolean, default=False, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    
    # Current approval step
    current_step = Column(Integer, default=1, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], back_populates="created_requests")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="target_requests")
    system = relationship("System")
    subsystem = relationship("Subsystem")
    access_role = relationship("AccessRole")
    
    approvals = relationship("Approval", back_populates="request", cascade="all, delete-orphan", order_by="Approval.step_number")
    comments = relationship("RequestComment", back_populates="request", cascade="all, delete-orphan", order_by="RequestComment.created_at.desc()")
    audit_logs = relationship("AuditLog", back_populates="request", cascade="all, delete-orphan")
    attachments = relationship("RequestAttachment", back_populates="request", cascade="all, delete-orphan", order_by="RequestAttachment.uploaded_at.desc()")


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SKIPPED = "skipped"


class Approval(Base):
    """Individual approval steps within a request"""
    __tablename__ = "approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('access_requests.id', ondelete='CASCADE'), nullable=False)
    
    step_number = Column(Integer, nullable=False)
    approver_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=False)
    approver_role = Column(String(100), nullable=True)  # e.g., 'Manager', 'Security Officer'
    
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    decision_date = Column(DateTime(timezone=True), nullable=True)
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    request = relationship("AccessRequest", back_populates="approvals")
    approver = relationship("User")


class RequestComment(Base):
    """Comments on access requests"""
    __tablename__ = "request_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('access_requests.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)  # Internal comments not visible to requester
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    request = relationship("AccessRequest", back_populates="comments")
    user = relationship("User")


class AuditLog(Base):
    """Audit trail for all actions on requests"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('access_requests.id', ondelete='CASCADE'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    action = Column(String(100), nullable=False)  # e.g., 'created', 'approved', 'rejected', 'commented'
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    request = relationship("AccessRequest", back_populates="audit_logs")
    user = relationship("User")


class RequestAttachment(Base):
    """File attachments for access requests (regulations, letters, external approvals)"""
    __tablename__ = "request_attachments"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('access_requests.id', ondelete='CASCADE'), nullable=False)

    # File info
    filename = Column(String(255), nullable=False)  # Original filename
    stored_filename = Column(String(255), nullable=False)  # UUID-based stored filename
    file_path = Column(String(500), nullable=False)  # Full path on disk
    file_size = Column(Integer, nullable=False)  # Size in bytes
    content_type = Column(String(100), nullable=False)  # MIME type

    # Metadata
    description = Column(String(500), nullable=True)  # Optional description
    attachment_type = Column(String(50), nullable=True)  # regulation, letter, approval, other

    # Upload info
    uploaded_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Download tracking
    download_count = Column(Integer, default=0, nullable=False)
    last_downloaded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    request = relationship("AccessRequest", back_populates="attachments")
    uploaded_by = relationship("User")
