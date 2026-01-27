from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class IconType(str, Enum):
    LIBRARY = "library"
    FILE = "file"
    EMOJI = "emoji"


class DashboardCardBase(BaseModel):
    title: str
    description: Optional[str] = None
    icon_type: IconType = IconType.LIBRARY
    icon_name: Optional[str] = None
    icon_file: Optional[str] = None
    icon_emoji: Optional[str] = None
    icon_color: Optional[str] = "#16306C"
    link_url: str
    order: int = 0
    is_active: bool = True
    is_visible_to_all: bool = True


class DashboardCardCreate(DashboardCardBase):
    pass


class DashboardCardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon_type: Optional[IconType] = None
    icon_name: Optional[str] = None
    icon_file: Optional[str] = None
    icon_emoji: Optional[str] = None
    icon_color: Optional[str] = None
    link_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    is_visible_to_all: Optional[bool] = None


class DashboardCardResponse(DashboardCardBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardCardListResponse(BaseModel):
    cards: list[DashboardCardResponse]
    total: int
