from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionResponse
from app.services import push_service

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", status_code=status.HTTP_200_OK)
async def get_vapid_public_key() -> dict[str, str | None]:
    """Public — the frontend fetches this once on first push prompt to seed
    the PushManager.subscribe call. Returns null if push isn't configured,
    so the frontend can hide the prompt entirely.
    """
    return {"public_key": settings.vapid_public_key}


@router.post(
    "/subscriptions",
    response_model=PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    body: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PushSubscriptionResponse:
    if not (settings.vapid_public_key and settings.vapid_private_key):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured",
        )
    sub = await push_service.register_subscription(
        db,
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth=body.keys.auth,
    )
    return PushSubscriptionResponse.model_validate(sub)


@router.delete("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete by endpoint — the frontend has the endpoint string from
    PushManager.getSubscription() but not our internal subscription ID.
    """
    await push_service.delete_subscription_by_endpoint(
        db, user_id=current_user.id, endpoint=endpoint
    )
