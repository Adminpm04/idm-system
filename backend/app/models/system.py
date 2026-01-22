from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class SystemType(str, enum.Enum):
    APPLICATION = "application"
    DATABASE = "database"
    NETWORK = "network"
    CLOUD = "cloud"
    OTHER = "other"


class System(Base):
    """Corporate systems/applications that require access management"""
    __tablename__ = "systems"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)  # Short identifier
    description = Column(Text, nullable=True)
    system_type = Column(Enum(SystemType), default=SystemType.APPLICATION, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Owner/responsible person
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Technical details
    url = Column(String(500), nullable=True)
    documentation_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    subsystems = relationship("Subsystem", back_populates="system", cascade="all, delete-orphan")
# Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    access_roles = relationship("AccessRole", back_populates="system", cascade="all, delete-orphan")
    approval_chains = relationship("ApprovalChain", back_populates="system", cascade="all, delete-orphan")


class AccessLevel(str, enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    FULL = "full"


class AccessRole(Base):
    """Specific roles/access levels within a system"""
    __tablename__ = "access_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    access_level = Column(Enum(AccessLevel), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Risk level (for determining approval chain)
    risk_level = Column(Integer, default=1, nullable=False)  # 1=low, 2=medium, 3=high
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    system = relationship("System", back_populates="access_roles")
    
    __table_args__ = (
        # Unique constraint: one system can't have duplicate role codes
        # UniqueConstraint('system_id', 'code', name='uix_system_role_code'),
    )


class ApprovalChain(Base):
    """Defines approval workflow for accessing specific system/role"""
    __tablename__ = "system_approval_chain"

    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='CASCADE'), nullable=False)
    step_number = Column(Integer, nullable=False)
    approver_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    approver_role = Column(String(100), nullable=True)
    is_required = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    system = relationship("System", back_populates="approval_chains")
    approver = relationship("User", foreign_keys=[approver_id])
