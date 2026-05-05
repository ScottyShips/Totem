from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await register_user(db, user_in)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await authenticate_user(db, credentials.email, credentials.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )
