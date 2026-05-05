"""
Electric Forest 2026 seed script.

IMPORTANT: This script uses placeholder lineup data. Once the official EF 2026
lineup and set times are published at electricforestfestival.com, replace the
ARTISTS and PERFORMANCES lists with real data before any production use.

Times are naive datetimes representing Eastern Daylight Time (UTC-4).
Run from the backend/ directory: python seed.py
"""

import asyncio
import sys
from datetime import date, datetime

from loguru import logger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.festival import Festival, Stage
from app.models.performance import Artist, Performance


FESTIVAL = {
    "name": "Electric Forest 2026",
    "location": "Double JJ Ranch, Rothbury, MI",
    "start_date": date(2026, 6, 25),
    "end_date": date(2026, 6, 28),
    "slug": "electric-forest-2026",
}

STAGES = [
    {"name": "Sherwood Court", "description": "The iconic main stage in the heart of Sherwood Forest"},
    {"name": "Tripolee", "description": "Outdoor EDM stage with elaborate light installations"},
    {"name": "Ranch Arena", "description": "Large outdoor amphitheater in the open ranch field"},
    {"name": "Village Stage", "description": "Intimate stage nestled in the festival village"},
    {"name": "Observatory", "description": "Indoor stage for late-night and electronic acts"},
    {"name": "Hangar Stage", "description": "Indoor stage featuring a mix of jam, funk, and electronic"},
]

ARTISTS = [
    {"name": "Odesza", "genre": "Electronic"},
    {"name": "GRiZ", "genre": "Electronic/Funk"},
    {"name": "Tipper", "genre": "Electronic"},
    {"name": "STS9", "genre": "Electronic/Jam"},
    {"name": "Umphrey's McGee", "genre": "Jam/Rock"},
    {"name": "Big Gigantic", "genre": "Electronic/Jazz"},
    {"name": "Gramatik", "genre": "Electronic/Hip-Hop"},
    {"name": "Lettuce", "genre": "Funk/Soul"},
    {"name": "String Cheese Incident", "genre": "Jam/Bluegrass"},
    {"name": "Dirtwire", "genre": "Electronic/Worldbeat"},
    {"name": "Pretty Lights", "genre": "Electronic"},
    {"name": "Papadosio", "genre": "Electronic/Jam"},
    {"name": "Thievery Corporation", "genre": "Electronic/Dub"},
    {"name": "Twiddle", "genre": "Jam/Rock"},
    {"name": "Keller Williams", "genre": "Acoustic/Jam"},
]

