import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserScheduleCreate(BaseModel):
    performance_id: uuid.UUID
    status: str = Field(..., pattern="^(attending|maybe|skipping)$")


class UserScheduleUpdate(BaseModel):
    status: str = Field(..., pattern="^(attending|maybe|skipping)$")


class ScheduleUserInfo(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    display_name: str
    avatar_url: str | None


class UserScheduleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    performance_id: uuid.UUID
    status: str
    updated_at: datetime
    user: ScheduleUserInfo


class UserScheduleListResponse(BaseModel):
    data: list[UserScheduleResponse]
    count: int


class PollResponse(BaseModel):
    data: list[UserScheduleResponse]
    count: int
