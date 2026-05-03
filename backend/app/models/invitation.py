import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), index=True)
    invited_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    phone_number: Mapped[str | None] = mapped_column(String(255))
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20))
    expires_at: Mapped[datetime]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="invitations")
    invited_by_user: Mapped["User"] = relationship(back_populates="invitations_sent")
