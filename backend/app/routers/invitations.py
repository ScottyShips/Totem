from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.invitation import InvitationAcceptResponse, InvitationResponse
from app.services import invitation_service
from app.services.invitation_service import TwilioError

router = APIRouter(prefix="/invitations", tags=["invitations"])


def _now_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


@router.get("/{token}", response_model=InvitationResponse, status_code=status.HTTP_200_OK)
async def get_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> InvitationResponse:
    """Public endpoint — validates a token so the frontend can show the group name before the user logs in."""
    inv = await invitation_service.get_invitation_by_token(db, token)
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if inv.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitation has already been used")
    if inv.expires_at < _now_naive():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation has expired")
    return InvitationResponse.model_validate(inv)


@router.post("/{token}/accept", response_model=InvitationAcceptResponse, status_code=status.HTTP_200_OK)
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvitationAcceptResponse:
    inv = await invitation_service.get_invitation_by_token(db, token)
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if inv.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitation has already been used")
    if inv.expires_at < _now_naive():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation has expired")

    member = await invitation_service.accept_invitation(db, inv, current_user.id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already a member of this group")

    return InvitationAcceptResponse(group_id=inv.group_id, group=inv.group)
