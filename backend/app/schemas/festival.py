import uuid
from datetime import date, datetime

from pydantic import BaseModel


class StageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None


class ArtistResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    genre: str | None
    image_url: str | None
    spotify_id: str | None


class ArtistSpotifyResponse(BaseModel):
    spotify_id: str | None


class PerformanceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    start_time: datetime
    end_time: datetime
    stage: StageResponse
    artist: ArtistResponse


class FestivalResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    location: str
    start_date: date
    end_date: date
    slug: str


class FestivalListResponse(BaseModel):
    data: list[FestivalResponse]
    count: int


class FestivalScheduleResponse(BaseModel):
    festival: FestivalResponse
    performances: list[PerformanceResponse]
