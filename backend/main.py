from fastapi import FastAPI

app = FastAPI(
    title="Totem API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
