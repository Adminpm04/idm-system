"""Schemas for Segregation of Duties (SoD) management"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.sod import SodSeverity


# ============ SoD Conflict CRUD ============

class SodConflictCreate(BaseModel):
    """Create a new SoD conflict rule"""
    role_a_id: int
    role_b_id: int
    conflict_name: str
    description: Optional[str] = None
    severity: SodSeverity = SodSeverity.HARD_BLOCK


class SodConflictUpdate(BaseModel):
    """Update an existing SoD conflict rule"""
    conflict_name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[SodSeverity] = None
    is_active: Optional[bool] = None


class SodConflictResponse(BaseModel):
    """Response for a single SoD conflict rule"""
    id: int
    role_a_id: int
    role_b_id: int
    conflict_name: str
    description: Optional[str] = None
    severity: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None

    # Enriched fields
    role_a_name: Optional[str] = None
    role_a_system_name: Optional[str] = None
    role_b_name: Optional[str] = None
    role_b_system_name: Optional[str] = None
    created_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ============ SoD Check Results ============

class SodViolation(BaseModel):
    """A single SoD violation detected"""
    conflict_id: int
    conflict_name: str
    description: Optional[str] = None
    severity: str  # "warning" or "hard_block"

    # The conflicting roles
    requested_role_id: int
    requested_role_name: str
    requested_role_system: str

    existing_role_id: int
    existing_role_name: str
    existing_role_system: str


class SodCheckRequest(BaseModel):
    """Request to check SoD conflicts"""
    user_id: int
    role_id: int


class SodCheckResponse(BaseModel):
    """Response from SoD conflict check"""
    has_conflicts: bool
    has_hard_blocks: bool
    violations: List[SodViolation] = []
    can_proceed_with_justification: bool  # True if only warnings, no hard blocks


class SodBulkCheckRequest(BaseModel):
    """Check SoD for multiple role assignments in one request"""
    user_id: int
    role_ids: List[int]


class SodBulkCheckResponse(BaseModel):
    """Response from bulk SoD check"""
    has_conflicts: bool
    has_hard_blocks: bool
    violations: List[SodViolation] = []
    # Also check conflicts between requested roles themselves
    inter_request_violations: List[SodViolation] = []
    can_proceed_with_justification: bool
