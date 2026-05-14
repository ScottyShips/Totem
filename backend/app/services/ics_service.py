"""iCalendar (RFC 5545) generation for festival schedule export.

Hand-rolled because our needs are limited (single VCALENDAR, simple VEVENTs)
and a dedicated library would add a dependency for ~30 lines of work.

Times are emitted in UTC (Z suffix) — assumes performance datetimes are
stored in UTC, matching the frontend's `new Date(iso).toLocaleTimeString()`
convention which already treats them as UTC.
"""
from datetime import datetime, timezone

from app.models.festival import Festival
from app.models.schedule import UserSchedule

PRODID = "-//Totem//Festival Schedule//EN"


def _escape(value: str) -> str:
    """Escape ICS text per RFC 5545 §3.3.11."""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _format_dt(dt: datetime) -> str:
    """Format as UTC basic-format datetime: YYYYMMDDTHHMMSSZ."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def build_ics(festival: Festival, attending_schedules: list[UserSchedule]) -> str:
    """Build an iCalendar string containing one VEVENT per attending performance.

    Each schedule entry must have its `performance` (with `artist` and `stage`)
    eagerly loaded; this function does no DB access.
    """
    now = _format_dt(datetime.now(timezone.utc))
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape(festival.name)} (Totem)",
    ]

    for entry in attending_schedules:
        perf = entry.performance
        # Skip performances without scheduled times — they're TBD and can't
        # become valid VEVENTs. Calendar apps reject events with no DTSTART.
        if perf.start_time is None or perf.end_time is None:
            continue
        artist_name = perf.artist.name
        stage_name = perf.stage.name
        location = f"{stage_name} · {festival.location}"
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{perf.id}@usetotem.app",
                f"DTSTAMP:{now}",
                f"DTSTART:{_format_dt(perf.start_time)}",
                f"DTEND:{_format_dt(perf.end_time)}",
                f"SUMMARY:{_escape(artist_name)}",
                f"LOCATION:{_escape(location)}",
                f"DESCRIPTION:{_escape(f'{artist_name} at {stage_name} — {festival.name}')}",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    # RFC 5545 mandates CRLF line endings
    return "\r\n".join(lines) + "\r\n"
