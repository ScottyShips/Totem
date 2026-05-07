from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None

    spotify_client_id: str | None = None
    spotify_client_secret: str | None = None

    frontend_url: str = "http://localhost:3000"

    @field_validator("database_url")
    @classmethod
    def force_asyncpg_driver(cls, v: str) -> str:
        # Railway hands out postgresql:// (or legacy postgres://); async SQLAlchemy
        # requires the +asyncpg driver to be named explicitly in the URL.
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v


settings = Settings()
