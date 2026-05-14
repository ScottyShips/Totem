import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Artist(Base):
    __tablename__ = "artists"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    genre: Mapped[str | None] = mapped_column(String(100))
    image_url: Mapped[str | None] = mapped_column(String(500))
    spotify_id: Mapped[str | None] = mapped_column(String(64))

    performances: Mapped[list["Performance"]] = relationship(back_populates="artist")


class Performance(Base):
    __tablename__ = "performances"
    __table_args__ = (Index("ix_performances_festival_start_time", "festival_id", "start_time"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    festival_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("festivals.id"), index=True)
    stage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stages.id"), index=True)
    artist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("artists.id"), index=True)
    # Times are nullable so we can seed an announced lineup before set-times are
    # published. UI renders these as "TBD" and conflict logic skips them.
    start_time: Mapped[datetime | None]
    end_time: Mapped[datetime | None]

    festival: Mapped["Festival"] = relationship(back_populates="performances")
    stage: Mapped["Stage"] = relationship(back_populates="performances")
    artist: Mapped["Artist"] = relationship(back_populates="performances")
    schedules: Mapped[list["UserSchedule"]] = relationship(back_populates="performance")
