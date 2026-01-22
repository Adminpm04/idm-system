from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Date, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class RecertificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REVOKED = "revoked"
    EXPIRED = "expired"


class AccessRecertification(Base):
    """Periodic access recertification/review"""
    __tablename__ = "access_recertifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='SET NULL'), nullable=False)
    access_role_id = Column(Integer, ForeignKey('access_roles.id', ondelete='SET NULL'), nullable=False)
    
    # Original request that granted this access
    original_request_id = Column(Integer, ForeignKey('access_requests.id', ondelete='SET NULL'), nullable=True)
    
    # Reviewer (usually manager)
    reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=False)
    
    # Recertification details
    status = Column(Enum(RecertificationStatus), default=RecertificationStatus.PENDING, nullable=False)
    due_date = Column(Date, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    comment = Column(Text, nullable=True)
    
    # Flags
    is_overdue = Column(Boolean, default=False, nullable=False)
    reminder_sent = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    system = relationship("System")
    access_role = relationship("AccessRole")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    original_request = relationship("AccessRequest")
