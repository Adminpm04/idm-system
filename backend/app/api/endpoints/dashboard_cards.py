from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import shutil
from app.db.session import get_db
from app.schemas.dashboard_card import (
    DashboardCardCreate,
    DashboardCardUpdate,
    DashboardCardResponse,
)
from app.models import DashboardCard, User
from app.api.deps import get_current_user, get_current_superuser

router = APIRouter()

# Directory for uploaded icons
UPLOAD_DIR = "/opt/idm-system/backend/uploads/icons"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=List[DashboardCardResponse])
async def get_dashboard_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active dashboard cards for the current user"""
    query = db.query(DashboardCard).filter(DashboardCard.is_active == True)

    # Non-admin users only see cards visible to all
    if not current_user.is_superuser:
        query = query.filter(DashboardCard.is_visible_to_all == True)

    cards = query.order_by(DashboardCard.order).all()
    return cards


@router.get("/all", response_model=List[DashboardCardResponse])
async def get_all_dashboard_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Get all dashboard cards (admin only)"""
    cards = db.query(DashboardCard).order_by(DashboardCard.order).all()
    return cards


@router.get("/{card_id}", response_model=DashboardCardResponse)
async def get_dashboard_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Get a specific dashboard card"""
    card = db.query(DashboardCard).filter(DashboardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("", response_model=DashboardCardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard_card(
    card_in: DashboardCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create a new dashboard card (admin only)"""
    card = DashboardCard(**card_in.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.put("/{card_id}", response_model=DashboardCardResponse)
async def update_dashboard_card(
    card_id: int,
    card_in: DashboardCardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Update a dashboard card (admin only)"""
    card = db.query(DashboardCard).filter(DashboardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = card_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(card, key, value)

    db.commit()
    db.refresh(card)
    return card


@router.delete("/{card_id}")
async def delete_dashboard_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Delete a dashboard card (admin only)"""
    card = db.query(DashboardCard).filter(DashboardCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Delete associated icon file if exists
    if card.icon_file and os.path.exists(os.path.join(UPLOAD_DIR, card.icon_file)):
        os.remove(os.path.join(UPLOAD_DIR, card.icon_file))

    db.delete(card)
    db.commit()
    return {"message": "Card deleted successfully"}


@router.post("/upload-icon")
async def upload_icon(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_superuser)
):
    """Upload an icon file (admin only)"""
    # Validate file type
    allowed_extensions = {".png", ".svg", ".jpg", ".jpeg", ".webp", ".gif"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": unique_filename,
        "url": f"/api/dashboard-cards/icons/{unique_filename}"
    }


@router.post("/reorder")
async def reorder_cards(
    order: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Reorder dashboard cards (admin only)"""
    for index, card_id in enumerate(order):
        card = db.query(DashboardCard).filter(DashboardCard.id == card_id).first()
        if card:
            card.order = index
    db.commit()
    return {"message": "Cards reordered successfully"}
