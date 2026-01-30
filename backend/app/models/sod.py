"""Segregation of Duties (SoD) model for conflict management"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class SodSeverity(str, enum.Enum):
    """Severity level of SoD conflict"""
    WARNING = "warning"      # Show warning but allow with justification
    HARD_BLOCK = "hard_block"  # Completely block the combination


class SodConflict(Base):
    """Defines conflicting role pairs that violate Segregation of Duties policy.

    Example: "Payment Creator" role conflicts with "Payment Approver" role
    to prevent fraud in financial systems.
    """
    __tablename__ = "sod_conflicts"

    id = Column(Integer, primary_key=True, index=True)

    # The two conflicting roles (order doesn't matter, conflict is bidirectional)
    role_a_id = Column(Integer, ForeignKey('access_roles.id', ondelete='CASCADE'), nullable=False)
    role_b_id = Column(Integer, ForeignKey('access_roles.id', ondelete='CASCADE'), nullable=False)

    # Human-readable name for the conflict rule
    conflict_name = Column(String(255), nullable=False)  # e.g., "Payment Segregation"

    # Explanation of why these roles conflict
    description = Column(Text, nullable=True)  # e.g., "Prevents single person from creating and approving payments"

    # How to handle the conflict
    severity = Column(
        Enum(SodSeverity, values_callable=lambda obj: [e.value for e in obj]),
        default=SodSeverity.HARD_BLOCK,
        nullable=False
    )

    # Active flag for soft-delete
    is_active = Column(Boolean, default=True, nullable=False)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    role_a = relationship("AccessRole", foreign_keys=[role_a_id])
    role_b = relationship("AccessRole", foreign_keys=[role_b_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
