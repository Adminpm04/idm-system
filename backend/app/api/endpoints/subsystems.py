from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.subsystem import SubsystemCreate, SubsystemUpdate, SubsystemResponse
from app.models import Subsystem, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/systems/{system_id}/subsystems", response_model=List[SubsystemResponse])
async def list_subsystems(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all subsystems for a system"""
    subsystems = db.query(Subsystem).filter(
        Subsystem.system_id == system_id,
        Subsystem.is_active == True
    ).all()
    return subsystems


@router.post("/subsystems", response_model=SubsystemResponse, status_code=status.HTTP_201_CREATED)
async def create_subsystem(
    subsystem_in: SubsystemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new subsystem"""
    subsystem = Subsystem(**subsystem_in.model_dump())
    db.add(subsystem)
    db.commit()
    db.refresh(subsystem)
    return subsystem


@router.put("/subsystems/{subsystem_id}", response_model=SubsystemResponse)
async def update_subsystem(
    subsystem_id: int,
    subsystem_update: SubsystemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update subsystem"""
    subsystem = db.query(Subsystem).filter(Subsystem.id == subsystem_id).first()
    if not subsystem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subsystem not found")
    
    update_data = subsystem_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subsystem, field, value)
    
    db.commit()
    db.refresh(subsystem)
    return subsystem


@router.delete("/subsystems/{subsystem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subsystem(
    subsystem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete subsystem"""
    subsystem = db.query(Subsystem).filter(Subsystem.id == subsystem_id).first()
    if not subsystem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subsystem not found")
    
    db.delete(subsystem)
    db.commit()
    return None
