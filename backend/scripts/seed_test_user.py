"""Create a test user and add them to every group the primary user is in.

One-shot dev tool for testing push notifications and group features without
having to invite a second phone number. Idempotent — running it twice is safe.

Usage (against local DB):
    python scripts/seed_test_user.py

Usage (against Railway prod DB) — easiest:
    railway run python scripts/seed_test_user.py

Or override DATABASE_URL inline (PowerShell):
    $env:DATABASE_URL="<railway-postgres-url>"; python scripts/seed_test_user.py
"""
import asyncio
import sys

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.group import Group, GroupMember
from app.models.user import User


PRIMARY_EMAIL = "trevorscottherndon@gmail.com"
TEST_EMAIL = "test.test@test.com"
TEST_DISPLAY_NAME = "Test User"
TEST_PASSWORD = "password123"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # 1. Find primary user
        primary_q = await db.execute(select(User).where(User.email == PRIMARY_EMAIL))
        primary = primary_q.scalar_one_or_none()
        if primary is None:
            logger.error("Primary user '{}' not found — aborting", PRIMARY_EMAIL)
            sys.exit(1)
        logger.info("Found primary user: {} (id={})", primary.display_name, primary.id)

        # 2. Find groups primary belongs to
        memberships_q = await db.execute(
            select(GroupMember)
            .where(GroupMember.user_id == primary.id)
            .options(selectinload(GroupMember.group))
        )
        primary_memberships = list(memberships_q.scalars().all())
        if not primary_memberships:
            logger.error("Primary user is not in any groups — create one first")
            sys.exit(1)
        logger.info(
            "Primary is in {} group(s): {}",
            len(primary_memberships),
            [m.group.name for m in primary_memberships],
        )

        # 3. Upsert test user
        test_q = await db.execute(select(User).where(User.email == TEST_EMAIL))
        test_user = test_q.scalar_one_or_none()
        if test_user is None:
            test_user = User(
                email=TEST_EMAIL,
                display_name=TEST_DISPLAY_NAME,
                password_hash=hash_password(TEST_PASSWORD),
            )
            db.add(test_user)
            await db.flush()
            logger.info("Created test user {} (id={})", TEST_EMAIL, test_user.id)
        else:
            logger.info("Test user already exists (id={}) — reusing", test_user.id)

        # 4. Add test user to each of primary's groups (skip duplicates)
        added_count = 0
        for membership in primary_memberships:
            existing_q = await db.execute(
                select(GroupMember).where(
                    GroupMember.group_id == membership.group_id,
                    GroupMember.user_id == test_user.id,
                )
            )
            if existing_q.scalar_one_or_none() is not None:
                logger.info("Test user already in group '{}' — skipping", membership.group.name)
                continue

            new_member = GroupMember(
                group_id=membership.group_id,
                user_id=test_user.id,
                role="member",
            )
            db.add(new_member)
            added_count += 1
            logger.info("Added test user to group '{}'", membership.group.name)

        await db.commit()

        print()
        print(f"Test user ready:")
        print(f"  email:        {TEST_EMAIL}")
        print(f"  password:     {TEST_PASSWORD}")
        print(f"  display name: {TEST_DISPLAY_NAME}")
        print(f"  groups joined this run: {added_count}")
        print(f"  total groups: {len(primary_memberships)}")


if __name__ == "__main__":
    asyncio.run(seed())
