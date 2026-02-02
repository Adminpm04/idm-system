"""Web Push notification API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json
import logging

from app.db.session import get_db

logger = logging.getLogger(__name__)
from app.api.deps import get_current_user
from app.models import User, PushSubscription
from app.core.config import settings

router = APIRouter()


class PushSubscriptionCreate(BaseModel):
    """Push subscription data from browser"""
    endpoint: str
    keys: dict  # Contains p256dh and auth


class PushSubscriptionResponse(BaseModel):
    id: int
    endpoint: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push subscription"""
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe current user to push notifications"""
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()

    if existing:
        # Update existing subscription
        existing.user_id = current_user.id
        existing.p256dh_key = subscription.keys.get('p256dh', '')
        existing.auth_key = subscription.keys.get('auth', '')
        existing.is_active = True
        existing.user_agent = request.headers.get('user-agent')
        db.commit()
        db.refresh(existing)
        return existing

    # Create new subscription
    new_sub = PushSubscription(
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        p256dh_key=subscription.keys.get('p256dh', ''),
        auth_key=subscription.keys.get('auth', ''),
        user_agent=request.headers.get('user-agent'),
        is_active=True
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return new_sub


@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unsubscribe from push notifications"""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id
    ).first()

    if subscription:
        subscription.is_active = False
        db.commit()

    return {"message": "Unsubscribed"}


@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's push subscriptions"""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.is_active == True
    ).all()
    return subscriptions


# ============ PUSH SENDING UTILITY ============

def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    url: Optional[str] = None,
    tag: Optional[str] = None
) -> int:
    """Send push notification to all active subscriptions of a user.

    Returns number of notifications sent successfully.
    """
    from pywebpush import webpush, WebPushException

    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.is_active == True
    ).all()

    if not subscriptions:
        return 0

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url or "/my-approvals",
        "tag": tag or "idm-notification",
        "icon": "/vite.svg"
    })

    vapid_claims = {
        "sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"
    }

    sent_count = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh_key,
                        "auth": sub.auth_key
                    }
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=vapid_claims
            )
            sub.last_used_at = datetime.now(timezone.utc)
            sent_count += 1
        except WebPushException as e:
            # Subscription may be invalid/expired
            if e.response and e.response.status_code in [404, 410]:
                sub.is_active = False
            logger.warning(f"Push error for user {user_id}: {e}")
        except Exception as e:
            logger.error(f"Push error: {e}")

    db.commit()
    return sent_count


def send_push_to_approvers(
    db: Session,
    request_id: int,
    system_name: str,
    requester_name: str
):
    """Send push notification to all pending approvers of a request"""
    from app.models import Approval, ApprovalStatus

    pending_approvals = db.query(Approval).filter(
        Approval.request_id == request_id,
        Approval.status == ApprovalStatus.PENDING
    ).all()

    for approval in pending_approvals:
        send_push_notification(
            db=db,
            user_id=approval.approver_id,
            title="Новая заявка на согласование",
            body=f"{requester_name} запрашивает доступ к {system_name}",
            url=f"/requests/{request_id}",
            tag=f"approval-{request_id}"
        )
