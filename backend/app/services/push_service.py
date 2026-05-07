"""Web Push delivery — register/unregister browser subscriptions and send pushes.

pywebpush is synchronous (uses `requests`), so all send calls run in a thread
executor to avoid blocking the FastAPI event loop. Send errors are logged but
never re-raised: a failed push must never break the user-visible action that
triggered it (e.g. saving a schedule entry). Stale subscriptions (404/410)
are cleaned up automatically.
"""
import asyncio
import json
import uuid
from typing import Iterable

from loguru import logger
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.push import PushSubscription


async def register_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    endpoint: str,
    p256dh: str,
    auth: str,
) -> PushSubscription:
    """Upsert by endpoint. Same browser re-subscribing yields the same endpoint —
    we update the keys (rotated occasionally) and ownership (in case the
    physical device is now signed in as a different user).
    """
    existing_q = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    existing = existing_q.scalar_one_or_none()

    if existing is not None:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
        await db.commit()
        await db.refresh(existing)
        logger.info("Push subscription refreshed for user {}", user_id)
        return existing

    sub = PushSubscription(
        user_id=user_id,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    logger.info("Push subscription created for user {}", user_id)
    return sub


async def delete_subscription_by_endpoint(
    db: AsyncSession, user_id: uuid.UUID, endpoint: str
) -> bool:
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == user_id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return False
    await db.delete(sub)
    await db.commit()
    return True


def _send_one(sub: PushSubscription, payload: str) -> int | None:
    """Synchronous send. Returns the HTTP status code on push-service failure
    (so we can prune stale subs), or None on success / unknown failure.
    """
    if not (settings.vapid_private_key and settings.vapid_public_key):
        logger.warning("VAPID keys not configured — skipping push send")
        return None

    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return None
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        # 404 (Not Found) and 410 (Gone) mean the browser unsubscribed — prune.
        if status in (404, 410):
            return status
        logger.warning("Push send failed for sub {}: {}", sub.id, str(exc))
        return None
    except Exception as exc:
        logger.warning("Unexpected push send error for sub {}: {}", sub.id, str(exc))
        return None


async def send_to_users(
    db: AsyncSession,
    user_ids: Iterable[uuid.UUID],
    *,
    title: str,
    body: str,
    url: str | None = None,
) -> None:
    """Send a push to every subscription owned by any of these users.

    Failures are swallowed — pushes are best-effort. Subscriptions that the
    push service reports as gone (404/410) are deleted. Returns nothing.
    """
    user_id_list = list(user_ids)
    if not user_id_list:
        return

    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id.in_(user_id_list))
    )
    subs = list(result.scalars().all())
    if not subs:
        return

    payload = json.dumps({"title": title, "body": body, "url": url})

    # Run all sends concurrently in threads — pywebpush is synchronous.
    results = await asyncio.gather(
        *(asyncio.to_thread(_send_one, sub, payload) for sub in subs),
        return_exceptions=False,
    )

    stale_ids = [sub.id for sub, status in zip(subs, results) if status in (404, 410)]
    if stale_ids:
        for sub in subs:
            if sub.id in stale_ids:
                await db.delete(sub)
        await db.commit()
        logger.info("Pruned {} stale push subscriptions", len(stale_ids))
