from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.db.session import get_db
from app.schemas.request import (
    AccessRequestCreate, AccessRequestResponse, AccessRequestDetailResponse,
    AccessRequestSubmit, ApprovalDecision, RequestCommentCreate,
    RequestCommentResponse, RequestStatistics, MyRequestsSummary
)
from app.models import (
    AccessRequest, Approval, RequestComment, AuditLog, User,
    RequestStatus, ApprovalStatus, RequestType
)
from app.api.deps import get_current_user
from app.core.constants import ApproverRoles

router = APIRouter()


def generate_request_number(db: Session) -> str:
    """Generate unique request number like REQ-2025-00001"""
    from datetime import date
    from sqlalchemy import func

    year = date.today().year
    prefix = f"REQ-{year}-"

    # Get max request number
    result = db.query(
        func.max(AccessRequest.request_number)
    ).filter(
        AccessRequest.request_number.like(f"{prefix}%")
    ).scalar()

    if result:
        # Extract number from REQ-2025-00001 format
        try:
            last_num = int(result.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:05d}"


def create_audit_log(db: Session, request_id: int, user_id: int, action: str, details: str = None, ip_address: str = None):
    """Create audit log entry"""
    log = AuditLog(
        request_id=request_id,
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.flush()  # Ensure log is persisted within current transaction


@router.get("/my-requests", response_model=List[AccessRequestResponse])
async def get_my_requests(
    skip: int = 0,
    limit: int = 20,
    status_filter: RequestStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's requests"""
    query = db.query(AccessRequest).filter(
        AccessRequest.requester_id == current_user.id
    )
    
    if status_filter:
        query = query.filter(AccessRequest.status == status_filter)
    
    requests = query.order_by(AccessRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with names
    result = []
    for req in requests:
        req_dict = AccessRequestResponse.model_validate(req).model_dump()
        req_dict['requester_name'] = req.requester.full_name if req.requester else None
        req_dict['target_user_name'] = req.target_user.full_name if req.target_user else None
        req_dict['system_name'] = req.system.name if req.system else None
        req_dict['subsystem_name'] = req.subsystem.name if req.subsystem else None
        req_dict['access_role_name'] = req.access_role.name if req.access_role else None
        result.append(AccessRequestResponse(**req_dict))

    return result


@router.get("/my-approvals", response_model=List[AccessRequestResponse])
async def get_my_pending_approvals(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get requests pending my approval"""
    # Find approvals assigned to current user with pending status
    pending_approvals = db.query(Approval).filter(
        Approval.approver_id == current_user.id,
        Approval.status == ApprovalStatus.PENDING
    ).all()
    
    request_ids = [approval.request_id for approval in pending_approvals]
    
    if not request_ids:
        return []
    
    requests = db.query(AccessRequest).filter(
        AccessRequest.id.in_(request_ids),
        AccessRequest.status == RequestStatus.IN_REVIEW
    ).order_by(AccessRequest.created_at).offset(skip).limit(limit).all()
    
    # Enrich with names
    result = []
    for req in requests:
        req_dict = AccessRequestResponse.model_validate(req).model_dump()
        req_dict['requester_name'] = req.requester.full_name if req.requester else None
        req_dict['target_user_name'] = req.target_user.full_name if req.target_user else None
        req_dict['system_name'] = req.system.name if req.system else None
        req_dict['subsystem_name'] = req.subsystem.name if req.subsystem else None
        req_dict['access_role_name'] = req.access_role.name if req.access_role else None
        result.append(AccessRequestResponse(**req_dict))

    return result


@router.get("/my-decisions", response_model=List[AccessRequestResponse])
async def get_my_decisions(
    skip: int = 0,
    limit: int = 50,
    decision_filter: ApprovalStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get requests where current user has made a decision (approved/rejected) - approval history"""
    # Build query for approvals where user made a decision
    query = db.query(Approval).filter(
        Approval.approver_id == current_user.id,
        Approval.status.in_([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED])
    )

    # Apply decision filter if provided
    if decision_filter and decision_filter in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
        query = query.filter(Approval.status == decision_filter)

    # Order by decision date descending
    completed_approvals = query.order_by(Approval.decision_date.desc()).all()

    request_ids = [approval.request_id for approval in completed_approvals]

    if not request_ids:
        return []

    # Preserve order from approvals (by decision_date)
    requests = db.query(AccessRequest).filter(
        AccessRequest.id.in_(request_ids)
    ).all()

    # Create a map for quick lookup
    request_map = {req.id: req for req in requests}

    # Build result in order of decision_date
    result = []
    seen_ids = set()
    for approval in completed_approvals:
        if approval.request_id in seen_ids:
            continue
        seen_ids.add(approval.request_id)

        req = request_map.get(approval.request_id)
        if not req:
            continue

        req_dict = AccessRequestResponse.model_validate(req).model_dump()
        req_dict['requester_name'] = req.requester.full_name if req.requester else None
        req_dict['target_user_name'] = req.target_user.full_name if req.target_user else None
        req_dict['system_name'] = req.system.name if req.system else None
        req_dict['subsystem_name'] = req.subsystem.name if req.subsystem else None
        req_dict['access_role_name'] = req.access_role.name if req.access_role else None
        # Add user's decision info
        req_dict['my_decision'] = approval.status.value
        req_dict['my_decision_date'] = approval.decision_date.isoformat() if approval.decision_date else None
        req_dict['my_decision_comment'] = approval.comment
        result.append(AccessRequestResponse(**req_dict))

        if len(result) >= limit:
            break

    return result[skip:skip+limit]


@router.get("/statistics", response_model=RequestStatistics)
async def get_request_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get request statistics"""
    total = db.query(AccessRequest).count()
    pending = db.query(AccessRequest).filter(AccessRequest.status == RequestStatus.IN_REVIEW).count()
    approved = db.query(AccessRequest).filter(AccessRequest.status == RequestStatus.APPROVED).count()
    rejected = db.query(AccessRequest).filter(AccessRequest.status == RequestStatus.REJECTED).count()
    implemented = db.query(AccessRequest).filter(AccessRequest.status == RequestStatus.IMPLEMENTED).count()
    
    # My pending approvals
    my_approvals = db.query(Approval).filter(
        Approval.approver_id == current_user.id,
        Approval.status == ApprovalStatus.PENDING
    ).count()
    
    return {
        "total_requests": total,
        "pending_approval": pending,
        "approved": approved,
        "rejected": rejected,
        "implemented": implemented,
        "my_pending_approvals": my_approvals
    }


@router.post("", response_model=AccessRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    request_in: AccessRequestCreate,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new access request"""
    # Generate request number
    request_number = generate_request_number(db)
    
    # Create request
    request = AccessRequest(
        request_number=request_number,
        requester_id=current_user.id,
        **request_in.model_dump(),
        status=RequestStatus.DRAFT,
        current_step=1
    )
    db.add(request)
    db.flush()
    
    # Create audit log
    create_audit_log(db, request.id, current_user.id, "created", "Request created", http_request.client.host if http_request.client else None)
    
    # Load approval chain using ORM
    from app.models.system import ApprovalChain

    approval_chains = db.query(ApprovalChain).filter(
        ApprovalChain.system_id == request_in.system_id
    ).order_by(ApprovalChain.step_number).all()

    # Create approvals from chain
    if approval_chains:
        for chain in approval_chains:
            approval = Approval(
                request_id=request.id,
                step_number=chain.step_number,
                approver_id=chain.approver_id,
                approver_role=chain.approver_role,
                status=ApprovalStatus.PENDING
            )
            db.add(approval)
    else:
        # Default fallback if no chain configured
        # Step 1: Manager
        if request.target_user.manager_id:
            approval = Approval(
                request_id=request.id,
                step_number=1,
                approver_id=request.target_user.manager_id,
                approver_role=ApproverRoles.MANAGER,
                status=ApprovalStatus.PENDING
            )
            db.add(approval)

        # Step 2: Security/Admin (find superuser)
        security_user = db.query(User).filter(User.is_superuser == True).first()
        if security_user:
            approval = Approval(
                request_id=request.id,
                step_number=2,
                approver_id=security_user.id,
                approver_role=ApproverRoles.SECURITY_OFFICER,
                status=ApprovalStatus.PENDING
            )
            db.add(approval)
    
    db.commit()
    db.refresh(request)
    
    return request


@router.get("/{request_id}", response_model=AccessRequestDetailResponse)
async def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get request details"""
    request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Check permission (requester, target user, approver, or admin)
    is_involved = (
        request.requester_id == current_user.id or
        request.target_user_id == current_user.id or
        current_user.is_superuser or
        any(a.approver_id == current_user.id for a in request.approvals)
    )
    
    if not is_involved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request"
        )
    
    # Enrich response with names
    result = AccessRequestDetailResponse.model_validate(request).model_dump()
    result['requester_name'] = request.requester.full_name if request.requester else None
    result['target_user_name'] = request.target_user.full_name if request.target_user else None
    result['system_name'] = request.system.name if request.system else None
    result['subsystem_name'] = request.subsystem.name if request.subsystem else None
    result['access_role_name'] = request.access_role.name if request.access_role else None

    # Enrich approvals
    approvals_enriched = []
    for approval in request.approvals:
        approval_dict = approval.__dict__.copy()
        approval_dict['approver_name'] = approval.approver.full_name if approval.approver else None
        approval_dict['approver_email'] = approval.approver.email if approval.approver else None
        approvals_enriched.append(approval_dict)
    
    result['approvals'] = approvals_enriched
    
    # Enrich comments
    comments_enriched = []
    for comment in request.comments:
        comment_dict = comment.__dict__.copy()
        comment_dict['user_name'] = comment.user.full_name if comment.user else None
        comments_enriched.append(comment_dict)
    
    result['comments'] = comments_enriched
    
    return result


@router.post("/{request_id}/submit")
async def submit_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit request for approval"""
    request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    if request.requester_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if request.status != RequestStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft requests can be submitted")
    
    # Update status
    request.status = RequestStatus.IN_REVIEW
    request.submitted_at = datetime.now(timezone.utc)
    
    # Create audit log
    create_audit_log(db, request.id, current_user.id, "submitted", "Request submitted for approval")
    
    db.commit()
    
    return {"message": "Request submitted successfully"}


@router.post("/{request_id}/approve")
async def approve_request(
    request_id: int,
    decision: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve request at current step"""
    request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    # Find current user's pending approval
    approval = db.query(Approval).filter(
        Approval.request_id == request_id,
        Approval.approver_id == current_user.id,
        Approval.status == ApprovalStatus.PENDING
    ).first()
    
    if not approval:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No pending approval found")
    
    # Update approval
    if decision.decision == ApprovalStatus.APPROVED:
        approval.status = ApprovalStatus.APPROVED
        approval.decision_date = datetime.now(timezone.utc)
        approval.comment = decision.comment
        
        # Check if there are more approvals needed
        next_approval = db.query(Approval).filter(
            Approval.request_id == request_id,
            Approval.step_number > approval.step_number,
            Approval.status == ApprovalStatus.PENDING
        ).first()
        
        if next_approval:
            # Move to next step
            request.current_step = next_approval.step_number
            create_audit_log(db, request.id, current_user.id, "approved", 
                           f"Approved at step {approval.step_number}")
        else:
            # All approvals done
            request.status = RequestStatus.APPROVED
            request.completed_at = datetime.now(timezone.utc)
            create_audit_log(db, request.id, current_user.id, "fully_approved", 
                           "Request fully approved")
    
    elif decision.decision == ApprovalStatus.REJECTED:
        approval.status = ApprovalStatus.REJECTED
        approval.decision_date = datetime.now(timezone.utc)
        approval.comment = decision.comment
        
        # Reject entire request
        request.status = RequestStatus.REJECTED
        request.completed_at = datetime.now(timezone.utc)
        
        create_audit_log(db, request.id, current_user.id, "rejected", 
                       f"Rejected at step {approval.step_number}: {decision.comment}")
    
    db.commit()
    
    return {"message": "Decision recorded successfully"}


@router.post("/{request_id}/comments", response_model=RequestCommentResponse)
async def add_comment(
    request_id: int,
    comment_in: RequestCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add comment to request"""
    request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    # Create comment
    comment = RequestComment(
        request_id=request_id,
        user_id=current_user.id,
        **comment_in.model_dump()
    )
    db.add(comment)

    # Create audit log
    create_audit_log(db, request.id, current_user.id, "commented", "Added comment")

    db.commit()
    db.refresh(comment)

    return comment


@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get search suggestions for autocomplete"""
    from app.models import System, Subsystem

    if len(q) < 2:
        return {"suggestions": []}

    suggestions = []
    q_lower = q.lower()

    # Search in systems
    systems = db.query(System).filter(
        System.name.ilike(f"%{q}%"),
        System.is_active == True
    ).limit(3).all()
    for system in systems:
        suggestions.append({
            "type": "system",
            "id": system.id,
            "label": f"System: {system.name}",
            "value": system.name
        })

    # Search in subsystems
    subsystems = db.query(Subsystem).filter(
        Subsystem.name.ilike(f"%{q}%")
    ).limit(3).all()
    for subsystem in subsystems:
        suggestions.append({
            "type": "subsystem",
            "id": subsystem.id,
            "label": f"Subsystem: {subsystem.name}",
            "value": subsystem.name
        })

    # Search in users
    users = db.query(User).filter(
        User.full_name.ilike(f"%{q}%"),
        User.is_active == True
    ).limit(3).all()
    for user in users:
        suggestions.append({
            "type": "user",
            "id": user.id,
            "label": f"User: {user.full_name}",
            "value": user.full_name
        })

    # Search in request numbers
    requests = db.query(AccessRequest).filter(
        AccessRequest.request_number.ilike(f"%{q}%")
    ).limit(3).all()
    for req in requests:
        suggestions.append({
            "type": "request",
            "id": req.id,
            "label": f"Request: {req.request_number}",
            "value": req.request_number
        })

    # Status suggestions
    statuses = [
        ("draft", "Draft"),
        ("in_review", "In Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("implemented", "Implemented")
    ]
    for status_value, status_label in statuses:
        if q_lower in status_value or q_lower in status_label.lower():
            suggestions.append({
                "type": "status",
                "id": None,
                "label": f"Status: {status_label}",
                "value": status_value
            })

    return {"suggestions": suggestions[:10]}


@router.get("/search/global")
async def global_search(
    q: str = None,
    system_id: int = None,
    subsystem_id: int = None,
    user_id: int = None,
    role_id: int = None,
    status_filter: str = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Global search across requests"""
    from app.models import System, Subsystem

    query = db.query(AccessRequest)

    # Text search in multiple fields
    if q:
        query = query.join(AccessRequest.system).outerjoin(AccessRequest.subsystem).outerjoin(AccessRequest.target_user).filter(
            (AccessRequest.request_number.ilike(f"%{q}%")) |
            (AccessRequest.purpose.ilike(f"%{q}%")) |
            (System.name.ilike(f"%{q}%")) |
            (Subsystem.name.ilike(f"%{q}%")) |
            (User.full_name.ilike(f"%{q}%"))
        )

    # Filter by system
    if system_id:
        query = query.filter(AccessRequest.system_id == system_id)

    # Filter by subsystem
    if subsystem_id:
        query = query.filter(AccessRequest.subsystem_id == subsystem_id)

    # Filter by user (target user)
    if user_id:
        query = query.filter(
            (AccessRequest.target_user_id == user_id) |
            (AccessRequest.requester_id == user_id)
        )

    # Filter by role
    if role_id:
        query = query.filter(AccessRequest.access_role_id == role_id)

    # Filter by status
    if status_filter:
        try:
            status_enum = RequestStatus(status_filter.upper())
            query = query.filter(AccessRequest.status == status_enum)
        except ValueError:
            pass

    # Get total count
    total = query.count()

    # Get results
    requests = query.order_by(AccessRequest.created_at.desc()).limit(limit).all()

    # Format results
    results = []
    for req in requests:
        results.append({
            "id": req.id,
            "request_number": req.request_number,
            "status": req.status.value.lower() if req.status else None,
            "system_name": req.system.name if req.system else None,
            "subsystem_name": req.subsystem.name if req.subsystem else None,
            "target_user_name": req.target_user.full_name if req.target_user else None,
            "requester_name": req.requester.full_name if req.requester else None,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "purpose": req.purpose[:100] if req.purpose else None
        })

    return {
        "requests": results,
        "total": total
    }
