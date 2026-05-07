from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.push import PushDebugLog, PushSubscriptionCreate, PushSubscriptionResponse
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


@router.post("/debug-log", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def debug_log(request: Request, body: PushDebugLog) -> None:
    """TEMPORARY — diagnostic logging from the frontend during the push
    subscribe flow. The last step seen in Railway logs before silence is the
    hang point. Remove this route once iOS PWA push hang is resolved.
    """
    ua = request.headers.get("user-agent", "?")
    logger.info(
        "[push-debug] step={} detail={} ua={}",
        body.step,
        body.detail,
        ua,
    )


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
