import uuid

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group import Group, GroupMember
from app.models.user import User
from app.schemas.group import GroupCreate, GroupUpdate


def _group_with_members_query(group_id: uuid.UUID):
    return (
        select(Group)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
        .where(Group.id == group_id)
    )


async def create_group(db: AsyncSession, user: User, group_in: GroupCreate) -> Group:
    group = Group(name=group_in.name, created_by=user.id)
    db.add(group)
    await db.flush()  # populate group.id before inserting the member row

    member = GroupMember(group_id=group.id, user_id=user.id, role="admin")
    db.add(member)
    await db.commit()

    result = await db.execute(_group_with_members_query(group.id))
    loaded = result.scalar_one()
    logger.info(f"Group created: {loaded.id} by user {user.id}")
    return loaded


async def get_user_groups(db: AsyncSession, user: User) -> list[Group]:
    result = await db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    return list(result.scalars().unique().all())


async def update_group(db: AsyncSession, group: Group, group_in: GroupUpdate) -> Group:
    group.name = group_in.name
    await db.commit()
    result = await db.execute(_group_with_members_query(group.id))
    updated = result.scalar_one()
    logger.info(f"Group updated: {updated.id}")
    return updated


async def delete_group(db: AsyncSession, group: Group) -> None:
    await db.delete(group)
    await db.commit()
    logger.info(f"Group deleted: {group.id}")
