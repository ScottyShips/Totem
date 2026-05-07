import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user, require_gf_member
from app.models.festival import GroupFestival
from app.models.performance import Performance
from app.models.user import User
from app.schemas.group import GroupFestivalResponse
from app.schemas.schedule import (
    PollResponse,
    UserScheduleCreate,
    UserScheduleListResponse,
    UserScheduleResponse,
    UserScheduleUpdate,
)
from app.services import ics_service, schedule_service

router = APIRouter(prefix="/group-festivals", tags=["schedules"])


@router.get("/{gf_id}", response_model=GroupFestivalResponse, status_code=status.HTTP_200_OK)
async def get_group_festival(
    gf: GroupFestival = Depends(require_gf_member),
) -> GroupFestivalResponse:
    return GroupFestivalResponse.model_validate(gf)


@router.get(
    "/{gf_id}/schedule.ics",
    response_class=Response,
    status_code=status.HTTP_200_OK,
    responses={200: {"content": {"text/calendar": {}}}},
)
async def download_schedule_ics(
    gf: GroupFestival = Depends(require_gf_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    entries = await schedule_service.get_my_attending_with_details(db, gf.id, current_user.id)
    body = ics_service.build_ics(gf.festival, entries)

    safe_slug = re.sub(r"[^A-Za-z0-9._-]+", "-", gf.festival.name).strip("-").lower() or "festival"
    filename = f"{safe_slug}-totem.ics"
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{gf_id}/schedules", response_model=UserScheduleListResponse, status_code=status.HTTP_200_OK)
async def get_all_schedules(
    gf: GroupFestival = Depends(require_gf_member),
    db: AsyncSession = Depends(get_db),
) -> UserScheduleListResponse:
    entries = await schedule_service.get_all_schedules(db, gf.id)
    return UserScheduleListResponse(
        data=[UserScheduleResponse.model_validate(e) for e in entries],
        count=len(entries),
    )


# /me and /poll must be declared before /{schedule_id} so FastAPI matches them as literals
@router.get("/{gf_id}/schedules/me", response_model=UserScheduleListResponse, status_code=status.HTTP_200_OK)
async def get_my_schedule(
    gf: GroupFestival = Depends(require_gf_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserScheduleListResponse:
    entries = await schedule_service.get_my_schedule(db, gf.id, current_user.id)
    return UserScheduleListResponse(
        data=[UserScheduleResponse.model_validate(e) for e in entries],
        count=len(entries),
    )


@router.get("/{gf_id}/schedules/poll", response_model=PollResponse, status_code=status.HTTP_200_OK)
async def poll_schedules(
    gf: GroupFestival = Depends(require_gf_member),
    since: datetime = Query(..., description="ISO datetime — returns only entries updated after this time"),
    db: AsyncSession = Depends(get_db),
) -> PollResponse:
    entries = await schedule_service.get_schedule_delta(db, gf.id, since)
    return PollResponse(
        data=[UserScheduleResponse.model_validate(e) for e in entries],
        count=len(entries),
    )


@router.post("/{gf_id}/schedules", response_model=UserScheduleResponse, status_code=status.HTTP_201_CREATED)
async def add_to_schedule(
    body: UserScheduleCreate,
    gf: GroupFestival = Depends(require_gf_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserScheduleResponse:
    perf = await db.get(Performance, body.performance_id)
    if perf is None or perf.festival_id != gf.festival_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance not found for this festival")
    result = await schedule_service.add_to_schedule(
        db, gf.id, current_user.id, body.performance_id, body.status
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Performance already in your plan")
    return UserScheduleResponse.model_validate(result)


@router.patch(
    "/{gf_id}/schedules/{schedule_id}", response_model=UserScheduleResponse, status_code=status.HTTP_200_OK
)
async def update_schedule(
    schedule_id: uuid.UUID,
    body: UserScheduleUpdate,
    gf: GroupFestival = Depends(require_gf_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserScheduleResponse:
    entry = await schedule_service.get_schedule_entry(db, schedule_id, gf.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only modify your own schedule")
    updated = await schedule_service.update_schedule_entry(db, entry, body.status)
    return UserScheduleResponse.model_validate(updated)


@router.delete("/{gf_id}/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_from_schedule(
    schedule_id: uuid.UUID,
    gf: GroupFestival = Depends(require_gf_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    entry = await schedule_service.get_schedule_entry(db, schedule_id, gf.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only modify your own schedule")
    await schedule_service.delete_schedule_entry(db, entry)
