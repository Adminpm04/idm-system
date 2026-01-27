from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class IconType(str, enum.Enum):
    LIBRARY = "library"
    FILE = "file"
    EMOJI = "emoji"


class DashboardCard(Base):
    __tablename__ = "dashboard_cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    # Icon settings
    icon_type = Column(String(20), default=IconType.LIBRARY, nullable=False)
    icon_name = Column(String(100), nullable=True)  # For library icons (e.g., "PlusIcon", "HomeIcon")
    icon_file = Column(String(255), nullable=True)  # For uploaded files (path to file)
    icon_emoji = Column(String(10), nullable=True)  # For emoji icons
    icon_color = Column(String(20), default="#16306C", nullable=True)  # Icon color

    # Link settings
    link_url = Column(String(255), nullable=False)  # Where to navigate (e.g., "/create-request")

    # Display settings
    order = Column(Integer, default=0, nullable=False)  # Sort order
    is_active = Column(Boolean, default=True, nullable=False)
    is_visible_to_all = Column(Boolean, default=True, nullable=False)  # Visible to all users or admin only

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<DashboardCard(id={self.id}, title='{self.title}')>"
