import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class GroupUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class MemberUserInfo(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    display_name: str
    avatar_url: str | None


class GroupMemberResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user: MemberUserInfo


class GroupResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    created_by: uuid.UUID
    created_at: datetime
    members: list[GroupMemberResponse]


class GroupListResponse(BaseModel):
    data: list[GroupResponse]
    count: int
