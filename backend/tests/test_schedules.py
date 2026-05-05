"""
Integration tests for schedule endpoints.

Requires:
  - A running PostgreSQL DB configured in backend/.env
  - Seed data (run `python seed.py` from backend/ first)

Run from backend/:  pytest
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.models.festival import GroupFestival
from app.models.group import Group, GroupMember
from app.models.schedule import UserSchedule
from app.models.user import User
from main import app

_BASE = "http://test"


async def _register_and_login(client: AsyncClient, suffix: str) -> tuple[str, str, dict]:
    email = f"test_{suffix}@example.com"
    r = await client.post("/api/v1/auth/register", json={
        "email": email,
        "display_name": "Test User",
        "password": "TestPass123!",
    })
    assert r.status_code == 201, r.text
    user_id: str = r.json()["user"]["id"]

    r = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "TestPass123!",
    })
    assert r.status_code == 200, r.text
    token: str = r.json()["access_token"]
    return user_id, token, {"Authorization": f"Bearer {token}"}


async def _cleanup(user_id: str, group_id: str | None = None) -> None:
    async with AsyncSessionLocal() as db:
        if group_id:
            gid = uuid.UUID(group_id)
            gf_ids_q = select(GroupFestival.id).where(GroupFestival.group_id == gid)
            await db.execute(delete(UserSchedule).where(UserSchedule.group_festival_id.in_(gf_ids_q)))
            await db.execute(delete(GroupFestival).where(GroupFestival.group_id == gid))
            await db.execute(delete(GroupMember).where(GroupMember.group_id == gid))
            await db.execute(delete(Group).where(Group.id == gid))
        await db.execute(delete(User).where(User.id == uuid.UUID(user_id)))
        await db.commit()


async def _get_festival_and_performance(client: AsyncClient) -> tuple[str, str] | None:
    r = await client.get("/api/v1/festivals")
    festivals = r.json()["data"]
    if not festivals:
        return None
    festival_id = festivals[0]["id"]

    r = await client.get(f"/api/v1/festivals/{festival_id}/schedule")
    performances = r.json()["performances"]
    if not performances:
        return None
    return festival_id, performances[0]["id"]


async def _make_transport() -> ASGITransport:
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_add_to_plan_and_poll():
    """Core scenario: add a performance to the plan, then confirm it appears in the poll delta."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=_BASE) as client:
        suffix = uuid.uuid4().hex[:8]
        user_id, _, headers = await _register_and_login(client, suffix)
        group_id = None

        try:
            pair = await _get_festival_and_performance(client)
            if pair is None:
                pytest.skip("No festival/performance data seeded — run seed.py first")
            festival_id, performance_id = pair

            r = await client.post("/api/v1/groups", json={"name": "Poll Test Group"}, headers=headers)
            assert r.status_code == 201
            group_id = r.json()["id"]

            r = await client.post(
                f"/api/v1/groups/{group_id}/festivals",
                json={"festival_id": festival_id},
                headers=headers,
            )
            assert r.status_code == 201
            gf_id = r.json()["id"]

            # Capture since before the insert so the new entry falls strictly after it
            since = datetime.now(UTC).isoformat()

            r = await client.post(
                f"/api/v1/group-festivals/{gf_id}/schedules",
                json={"performance_id": performance_id, "status": "attending"},
                headers=headers,
            )
            assert r.status_code == 201, r.text
            entry_id = r.json()["id"]
            assert r.json()["status"] == "attending"
            assert r.json()["user"]["id"] == r.json()["user_id"]

            r = await client.get(
                f"/api/v1/group-festivals/{gf_id}/schedules/poll",
                params={"since": since},
                headers=headers,
            )
            assert r.status_code == 200, r.text
            delta = r.json()
            assert delta["count"] >= 1
            assert entry_id in [e["id"] for e in delta["data"]], (
                "Newly added entry must appear in poll delta"
            )

        finally:
            await _cleanup(user_id, group_id)


