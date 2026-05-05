import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("display_name", mode="before")
    @classmethod
    def strip_display_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower()


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)

    @field_validator("display_name", mode="before")
    @classmethod
    def strip_display_name(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else v


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
