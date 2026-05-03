from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user, require_group_admin, require_group_member
from app.models.group import Group
from app.models.user import User
from app.schemas.group import GroupCreate, GroupListResponse, GroupResponse, GroupUpdate
from app.services import group_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_in: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    group = await group_service.create_group(db, current_user, group_in)
    return GroupResponse.model_validate(group)


@router.get("", response_model=GroupListResponse, status_code=status.HTTP_200_OK)
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GroupListResponse:
    groups = await group_service.get_user_groups(db, current_user)
    return GroupListResponse(
        data=[GroupResponse.model_validate(g) for g in groups],
        count=len(groups),
    )


@router.get("/{group_id}", response_model=GroupResponse, status_code=status.HTTP_200_OK)
async def get_group(group: Group = Depends(require_group_member)) -> GroupResponse:
    return GroupResponse.model_validate(group)


@router.patch("/{group_id}", response_model=GroupResponse, status_code=status.HTTP_200_OK)
async def update_group(
    group_in: GroupUpdate,
    group: Group = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
) -> GroupResponse:
    updated = await group_service.update_group(db, group, group_in)
    return GroupResponse.model_validate(updated)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group: Group = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    await group_service.delete_group(db, group)
