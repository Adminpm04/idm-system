from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
import shutil
from app.db.session import get_db
from app.schemas.request import (
    AccessRequestCreate, AccessRequestResponse, AccessRequestDetailResponse,
    AccessRequestSubmit, ApprovalDecision, RequestCommentCreate,
    RequestCommentResponse, RequestStatistics, MyRequestsSummary,
    BulkRequestCreate, BulkRequestResponse,
    AttachmentResponse, AttachmentUploadResponse
)
from app.models import (
    AccessRequest, Approval, RequestComment, AuditLog, User, RequestAttachment,
    RequestStatus, ApprovalStatus, RequestType
)
from app.api.deps import get_current_user
from app.core.constants import ApproverRoles

# Configuration for file uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "attachments")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".txt", ".zip", ".rar"}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

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


@router.post("/bulk", response_model=BulkRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_requests(
    request_in: BulkRequestCreate,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create multiple access requests for different users at once.

    Available to all users (not just admins).
    Maximum 20 users per bulk request.
    """
    from app.models.system import ApprovalChain

    created_ids = []
    skipped = []

    for user_id in request_in.user_ids:
        try:
            # Verify target user exists
            target_user = db.query(User).filter(User.id == user_id).first()
            if not target_user:
                skipped.append({"user_id": user_id, "reason": "User not found"})
                continue

            if not target_user.is_active:
                skipped.append({"user_id": user_id, "reason": "User is inactive"})
                continue

            # Generate request number
            request_number = generate_request_number(db)

            # Create request
            access_request = AccessRequest(
                request_number=request_number,
                requester_id=current_user.id,
                target_user_id=user_id,
                system_id=request_in.system_id,
                subsystem_id=request_in.subsystem_id,
                access_role_id=request_in.access_role_id,
                request_type=request_in.request_type,
                purpose=request_in.purpose,
                is_temporary=request_in.is_temporary,
                valid_from=request_in.valid_from,
                valid_until=request_in.valid_until,
                status=RequestStatus.DRAFT,
                current_step=1
            )
            db.add(access_request)
            db.flush()

            # Create audit log
            create_audit_log(
                db,
                access_request.id,
                current_user.id,
                "created",
                f"Bulk request created for user {target_user.full_name}",
                http_request.client.host if http_request.client else None
            )

            # Load approval chain
            approval_chains = db.query(ApprovalChain).filter(
                ApprovalChain.system_id == request_in.system_id
            ).order_by(ApprovalChain.step_number).all()

            # Create approvals from chain
            if approval_chains:
                for chain in approval_chains:
                    approval = Approval(
                        request_id=access_request.id,
                        step_number=chain.step_number,
                        approver_id=chain.approver_id,
                        approver_role=chain.approver_role,
                        status=ApprovalStatus.PENDING
                    )
                    db.add(approval)
            else:
                # Default fallback if no chain configured
                if target_user.manager_id:
                    approval = Approval(
                        request_id=access_request.id,
                        step_number=1,
                        approver_id=target_user.manager_id,
                        approver_role=ApproverRoles.MANAGER,
                        status=ApprovalStatus.PENDING
                    )
                    db.add(approval)

                security_user = db.query(User).filter(User.is_superuser == True).first()
                if security_user:
                    approval = Approval(
                        request_id=access_request.id,
                        step_number=2,
                        approver_id=security_user.id,
                        approver_role=ApproverRoles.SECURITY_OFFICER,
                        status=ApprovalStatus.PENDING
                    )
                    db.add(approval)

            created_ids.append(access_request.id)

        except Exception as e:
            skipped.append({"user_id": user_id, "reason": str(e)})
            continue

    db.commit()

    return BulkRequestResponse(
        total=len(request_in.user_ids),
        created=len(created_ids),
        skipped=skipped,
        request_ids=created_ids
    )


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

    # Enrich attachments
    attachments_enriched = []
    for attachment in request.attachments:
        attachments_enriched.append({
            'id': attachment.id,
            'filename': attachment.filename,
            'file_size': attachment.file_size,
            'content_type': attachment.content_type,
            'description': attachment.description,
            'attachment_type': attachment.attachment_type,
            'uploaded_by_id': attachment.uploaded_by_id,
            'uploaded_by_name': attachment.uploaded_by.full_name if attachment.uploaded_by else None,
            'uploaded_at': attachment.uploaded_at
        })

    result['attachments'] = attachments_enriched

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


# ============== ATTACHMENT ENDPOINTS ==============

@router.post("/{request_id}/attachments", response_model=AttachmentUploadResponse)
async def upload_attachment(
    request_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    attachment_type: Optional[str] = Form(None),
    http_request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file attachment to a request.

    Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, TXT, ZIP, RAR
    Max size: 10 MB
    """
    # Check request exists
    access_request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not access_request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permission (requester, target user, approver, or admin)
    is_involved = (
        access_request.requester_id == current_user.id or
        access_request.target_user_id == current_user.id or
        current_user.is_superuser or
        any(a.approver_id == current_user.id for a in access_request.approvals)
    )
    if not is_involved:
        raise HTTPException(status_code=403, detail="Not authorized to upload attachments")

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file and check size
    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)} MB"
        )

    # Generate unique filename
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create attachment record
    attachment = RequestAttachment(
        request_id=request_id,
        filename=file.filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        description=description,
        attachment_type=attachment_type,
        uploaded_by_id=current_user.id
    )
    db.add(attachment)

    # Create audit log
    create_audit_log(
        db, request_id, current_user.id,
        "attachment_uploaded",
        f"File uploaded: {file.filename} ({file_size} bytes)",
        http_request.client.host if http_request and http_request.client else None
    )

    db.commit()
    db.refresh(attachment)

    return AttachmentUploadResponse(
        id=attachment.id,
        filename=attachment.filename,
        file_size=attachment.file_size,
        content_type=attachment.content_type,
        message="File uploaded successfully"
    )


