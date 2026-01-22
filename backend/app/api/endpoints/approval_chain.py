from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.approval_chain import ApprovalChainCreate, ApprovalChainResponse
from app.models import User
from app.models.system import ApprovalChain
from app.api.deps import get_current_user, get_current_superuser

router = APIRouter()


@router.get("/systems/{system_id}/approval-chain", response_model=List[ApprovalChainResponse])
async def list_approval_chain(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval chain for a system"""
    chains = db.query(ApprovalChain).filter(
        ApprovalChain.system_id == system_id
    ).order_by(ApprovalChain.step_number).all()

    return chains


@router.post("/approval-chain", response_model=ApprovalChainResponse, status_code=status.HTTP_201_CREATED)
async def create_approval_chain(
    chain_in: ApprovalChainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)  # Only superusers can create
):
    """Create approval chain step (admin only)"""
    chain = ApprovalChain(**chain_in.model_dump())
    db.add(chain)
    db.commit()
    db.refresh(chain)
    return chain


@router.delete("/approval-chain/{chain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval_chain(
    chain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)  # Only superusers can delete
):
    """Delete approval chain step (admin only)"""
    chain = db.query(ApprovalChain).filter(ApprovalChain.id == chain_id).first()
    if not chain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval chain step not found"
        )
    db.delete(chain)
    db.commit()
    return None
