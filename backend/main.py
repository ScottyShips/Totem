from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from loguru import logger
from sqlalchemy import text

from app.core.database import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT 1"))
    logger.info("Database connection verified")
    yield


app = FastAPI(
    title="Totem API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
