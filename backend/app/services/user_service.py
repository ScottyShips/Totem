from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdate


async def update_user(db: AsyncSession, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    logger.info(f"User updated: {user.id}")
    return user