@pytest.mark.asyncio
async def test_nonmember_cannot_access_schedules():
    """A user who is not a group member receives 403 on all schedule reads."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=_BASE) as client:
        suffix_a = uuid.uuid4().hex[:8]
        suffix_b = uuid.uuid4().hex[:8]
        user_a_id, _, headers_a = await _register_and_login(client, suffix_a)
        user_b_id, _, headers_b = await _register_and_login(client, suffix_b)
        group_id = None

        try:
            pair = await _get_festival_and_performance(client)
            if pair is None:
                pytest.skip("No festival/performance data seeded — run seed.py first")
            festival_id, _ = pair

            r = await client.post("/api/v1/groups", json={"name": "Private Group"}, headers=headers_a)
            assert r.status_code == 201
            group_id = r.json()["id"]

            r = await client.post(
                f"/api/v1/groups/{group_id}/festivals",
                json={"festival_id": festival_id},
                headers=headers_a,
            )
            assert r.status_code == 201
            gf_id = r.json()["id"]

            # User B is not a member — all schedule endpoints must reject them
            assert (await client.get(
                f"/api/v1/group-festivals/{gf_id}/schedules", headers=headers_b
            )).status_code == 403

            assert (await client.get(
                f"/api/v1/group-festivals/{gf_id}/schedules/me", headers=headers_b
            )).status_code == 403

            assert (await client.get(
                f"/api/v1/group-festivals/{gf_id}/schedules/poll",
                params={"since": datetime.now(UTC).isoformat()},
                headers=headers_b,
            )).status_code == 403

        finally:
            await _cleanup(user_a_id, group_id)
            await _cleanup(user_b_id)


@pytest.mark.asyncio
async def test_duplicate_schedule_entry_returns_409():
    """Adding the same performance to the plan twice returns 409 Conflict."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=_BASE) as client:
        suffix = uuid.uuid4().hex[:8]
        user_id, _, headers = await _register_and_login(client, suffix)
        group_id = None

        try:
            pair = await _get_festival_and_performance(client)
            if pair is None:
                pytest.skip("No festival/performance data seeded — run seed.py first")
            festival_id, performance_id = pair

            r = await client.post("/api/v1/groups", json={"name": "Dup Test Group"}, headers=headers)
            assert r.status_code == 201
            group_id = r.json()["id"]

            r = await client.post(
                f"/api/v1/groups/{group_id}/festivals",
                json={"festival_id": festival_id},
                headers=headers,
            )
            gf_id = r.json()["id"]

            payload = {"performance_id": performance_id, "status": "attending"}

            r = await client.post(f"/api/v1/group-festivals/{gf_id}/schedules", json=payload, headers=headers)
            assert r.status_code == 201

            r = await client.post(f"/api/v1/group-festivals/{gf_id}/schedules", json=payload, headers=headers)
            assert r.status_code == 409

        finally:
            await _cleanup(user_id, group_id)


@pytest.mark.asyncio
async def test_update_and_delete_schedule_entry():
    """Member can PATCH their own entry and DELETE it; both endpoints work correctly."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=_BASE) as client:
        suffix = uuid.uuid4().hex[:8]
        user_id, _, headers = await _register_and_login(client, suffix)
        group_id = None

        try:
            pair = await _get_festival_and_performance(client)
            if pair is None:
                pytest.skip("No festival/performance data seeded — run seed.py first")
            festival_id, performance_id = pair

            r = await client.post("/api/v1/groups", json={"name": "Edit Test Group"}, headers=headers)
            group_id = r.json()["id"]

            r = await client.post(
                f"/api/v1/groups/{group_id}/festivals",
                json={"festival_id": festival_id},
                headers=headers,
            )
            gf_id = r.json()["id"]

            r = await client.post(
                f"/api/v1/group-festivals/{gf_id}/schedules",
                json={"performance_id": performance_id, "status": "attending"},
                headers=headers,
            )
            assert r.status_code == 201
            entry_id = r.json()["id"]

            # PATCH — change status
            r = await client.patch(
                f"/api/v1/group-festivals/{gf_id}/schedules/{entry_id}",
                json={"status": "maybe"},
                headers=headers,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "maybe"

            # DELETE
            r = await client.delete(
                f"/api/v1/group-festivals/{gf_id}/schedules/{entry_id}",
                headers=headers,
            )
            assert r.status_code == 204

            # Confirm gone — GET /me should return 0 entries
            r = await client.get(f"/api/v1/group-festivals/{gf_id}/schedules/me", headers=headers)
            assert r.status_code == 200
            assert r.json()["count"] == 0

        finally:
            await _cleanup(user_id, group_id)
