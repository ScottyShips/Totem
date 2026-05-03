import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Festival(Base):
    __tablename__ = "festivals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    stages: Mapped[list["Stage"]] = relationship(back_populates="festival")
    performances: Mapped[list["Performance"]] = relationship(back_populates="festival")
    group_festivals: Mapped[list["GroupFestival"]] = relationship(back_populates="festival")


class GroupFestival(Base):
    __tablename__ = "group_festivals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), index=True)
    festival_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("festivals.id"), index=True)
    linked_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="festivals")
    festival: Mapped["Festival"] = relationship(back_populates="group_festivals")
    schedules: Mapped[list["UserSchedule"]] = relationship(back_populates="group_festival")


class Stage(Base):
    __tablename__ = "stages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    festival_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("festivals.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)

    festival: Mapped["Festival"] = relationship(back_populates="stages")
    performances: Mapped[list["Performance"]] = relationship(back_populates="stage")
