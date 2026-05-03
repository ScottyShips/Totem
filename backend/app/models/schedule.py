import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserSchedule(Base):
    __tablename__ = "user_schedules"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "performance_id", "group_festival_id",
            name="uq_user_schedules_user_perf_gf",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    group_festival_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("group_festivals.id"), index=True)
    performance_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("performances.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="schedules")
    group_festival: Mapped["GroupFestival"] = relationship(back_populates="schedules")
    performance: Mapped["Performance"] = relationship(back_populates="schedules")
