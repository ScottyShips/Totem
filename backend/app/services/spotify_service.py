import asyncio
import base64
import time
from dataclasses import dataclass

import httpx
from loguru import logger

from app.core.config import settings

TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = "https://api.spotify.com/v1/search"
TOKEN_REFRESH_BUFFER_S = 60  # refresh slightly before expiry


@dataclass
class _CachedToken:
    access_token: str
    expires_at: float  # epoch seconds


_token: _CachedToken | None = None
_token_lock = asyncio.Lock()


def _credentials_configured() -> bool:
    return bool(settings.spotify_client_id and settings.spotify_client_secret)


async def _fetch_token() -> _CachedToken:
    auth_value = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            TOKEN_URL,
            headers={
                "Authorization": f"Basic {auth_value}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
        )
    response.raise_for_status()
    payload = response.json()
    return _CachedToken(
        access_token=payload["access_token"],
        expires_at=time.time() + int(payload["expires_in"]) - TOKEN_REFRESH_BUFFER_S,
    )


async def _get_access_token() -> str | None:
    if not _credentials_configured():
        return None

    global _token
    async with _token_lock:
        if _token is None or time.time() >= _token.expires_at:
            try:
                _token = await _fetch_token()
            except Exception as exc:
                logger.error(f"Spotify token fetch failed: {exc}")
                _token = None
                return None
    return _token.access_token


def _pick_best_match(query: str, items: list[dict]) -> dict | None:
    if not items:
        return None
    needle = query.strip().lower()
    for item in items:
        if item.get("name", "").strip().lower() == needle:
            return item
    return items[0]


async def search_artist_id(name: str) -> str | None:
    """Returns the Spotify artist ID for the given name, or None if not found
    or if the API is unreachable. Prefers exact (case-insensitive) name match;
    falls back to top result by Spotify popularity.
    """
    if not name or not name.strip():
        return None

    token = await _get_access_token()
    if token is None:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                SEARCH_URL,
                headers={"Authorization": f"Bearer {token}"},
                params={"q": name, "type": "artist", "limit": 5},
            )
        response.raise_for_status()
    except Exception as exc:
        logger.warning(f"Spotify search failed for {name!r}: {exc}")
        return None

    items = response.json().get("artists", {}).get("items", [])
    match = _pick_best_match(name, items)
    return match.get("id") if match else None
