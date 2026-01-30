"""Segregation of Duties (SoD) API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import User, AccessRequest, RequestStatus, SodConflict, SodSeverity
from app.models.system import AccessRole, System
from app.schemas.sod import (
    SodConflictCreate, SodConflictUpdate, SodConflictResponse,
    SodCheckRequest, SodCheckResponse, SodViolation,
    SodBulkCheckRequest, SodBulkCheckResponse
)

router = APIRouter()


def get_user_existing_roles(db: Session, user_id: int) -> List[int]:
    """Get list of role IDs that user currently has (approved/implemented requests)"""
    existing_requests = db.query(AccessRequest.access_role_id).filter(
        AccessRequest.target_user_id == user_id,
        AccessRequest.status.in_([RequestStatus.APPROVED, RequestStatus.IMPLEMENTED])
    ).distinct().all()
    return [r[0] for r in existing_requests]


def check_sod_conflicts(
    db: Session,
    requested_role_id: int,
    existing_role_ids: List[int]
) -> List[dict]:
    """Check if requested role conflicts with any existing roles.

    Returns list of conflict dictionaries with details.
    """
    if not existing_role_ids:
        return []

    # Find conflicts where requested role is either role_a or role_b
    # and one of user's existing roles is the other side
    conflicts = db.query(SodConflict).filter(
        SodConflict.is_active == True,
        or_(
            and_(
                SodConflict.role_a_id == requested_role_id,
                SodConflict.role_b_id.in_(existing_role_ids)
            ),
            and_(
                SodConflict.role_b_id == requested_role_id,
                SodConflict.role_a_id.in_(existing_role_ids)
            )
        )
    ).all()

    violations = []
    for conflict in conflicts:
        # Determine which role is the existing one
        if conflict.role_a_id == requested_role_id:
            existing_role_id = conflict.role_b_id
        else:
            existing_role_id = conflict.role_a_id

        # Get role details
        requested_role = db.query(AccessRole).filter(AccessRole.id == requested_role_id).first()
        existing_role = db.query(AccessRole).filter(AccessRole.id == existing_role_id).first()

        if requested_role and existing_role:
            requested_system = db.query(System).filter(System.id == requested_role.system_id).first()
            existing_system = db.query(System).filter(System.id == existing_role.system_id).first()

            violations.append({
                'conflict_id': conflict.id,
                'conflict_name': conflict.conflict_name,
                'description': conflict.description,
                'severity': conflict.severity.value if hasattr(conflict.severity, 'value') else conflict.severity,
                'requested_role_id': requested_role.id,
                'requested_role_name': requested_role.name,
                'requested_role_system': requested_system.name if requested_system else 'Unknown',
                'existing_role_id': existing_role.id,
                'existing_role_name': existing_role.name,
                'existing_role_system': existing_system.name if existing_system else 'Unknown',
            })

    return violations


# ============ SoD CHECK ENDPOINTS ============

@router.post("/check", response_model=SodCheckResponse)
async def check_sod(
    check_request: SodCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if assigning a role to a user would violate SoD policy.

    Returns list of conflicts and whether request can proceed.
    """
    # Get user's existing roles
    existing_role_ids = get_user_existing_roles(db, check_request.user_id)

    # Check for conflicts
    violations_data = check_sod_conflicts(db, check_request.role_id, existing_role_ids)

    violations = [SodViolation(**v) for v in violations_data]
    has_hard_blocks = any(v.severity == 'hard_block' for v in violations)

    return SodCheckResponse(
        has_conflicts=len(violations) > 0,
        has_hard_blocks=has_hard_blocks,
        violations=violations,
        can_proceed_with_justification=len(violations) > 0 and not has_hard_blocks
    )


