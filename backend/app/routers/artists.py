import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.performance import Artist
from app.models.user import User
from app.schemas.festival import ArtistSpotifyResponse
from app.services import spotify_service

router = APIRouter(prefix="/artists", tags=["artists"])


@router.get(
    "/{artist_id}/spotify",
    response_model=ArtistSpotifyResponse,
    status_code=status.HTTP_200_OK,
)
async def get_artist_spotify_id(
    artist_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ArtistSpotifyResponse:
    """Returns the Spotify artist ID for the given artist.

    Lazily resolves and caches the ID by hitting Spotify's Search API the first
    time. Subsequent calls return the cached value. If Spotify can't be reached
    or the artist isn't found, returns null — the frontend hides the embed.
    """
    artist = await db.get(Artist, artist_id)
    if artist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artist not found")

    if artist.spotify_id is not None:
        return ArtistSpotifyResponse(spotify_id=artist.spotify_id)

    resolved = await spotify_service.search_artist_id(artist.name)
    if resolved is not None:
        artist.spotify_id = resolved
        await db.commit()
        await db.refresh(artist)

    return ArtistSpotifyResponse(spotify_id=resolved)
