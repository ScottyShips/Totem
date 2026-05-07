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


class PushDebugLog(BaseModel):
    """TEMPORARY — frontend posts a step name as it walks the subscribe flow,
    so we can see in Railway logs exactly where iOS PWA hangs. Remove this
    schema along with the /push/debug-log route once the hang is fixed.
    """

    step: str = Field(..., max_length=100)
    detail: str | None = Field(None, max_length=1000)