@router.get("/{request_id}/attachments", response_model=List[AttachmentResponse])
async def list_attachments(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all attachments for a request."""
    # Check request exists
    access_request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not access_request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check permission
    is_involved = (
        access_request.requester_id == current_user.id or
        access_request.target_user_id == current_user.id or
        current_user.is_superuser or
        any(a.approver_id == current_user.id for a in access_request.approvals)
    )
    if not is_involved:
        raise HTTPException(status_code=403, detail="Not authorized to view attachments")

    attachments = db.query(RequestAttachment).filter(
        RequestAttachment.request_id == request_id
    ).order_by(RequestAttachment.uploaded_at.desc()).all()

    result = []
    for att in attachments:
        result.append(AttachmentResponse(
            id=att.id,
            request_id=att.request_id,
            filename=att.filename,
            file_size=att.file_size,
            content_type=att.content_type,
            description=att.description,
            attachment_type=att.attachment_type,
            uploaded_by_id=att.uploaded_by_id,
            uploaded_by_name=att.uploaded_by.full_name if att.uploaded_by else None,
            uploaded_at=att.uploaded_at,
            download_count=att.download_count,
            last_downloaded_at=att.last_downloaded_at
        ))

    return result


@router.get("/{request_id}/attachments/{attachment_id}/download")
async def download_attachment(
    request_id: int,
    attachment_id: int,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an attachment file."""
    # Check attachment exists
    attachment = db.query(RequestAttachment).filter(
        RequestAttachment.id == attachment_id,
        RequestAttachment.request_id == request_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Check request permission
    access_request = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    is_involved = (
        access_request.requester_id == current_user.id or
        access_request.target_user_id == current_user.id or
        current_user.is_superuser or
        any(a.approver_id == current_user.id for a in access_request.approvals)
    )
    if not is_involved:
        raise HTTPException(status_code=403, detail="Not authorized to download")

    # Check file exists
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Update download stats
    attachment.download_count += 1
    attachment.last_downloaded_at = datetime.now(timezone.utc)

    # Create audit log
    create_audit_log(
        db, request_id, current_user.id,
        "attachment_downloaded",
        f"File downloaded: {attachment.filename}",
        http_request.client.host if http_request.client else None
    )

    db.commit()

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.content_type
    )


@router.delete("/{request_id}/attachments/{attachment_id}")
async def delete_attachment(
    request_id: int,
    attachment_id: int,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an attachment. Only uploader or admin can delete."""
    attachment = db.query(RequestAttachment).filter(
        RequestAttachment.id == attachment_id,
        RequestAttachment.request_id == request_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Check permission (only uploader or admin)
    if attachment.uploaded_by_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only uploader or admin can delete")

    # Delete file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    # Create audit log before deletion
    create_audit_log(
        db, request_id, current_user.id,
        "attachment_deleted",
        f"File deleted: {attachment.filename}",
        http_request.client.host if http_request.client else None
    )

    # Delete record
    db.delete(attachment)
    db.commit()

    return {"message": "Attachment deleted successfully"}
