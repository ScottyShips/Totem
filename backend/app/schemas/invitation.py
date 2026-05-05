import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InvitationCreate(BaseModel):
    # E.164 format required: +[country code][number], e.g. +15555551234
    phone_number: str = Field(..., min_length=8, max_length=16, pattern=r"^\+[1-9]\d{6,14}$")


class InvitationGroupInfo(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str


class InvitationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    group_id: uuid.UUID
    status: str
    expires_at: datetime
    created_at: datetime
    group: InvitationGroupInfo


class InvitationAcceptResponse(BaseModel):
    model_config = {"from_attributes": True}

    group_id: uuid.UUID
    group: InvitationGroupInfo