# (artist_name, stage_name, start_time, end_time) — all times Eastern Daylight Time
PERFORMANCES = [
    # Thursday June 25 — opening day
    ("Keller Williams",         "Village Stage",   datetime(2026, 6, 25, 14,  0), datetime(2026, 6, 25, 15, 30)),
    ("Dirtwire",                "Village Stage",   datetime(2026, 6, 25, 16,  0), datetime(2026, 6, 25, 17, 30)),
    ("Umphrey's McGee",         "Ranch Arena",     datetime(2026, 6, 25, 17,  0), datetime(2026, 6, 25, 19,  0)),
    ("Gramatik",                "Tripolee",        datetime(2026, 6, 25, 18,  0), datetime(2026, 6, 25, 20,  0)),
    ("String Cheese Incident",  "Sherwood Court",  datetime(2026, 6, 25, 19,  0), datetime(2026, 6, 25, 21,  0)),
    ("GRiZ",                    "Tripolee",        datetime(2026, 6, 25, 20,  0), datetime(2026, 6, 25, 22,  0)),
    ("Twiddle",                 "Hangar Stage",    datetime(2026, 6, 25, 22,  0), datetime(2026, 6, 26,  0,  0)),
    ("Tipper",                  "Observatory",     datetime(2026, 6, 25, 23,  0), datetime(2026, 6, 26,  1, 30)),

    # Friday June 26
    ("String Cheese Incident",  "Ranch Arena",     datetime(2026, 6, 26, 15,  0), datetime(2026, 6, 26, 17,  0)),
    ("Lettuce",                 "Hangar Stage",    datetime(2026, 6, 26, 16,  0), datetime(2026, 6, 26, 18,  0)),
    ("Papadosio",               "Village Stage",   datetime(2026, 6, 26, 17, 30), datetime(2026, 6, 26, 19, 30)),
    ("Gramatik",                "Tripolee",        datetime(2026, 6, 26, 17,  0), datetime(2026, 6, 26, 19,  0)),
    ("Big Gigantic",            "Ranch Arena",     datetime(2026, 6, 26, 18,  0), datetime(2026, 6, 26, 20,  0)),
    ("Tipper",                  "Observatory",     datetime(2026, 6, 26, 19,  0), datetime(2026, 6, 26, 21, 30)),
    ("Odesza",                  "Sherwood Court",  datetime(2026, 6, 26, 20,  0), datetime(2026, 6, 26, 22,  0)),
    ("STS9",                    "Tripolee",        datetime(2026, 6, 26, 21,  0), datetime(2026, 6, 26, 23,  0)),

    # Saturday June 27
    ("Thievery Corporation",    "Village Stage",   datetime(2026, 6, 27, 15,  0), datetime(2026, 6, 27, 17,  0)),
    ("Keller Williams",         "Observatory",     datetime(2026, 6, 27, 17,  0), datetime(2026, 6, 27, 19,  0)),
    ("Gramatik",                "Ranch Arena",     datetime(2026, 6, 27, 18,  0), datetime(2026, 6, 27, 20,  0)),
    ("Umphrey's McGee",         "Hangar Stage",    datetime(2026, 6, 27, 21,  0), datetime(2026, 6, 27, 23,  0)),
    ("GRiZ",                    "Sherwood Court",  datetime(2026, 6, 27, 20,  0), datetime(2026, 6, 27, 22,  0)),
    ("STS9",                    "Ranch Arena",     datetime(2026, 6, 27, 23,  0), datetime(2026, 6, 28,  1,  0)),
    ("Pretty Lights",           "Sherwood Court",  datetime(2026, 6, 28,  1,  0), datetime(2026, 6, 28,  3,  0)),
    ("Tipper",                  "Tripolee",        datetime(2026, 6, 28,  2,  0), datetime(2026, 6, 28,  4,  0)),

    # Sunday June 28 — closing day
    ("Lettuce",                 "Village Stage",   datetime(2026, 6, 28, 16,  0), datetime(2026, 6, 28, 18,  0)),
    ("Twiddle",                 "Hangar Stage",    datetime(2026, 6, 28, 17, 30), datetime(2026, 6, 28, 19, 30)),
    ("Big Gigantic",            "Tripolee",        datetime(2026, 6, 28, 19,  0), datetime(2026, 6, 28, 21,  0)),
    ("Papadosio",               "Observatory",     datetime(2026, 6, 28, 20, 30), datetime(2026, 6, 28, 22, 30)),
    ("Odesza",                  "Ranch Arena",     datetime(2026, 6, 28, 20,  0), datetime(2026, 6, 28, 22,  0)),
    ("String Cheese Incident",  "Sherwood Court",  datetime(2026, 6, 28, 23, 30), datetime(2026, 6, 29,  2,  0)),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Festival).where(Festival.slug == FESTIVAL["slug"]))
        if existing.scalar_one_or_none() is not None:
            logger.info("Festival '{}' already exists — skipping seed", FESTIVAL["slug"])
            return

        festival = Festival(**FESTIVAL)
        db.add(festival)
        await db.flush()
        logger.info("Inserted festival: {}", festival.name)

        stage_map: dict[str, Stage] = {}
        for stage_data in STAGES:
            stage = Stage(festival_id=festival.id, **stage_data)
            db.add(stage)
            stage_map[stage_data["name"]] = stage
        await db.flush()
        logger.info("Inserted {} stages", len(stage_map))

        artist_map: dict[str, Artist] = {}
        for artist_data in ARTISTS:
            artist = Artist(**artist_data)
            db.add(artist)
            artist_map[artist_data["name"]] = artist
        await db.flush()
        logger.info("Inserted {} artists", len(artist_map))

        for artist_name, stage_name, start_time, end_time in PERFORMANCES:
            performance = Performance(
                festival_id=festival.id,
                stage_id=stage_map[stage_name].id,
                artist_id=artist_map[artist_name].id,
                start_time=start_time,
                end_time=end_time,
            )
            db.add(performance)

        await db.commit()
        logger.info("Inserted {} performances — seed complete", len(PERFORMANCES))


if __name__ == "__main__":
    asyncio.run(seed())
