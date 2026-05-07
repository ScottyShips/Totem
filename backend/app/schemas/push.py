import uuid

from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str = Field(..., max_length=255)
    auth: str = Field(..., max_length=64)


class PushSubscriptionCreate(BaseModel):
    """Mirrors the shape of the browser's PushSubscription.toJSON() output."""

    endpoint: str = Field(..., max_length=500)
    keys: PushKeys


class PushSubscriptionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
