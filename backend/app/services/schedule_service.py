import uuid
from datetime import datetime

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.festival import GroupFestival
from app.models.performance import Performance
from app.models.schedule import UserSchedule
from app.services import push_service


async def get_all_schedules(db: AsyncSession, gf_id: uuid.UUID) -> list[UserSchedule]:
    result = await db.execute(
        select(UserSchedule)
        .where(UserSchedule.group_festival_id == gf_id)
        .options(selectinload(UserSchedule.user))
        .order_by(UserSchedule.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_my_schedule(db: AsyncSession, gf_id: uuid.UUID, user_id: uuid.UUID) -> list[UserSchedule]:
    result = await db.execute(
        select(UserSchedule)
        .where(
            UserSchedule.group_festival_id == gf_id,
            UserSchedule.user_id == user_id,
        )
        .options(selectinload(UserSchedule.user))
        .order_by(UserSchedule.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_my_attending_with_details(
    db: AsyncSession, gf_id: uuid.UUID, user_id: uuid.UUID
) -> list[UserSchedule]:
    """Returns the user's 'attending' schedule entries for this group festival,
    with `performance.artist` and `performance.stage` eagerly loaded — used by
    the ICS export endpoint. Ordered by performance start time so VEVENTs are
    chronological.
    """
    result = await db.execute(
        select(UserSchedule)
        .join(UserSchedule.performance)
        .where(
            UserSchedule.group_festival_id == gf_id,
            UserSchedule.user_id == user_id,
            UserSchedule.status == "attending",
        )
        .options(
            selectinload(UserSchedule.performance).selectinload(Performance.artist),
            selectinload(UserSchedule.performance).selectinload(Performance.stage),
        )
        .order_by(Performance.start_time.asc())
    )
    return list(result.scalars().all())


async def get_schedule_entry(
    db: AsyncSession, entry_id: uuid.UUID, gf_id: uuid.UUID
) -> UserSchedule | None:
    result = await db.execute(
        select(UserSchedule)
        .where(
            UserSchedule.id == entry_id,
            UserSchedule.group_festival_id == gf_id,
        )
        .options(selectinload(UserSchedule.user))
    )
    return result.scalar_one_or_none()


async def add_to_schedule(
    db: AsyncSession,
    gf_id: uuid.UUID,
    user_id: uuid.UUID,
    performance_id: uuid.UUID,
    status: str,
) -> UserSchedule | None:
    existing = await db.execute(
        select(UserSchedule).where(
            UserSchedule.user_id == user_id,
            UserSchedule.group_festival_id == gf_id,
            UserSchedule.performance_id == performance_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return None

    entry = UserSchedule(
        user_id=user_id,
        group_festival_id=gf_id,
        performance_id=performance_id,
        status=status,
    )
    db.add(entry)
    await db.commit()

    result = await db.execute(
        select(UserSchedule)
        .where(UserSchedule.id == entry.id)
        .options(selectinload(UserSchedule.user))
    )
    loaded = result.scalar_one()
    logger.info("Schedule entry added: performance {} for user {} in gf {}", performance_id, user_id, gf_id)

    if status == "attending":
        await _notify_friends_now_attending(db, loaded)

    return loaded


async def update_schedule_entry(db: AsyncSession, entry: UserSchedule, status: str) -> UserSchedule:
    old_status = entry.status
    entry.status = status
    await db.commit()

    result = await db.execute(
        select(UserSchedule)
        .where(UserSchedule.id == entry.id)
        .options(selectinload(UserSchedule.user))
    )
    updated = result.scalar_one()
    logger.info("Schedule entry {} updated to '{}'", entry.id, status)

    if old_status != "attending" and status == "attending":
        await _notify_friends_now_attending(db, updated)

    return updated


async def _notify_friends_now_attending(db: AsyncSession, actor_entry: UserSchedule) -> None:
    """Push 'X is going to <artist>!' to OTHER group members already attending the
    same performance. Best-effort; any failure is logged and swallowed.
    """
    try:
        actor_name = actor_entry.user.display_name

        # Other attendees of the same performance in the same group_festival
        others_q = await db.execute(
            select(UserSchedule.user_id).where(
                UserSchedule.group_festival_id == actor_entry.group_festival_id,
                UserSchedule.performance_id == actor_entry.performance_id,
                UserSchedule.status == "attending",
                UserSchedule.user_id != actor_entry.user_id,
            )
        )
        recipient_ids = [row[0] for row in others_q.all()]
        if not recipient_ids:
            return

        # Need artist name + group_id for the deep link
        perf_q = await db.execute(
            select(Performance)
            .where(Performance.id == actor_entry.performance_id)
            .options(selectinload(Performance.artist))
        )
        perf = perf_q.scalar_one_or_none()
        gf = await db.get(GroupFestival, actor_entry.group_festival_id)
        if perf is None or gf is None:
            return

        artist_name = perf.artist.name
        url = f"/groups/{gf.group_id}/festivals/{gf.id}"

        await push_service.send_to_users(
            db,
            recipient_ids,
            title=f"{actor_name} is going!",
            body=f"{actor_name} is going to {artist_name}",
            url=url,
        )
    except Exception as exc:
        logger.warning("Failed to notify friends about attending status: {}", str(exc))


async def delete_schedule_entry(db: AsyncSession, entry: UserSchedule) -> None:
    entry_id = entry.id
    await db.delete(entry)
    await db.commit()
    logger.info("Schedule entry {} deleted", entry_id)


async def get_schedule_delta(
    db: AsyncSession, gf_id: uuid.UUID, since: datetime
) -> list[UserSchedule]:
    since_naive = since.replace(tzinfo=None) if since.tzinfo else since
    result = await db.execute(
        select(UserSchedule)
        .where(
            UserSchedule.group_festival_id == gf_id,
            UserSchedule.updated_at > since_naive,
        )
        .options(selectinload(UserSchedule.user))
        .order_by(UserSchedule.updated_at.asc())
    )
    return list(result.scalars().all())
