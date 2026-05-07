import uuid
from datetime import datetime

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.performance import Performance
from app.models.schedule import UserSchedule


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
    return loaded


async def update_schedule_entry(db: AsyncSession, entry: UserSchedule, status: str) -> UserSchedule:
    entry.status = status
    await db.commit()

    result = await db.execute(
        select(UserSchedule)
        .where(UserSchedule.id == entry.id)
        .options(selectinload(UserSchedule.user))
    )
    updated = result.scalar_one()
    logger.info("Schedule entry {} updated to '{}'", entry.id, status)
    return updated


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
