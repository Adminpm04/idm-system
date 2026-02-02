"""
Service for automatic access revocation when valid_until date expires.
"""
from datetime import date, datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.models.request import AccessRequest, RequestStatus
from app.models import AuditLog


def get_expired_accesses(db: Session) -> List[AccessRequest]:
    """Get all implemented accesses that have expired (valid_until < today)."""
    today = date.today()

    expired = db.query(AccessRequest).options(
        joinedload(AccessRequest.target_user),
        joinedload(AccessRequest.system),
        joinedload(AccessRequest.access_role)
    ).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until.isnot(None),
            AccessRequest.valid_until < today
        )
    ).all()

    return expired


def get_expiring_soon(db: Session, days: int = 7) -> List[AccessRequest]:
    """Get accesses that will expire within the specified number of days."""
    from datetime import timedelta

    today = date.today()
    future_date = today + timedelta(days=days)

    expiring = db.query(AccessRequest).options(
        joinedload(AccessRequest.target_user),
        joinedload(AccessRequest.system),
        joinedload(AccessRequest.access_role)
    ).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until.isnot(None),
            AccessRequest.valid_until >= today,
            AccessRequest.valid_until <= future_date
        )
    ).order_by(AccessRequest.valid_until).all()

    return expiring


def revoke_expired_access(db: Session, request: AccessRequest, auto: bool = True) -> bool:
    """Revoke a single expired access request."""
    try:
        old_status = request.status
        request.status = RequestStatus.EXPIRED
        request.updated_at = datetime.now(timezone.utc)

        # Create audit log entry
        audit_log = AuditLog(
            request_id=request.id,
            user_id=None,  # System action
            action="auto_expired" if auto else "manual_expired",
            details=f"Access automatically revoked due to expiration. Valid until: {request.valid_until}. Previous status: {old_status.value}",
            ip_address="system"
        )
        db.add(audit_log)
        db.commit()

        return True
    except Exception as e:
        db.rollback()
        print(f"Error revoking access for request {request.id}: {e}")
        return False


def process_expired_accesses(db: Session) -> Dict[str, Any]:
    """Process all expired accesses and revoke them."""
    expired_requests = get_expired_accesses(db)

    results = {
        "total_found": len(expired_requests),
        "successfully_revoked": 0,
        "failed": 0,
        "revoked_ids": [],
        "failed_ids": []
    }

    for request in expired_requests:
        if revoke_expired_access(db, request, auto=True):
            results["successfully_revoked"] += 1
            results["revoked_ids"].append(request.id)
        else:
            results["failed"] += 1
            results["failed_ids"].append(request.id)

    return results


def get_revocation_stats(db: Session) -> Dict[str, Any]:
    """Get statistics about temporary accesses and expirations."""
    from sqlalchemy import func

    today = date.today()

    # Total temporary accesses that are implemented
    total_temp = db.query(func.count(AccessRequest.id)).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until.isnot(None)
        )
    ).scalar() or 0

    # Already expired (status = EXPIRED)
    already_expired = db.query(func.count(AccessRequest.id)).filter(
        AccessRequest.status == RequestStatus.EXPIRED
    ).scalar() or 0

    # Expiring today
    expiring_today = db.query(func.count(AccessRequest.id)).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until == today
        )
    ).scalar() or 0

    # Expiring this week
    from datetime import timedelta
    week_end = today + timedelta(days=7)
    expiring_week = db.query(func.count(AccessRequest.id)).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until.isnot(None),
            AccessRequest.valid_until >= today,
            AccessRequest.valid_until <= week_end
        )
    ).scalar() or 0

    # Expiring this month
    month_end = today + timedelta(days=30)
    expiring_month = db.query(func.count(AccessRequest.id)).filter(
        and_(
            AccessRequest.status == RequestStatus.IMPLEMENTED,
            AccessRequest.is_temporary == True,
            AccessRequest.valid_until.isnot(None),
            AccessRequest.valid_until >= today,
            AccessRequest.valid_until <= month_end
        )
    ).scalar() or 0

    return {
        "active_temporary_accesses": total_temp,
        "already_expired": already_expired,
        "expiring_today": expiring_today,
        "expiring_this_week": expiring_week,
        "expiring_this_month": expiring_month
    }
