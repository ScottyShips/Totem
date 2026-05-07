import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.group import Group, GroupMember
from app.models.invitation import Invitation
from app.models.user import User
from app.services import push_service


class TwilioError(Exception):
    pass


def _hash_phone(phone: str) -> str:
    return hashlib.sha256(phone.strip().encode()).hexdigest()


def _now_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


async def send_invitation(
    db: AsyncSession,
    group: Group,
    invited_by_id: uuid.UUID,
    phone_number: str,
) -> Invitation | None:
    """
    Creates an invitation and sends an SMS. Returns None if the user has hit the
    20-per-hour rate limit. Raises TwilioError if the SMS cannot be delivered.
    """
    one_hour_ago = _now_naive() - timedelta(hours=1)
    count_result = await db.execute(
        select(func.count(Invitation.id)).where(
            Invitation.invited_by == invited_by_id,
            Invitation.created_at > one_hour_ago,
        )
    )
    if (count_result.scalar() or 0) >= 20:
        return None

    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
        raise TwilioError("Twilio credentials are not configured")

    token = secrets.token_urlsafe(32)
    phone_hash = _hash_phone(phone_number)
    expires_at = _now_naive() + timedelta(hours=48)

    invitation = Invitation(
        group_id=group.id,
        invited_by=invited_by_id,
        phone_number=phone_hash,
        token=token,
        status="pending",
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()

    # Send SMS — raw phone_number used only here, never stored or logged
    try:
        from twilio.rest import Client  # noqa: PLC0415

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        invite_url = f"{settings.frontend_url}/invite/{token}"
        client.messages.create(
            body=f"You've been invited to join a group on Totem! {invite_url}",
            from_=settings.twilio_from_number,
            to=phone_number,
        )
    except Exception as exc:
        logger.error("Twilio SMS failed for group {}: {}", group.id, str(exc))
        await db.rollback()
        raise TwilioError("Failed to send SMS") from exc

    await db.commit()

    result = await db.execute(
        select(Invitation)
        .where(Invitation.id == invitation.id)
        .options(selectinload(Invitation.group))
    )
    loaded = result.scalar_one()
    logger.info("Invitation sent for group {} by user {}", group.id, invited_by_id)
    return loaded


async def get_invitation_by_token(db: AsyncSession, token: str) -> Invitation | None:
    result = await db.execute(
        select(Invitation)
        .where(Invitation.token == token)
        .options(selectinload(Invitation.group))
    )
    return result.scalar_one_or_none()


async def accept_invitation(
    db: AsyncSession,
    invitation: Invitation,
    user_id: uuid.UUID,
) -> GroupMember | None:
    """
    Adds user to group_members, marks invitation accepted, clears phone (PII).
    Returns None if user is already a group member.
    """
    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == invitation.group_id,
            GroupMember.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return None

    member = GroupMember(group_id=invitation.group_id, user_id=user_id, role="member")
    db.add(member)

    invitation.status = "accepted"
    invitation.phone_number = None

    await db.commit()
    await db.refresh(member)

    logger.info("Invitation {} accepted by user {}", invitation.id, user_id)

    await _notify_inviter_of_accept(db, invitation, user_id)

    return member


async def _notify_inviter_of_accept(
    db: AsyncSession, invitation: Invitation, accepter_id: uuid.UUID
) -> None:
    """Push 'X joined <group>!' to the user who sent the invitation.
    Best-effort; never raises.
    """
    try:
        # invitation.group is already eager-loaded by get_invitation_by_token
        accepter = await db.get(User, accepter_id)
        if accepter is None:
            return

        await push_service.send_to_users(
            db,
            [invitation.invited_by],
            title=f"{accepter.display_name} joined {invitation.group.name}!",
            body="Tap to see the group",
            url=f"/groups/{invitation.group_id}",
        )
    except Exception as exc:
        logger.warning("Failed to notify inviter of acceptance: {}", str(exc))
