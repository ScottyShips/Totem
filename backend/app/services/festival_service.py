import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.festival import Festival
from app.models.performance import Performance


async def get_festivals(db: AsyncSession) -> list[Festival]:
    result = await db.execute(select(Festival).order_by(Festival.start_date))
    return list(result.scalars().all())


async def get_festival_by_id(db: AsyncSession, festival_id: uuid.UUID) -> Festival | None:
    result = await db.execute(select(Festival).where(Festival.id == festival_id))
    return result.scalar_one_or_none()


async def get_festival_schedule(db: AsyncSession, festival_id: uuid.UUID) -> list[Performance]:
    result = await db.execute(
        select(Performance)
        .where(Performance.festival_id == festival_id)
        .options(
            selectinload(Performance.stage),
            selectinload(Performance.artist),
        )
        .order_by(Performance.start_time)
    )
    return list(result.scalars().all())
