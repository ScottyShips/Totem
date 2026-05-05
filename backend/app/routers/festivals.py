import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.festival import (
    FestivalListResponse,
    FestivalResponse,
    FestivalScheduleResponse,
    PerformanceResponse,
)
from app.services import festival_service

router = APIRouter(prefix="/festivals", tags=["festivals"])


@router.get("", response_model=FestivalListResponse, status_code=status.HTTP_200_OK)
async def list_festivals(db: AsyncSession = Depends(get_db)) -> FestivalListResponse:
    festivals = await festival_service.get_festivals(db)
    return FestivalListResponse(
        data=[FestivalResponse.model_validate(f) for f in festivals],
        count=len(festivals),
    )


@router.get("/{festival_id}", response_model=FestivalResponse, status_code=status.HTTP_200_OK)
async def get_festival(
    festival_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> FestivalResponse:
    festival = await festival_service.get_festival_by_id(db, festival_id)
    if festival is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Festival not found")
    return FestivalResponse.model_validate(festival)


@router.get("/{festival_id}/schedule", response_model=FestivalScheduleResponse, status_code=status.HTTP_200_OK)
async def get_festival_schedule(
    festival_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> FestivalScheduleResponse:
    festival = await festival_service.get_festival_by_id(db, festival_id)
    if festival is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Festival not found")
    performances = await festival_service.get_festival_schedule(db, festival_id)
    return FestivalScheduleResponse(
        festival=FestivalResponse.model_validate(festival),
        performances=[PerformanceResponse.model_validate(p) for p in performances],
    )