@router.post("/check-bulk", response_model=SodBulkCheckResponse)
async def check_sod_bulk(
    check_request: SodBulkCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check SoD for multiple role assignments at once.

    Also checks for conflicts between the requested roles themselves.
    """
    # Get user's existing roles
    existing_role_ids = get_user_existing_roles(db, check_request.user_id)

    all_violations = []
    inter_request_violations = []

    # Check each requested role against existing roles
    for role_id in check_request.role_ids:
        violations_data = check_sod_conflicts(db, role_id, existing_role_ids)
        all_violations.extend([SodViolation(**v) for v in violations_data])

    # Check conflicts between requested roles themselves
    for i, role_a in enumerate(check_request.role_ids):
        for role_b in check_request.role_ids[i+1:]:
            violations_data = check_sod_conflicts(db, role_a, [role_b])
            inter_request_violations.extend([SodViolation(**v) for v in violations_data])

    combined_violations = all_violations + inter_request_violations
    has_hard_blocks = any(v.severity == 'hard_block' for v in combined_violations)

    return SodBulkCheckResponse(
        has_conflicts=len(combined_violations) > 0,
        has_hard_blocks=has_hard_blocks,
        violations=all_violations,
        inter_request_violations=inter_request_violations,
        can_proceed_with_justification=len(combined_violations) > 0 and not has_hard_blocks
    )


@router.get("/user/{user_id}/violations", response_model=List[SodViolation])
async def get_user_violations(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current SoD violations for a user (existing conflicting roles).

    Useful for auditing and compliance reporting.
    """
    existing_role_ids = get_user_existing_roles(db, user_id)

    violations = []
    # Check every pair of user's roles for conflicts
    for i, role_a in enumerate(existing_role_ids):
        for role_b in existing_role_ids[i+1:]:
            violations_data = check_sod_conflicts(db, role_a, [role_b])
            violations.extend([SodViolation(**v) for v in violations_data])

    return violations


# ============ SOD CONFLICT MANAGEMENT (ADMIN) ============

@router.get("/conflicts", response_model=List[SodConflictResponse])
async def list_sod_conflicts(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all SoD conflict rules. Admin only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(SodConflict)

    if is_active is not None:
        query = query.filter(SodConflict.is_active == is_active)

    conflicts = query.order_by(SodConflict.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for conflict in conflicts:
        # Get role and system names
        role_a = db.query(AccessRole).filter(AccessRole.id == conflict.role_a_id).first()
        role_b = db.query(AccessRole).filter(AccessRole.id == conflict.role_b_id).first()

        role_a_system = None
        role_b_system = None
        if role_a:
            role_a_system = db.query(System).filter(System.id == role_a.system_id).first()
        if role_b:
            role_b_system = db.query(System).filter(System.id == role_b.system_id).first()

        result.append(SodConflictResponse(
            id=conflict.id,
            role_a_id=conflict.role_a_id,
            role_b_id=conflict.role_b_id,
            conflict_name=conflict.conflict_name,
            description=conflict.description,
            severity=conflict.severity.value if hasattr(conflict.severity, 'value') else conflict.severity,
            is_active=conflict.is_active,
            created_at=conflict.created_at,
            updated_at=conflict.updated_at,
            created_by_id=conflict.created_by_id,
            role_a_name=role_a.name if role_a else None,
            role_a_system_name=role_a_system.name if role_a_system else None,
            role_b_name=role_b.name if role_b else None,
            role_b_system_name=role_b_system.name if role_b_system else None,
            created_by_name=conflict.created_by.full_name if conflict.created_by else None
        ))

    return result


@router.post("/conflicts", response_model=SodConflictResponse, status_code=status.HTTP_201_CREATED)
async def create_sod_conflict(
    conflict_in: SodConflictCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new SoD conflict rule. Admin only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Validate that both roles exist
    role_a = db.query(AccessRole).filter(AccessRole.id == conflict_in.role_a_id).first()
    role_b = db.query(AccessRole).filter(AccessRole.id == conflict_in.role_b_id).first()

    if not role_a:
        raise HTTPException(status_code=404, detail=f"Role A (id={conflict_in.role_a_id}) not found")
    if not role_b:
        raise HTTPException(status_code=404, detail=f"Role B (id={conflict_in.role_b_id}) not found")

    # Check for duplicate (same pair in any order)
    existing = db.query(SodConflict).filter(
        or_(
            and_(
                SodConflict.role_a_id == conflict_in.role_a_id,
                SodConflict.role_b_id == conflict_in.role_b_id
            ),
            and_(
                SodConflict.role_a_id == conflict_in.role_b_id,
                SodConflict.role_b_id == conflict_in.role_a_id
            )
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Conflict rule already exists between these roles (id={existing.id})"
        )

    # Create conflict
    conflict = SodConflict(
        role_a_id=conflict_in.role_a_id,
        role_b_id=conflict_in.role_b_id,
        conflict_name=conflict_in.conflict_name,
        description=conflict_in.description,
        severity=conflict_in.severity,
        created_by_id=current_user.id
    )
    db.add(conflict)
    db.commit()
    db.refresh(conflict)

    # Get enriched response
    role_a_system = db.query(System).filter(System.id == role_a.system_id).first()
    role_b_system = db.query(System).filter(System.id == role_b.system_id).first()

    return SodConflictResponse(
        id=conflict.id,
        role_a_id=conflict.role_a_id,
        role_b_id=conflict.role_b_id,
        conflict_name=conflict.conflict_name,
        description=conflict.description,
        severity=conflict.severity.value if hasattr(conflict.severity, 'value') else conflict.severity,
        is_active=conflict.is_active,
        created_at=conflict.created_at,
        updated_at=conflict.updated_at,
        created_by_id=conflict.created_by_id,
        role_a_name=role_a.name,
        role_a_system_name=role_a_system.name if role_a_system else None,
        role_b_name=role_b.name,
        role_b_system_name=role_b_system.name if role_b_system else None,
        created_by_name=current_user.full_name
    )


@router.put("/conflicts/{conflict_id}", response_model=SodConflictResponse)
async def update_sod_conflict(
    conflict_id: int,
    conflict_in: SodConflictUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing SoD conflict rule. Admin only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    conflict = db.query(SodConflict).filter(SodConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict rule not found")

    # Update fields
    update_data = conflict_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(conflict, field, value)

    db.commit()
    db.refresh(conflict)

    # Get enriched response
    role_a = db.query(AccessRole).filter(AccessRole.id == conflict.role_a_id).first()
    role_b = db.query(AccessRole).filter(AccessRole.id == conflict.role_b_id).first()
    role_a_system = db.query(System).filter(System.id == role_a.system_id).first() if role_a else None
    role_b_system = db.query(System).filter(System.id == role_b.system_id).first() if role_b else None

    return SodConflictResponse(
        id=conflict.id,
        role_a_id=conflict.role_a_id,
        role_b_id=conflict.role_b_id,
        conflict_name=conflict.conflict_name,
        description=conflict.description,
        severity=conflict.severity.value if hasattr(conflict.severity, 'value') else conflict.severity,
        is_active=conflict.is_active,
        created_at=conflict.created_at,
        updated_at=conflict.updated_at,
        created_by_id=conflict.created_by_id,
        role_a_name=role_a.name if role_a else None,
        role_a_system_name=role_a_system.name if role_a_system else None,
        role_b_name=role_b.name if role_b else None,
        role_b_system_name=role_b_system.name if role_b_system else None,
        created_by_name=conflict.created_by.full_name if conflict.created_by else None
    )


@router.delete("/conflicts/{conflict_id}")
async def delete_sod_conflict(
    conflict_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an SoD conflict rule. Admin only."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    conflict = db.query(SodConflict).filter(SodConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict rule not found")

    db.delete(conflict)
    db.commit()

    return {"message": "Conflict rule deleted successfully"}
