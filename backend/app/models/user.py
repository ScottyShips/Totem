import uuid
from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    display_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    groups_created: Mapped[list["Group"]] = relationship(back_populates="creator")
    group_memberships: Mapped[list["GroupMember"]] = relationship(back_populates="user")
    schedules: Mapped[list["UserSchedule"]] = relationship(back_populates="user")
    invitations_sent: Mapped[list["Invitation"]] = relationship(back_populates="invited_by_user")
