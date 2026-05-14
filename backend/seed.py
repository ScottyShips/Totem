"""Electric Forest 2026 seed script.

Source: official Electric Forest 2026 lineup announcement poster.
Festival dates: June 25–28, 2026 at Double JJ Ranch, Rothbury, MI.

Set times have NOT been released. Each performance is seeded with:
  - start_time = noon on the announced day (placeholder so we can group by day)
  - end_time   = None (signals "Time TBD" to the UI)

The UI checks `end_time is None` and renders "Time TBD"; conflict detection
skips performances with null times. When the official schedule drops, re-run
this script with real `(start, end)` tuples per artist.

Stage assignments: until set times are published the venue's stage map for
each act is unknown, so every act is assigned to a single placeholder stage
("Stage TBA"). The real EF stage list is retained below so reassigning later
is just `STAGE_BY_ARTIST` edits.

Running:
  python seed.py

The script is idempotent in the sense that re-running wipes the prior lineup
(performances, stages, artists for this festival) and re-inserts the current
one. Group-festival links and user accounts are preserved; user_schedules
tied to the wiped performances are dropped since the performances no longer
exist.
"""

import asyncio
from datetime import date, datetime

from loguru import logger
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.festival import Festival, Stage
from app.models.performance import Artist, Performance
from app.models.schedule import UserSchedule


FESTIVAL = {
    "name": "Electric Forest 2026",
    "location": "Double JJ Ranch, Rothbury, MI",
    "start_date": date(2026, 6, 25),
    "end_date": date(2026, 6, 28),
    "slug": "electric-forest-2026",
}

# Real EF stages. Until set times are announced, no act is assigned to one of
# these — everyone goes on STAGE_TBA. Keeping the real list here means a future
# update only needs to edit the per-artist stage assignment, not reinvent stages.
STAGES = [
    {"name": "Sherwood Court", "description": "The iconic main stage in the heart of Sherwood Forest"},
    {"name": "Tripolee", "description": "Outdoor EDM stage with elaborate light installations"},
    {"name": "Ranch Arena", "description": "Large outdoor amphitheater in the open ranch field"},
    {"name": "Village Stage", "description": "Intimate stage nestled in the festival village"},
    {"name": "Observatory", "description": "Indoor stage for late-night and electronic acts"},
    {"name": "Hangar Stage", "description": "Indoor stage featuring a mix of jam, funk, and electronic"},
]

STAGE_TBA = {"name": "Stage TBA", "description": "Stage assignment will be announced when set times are released"}

# Artists grouped by their announced festival day. Spellings transcribed from
# the lineup poster; some smaller-text names may need correction once the
# official site publishes them in canonical form.
LINEUP: dict[date, list[str]] = {
    date(2026, 6, 25): [
        "ALLEYCVT",
        "Allgo Collective",
        "Bardo",
        "Bipolar Sunshine",
        "Close Friends Only",
        "Daniel Allan",
        "Devault",
        "Disco Lines",
        "Dixon's Violin",
        "D.O.D.",
        "EFFIN",
        "Eggy",
        "Eli Brown",
        "Excision",
        "Ganja White Night",
        "HEDEX",
        "Jackie Hollander",
        "Jk's & Hyde",
        "LSD Clownsystem",
        "Maggd",
        "MCR-T",
        "Midnight Generation",
        "Night Tapes",
        "Odd Mob",
        "ProbCause",
        "SMNM",
        "Westend",
    ],
    date(2026, 6, 26): [
        "Andy C",
        "Brunello",
        "Casey Club",
        "Couch",
        "Creg",
        "Daily Bread",
        "Dogs In A Pile",
        "Galantis",
        "Grey",
        "Iniko",
        "Ivy Lab",
        "Kaleena Zanders",
        "Lazerdai",
        "Levity",
        "Mild Minds",
        "Muzz",
        "Nikita The Wicked",
        "Nitepunk",
        "Passion Pit",
        "Purple Disco Machine",
        "Ranger Trucco",
        "Richard Finger",
        "Saint Ludo",
        "Sammy Virji",
        "Sertryc",
        "Ship Wrek",
        "Sidepiece",
        "Superstate",
        "Swimming Paul",
        "The Flints",
        "Wilkinson",
    ],
    date(2026, 6, 27): [
        "Avello",
        "Can Culto",
        "Carochino",
        "Channel Tres",
        "Chiwura",
        "Chris Lake",
        "Costa",
        "DJ Diesel B2B 7Hain (Bass DJ Set)",
        "EOTG",
        "Heyz",
        "Hugo",
        "Jigitz",
        "Kai Wachi",
        "Lyrah",
        "Madeon",
        "Ravenscoon",
        "Rio Kosta",
        "Riot",
        "Rochelle Jordan",
        "Sam Gellaitry",
        "Shpongle's Simon Posford (Live)",
        "Sirpy",
        "Snow Wife",
        "Starjunk 95",
        "Steller",
        "Sullivan King",
        "The Sponges",
        "The String Cheese Incident (2 Sets)",
        "Tiffany Day",
        "Topsy",
        "Vandelux",
        "Whethan",
    ],
    date(2026, 6, 28): [
        "Bob Moses (Club Set)",
        "Bombardo",
        "Bricknasty",
        "Chris Lund",
        "Daniel Donato's Cosmic Country",
        "Deadtronica",
        "Frost Children",
        "GRiZ Chasing The Golden Hour",
        "Illenium",
        "Jean Dawson",
        "Kaskade",
        "Lane 8",
        "Leeroxx",
        "Liam Goldfish",
        "Mary Droppinz",
        "MPM",
        "ONMOM",
        "Opiuon",
        "Orion",
        "River Tiber",
        "Underscores",
        "Vincent Antone",
        "Wax Movies",
        "Wes Mills",
        "Widoji",
        "Yaeji",
    ],
}


async def _wipe_existing_lineup(db: AsyncSession, festival: Festival) -> None:
    """Drop performances, stages, and orphaned artists for the given festival.

    Preserves the Festival row itself and any GroupFestival links so user-created
    groups stay attached. user_schedules tied to the deleted performances are
    cascade-removed manually first to satisfy FK constraints.
    """
    perf_ids_result = await db.execute(
        select(Performance.id).where(Performance.festival_id == festival.id)
    )
    perf_ids = [row[0] for row in perf_ids_result.all()]

    if perf_ids:
        await db.execute(
            delete(UserSchedule).where(UserSchedule.performance_id.in_(perf_ids))
        )
        await db.execute(
            delete(Performance).where(Performance.id.in_(perf_ids))
        )
        logger.info("Deleted {} performances and their schedule entries", len(perf_ids))

    await db.execute(delete(Stage).where(Stage.festival_id == festival.id))
    logger.info("Deleted stages for festival")

    # Drop artists that no longer have any performances. This avoids the artist
    # table accumulating dead rows on every reseed.
    referenced_subq = select(Performance.artist_id).distinct().scalar_subquery()
    await db.execute(delete(Artist).where(~Artist.id.in_(referenced_subq)))
    logger.info("Pruned orphan artists")

    await db.flush()


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(Festival).where(Festival.slug == FESTIVAL["slug"])
        )
        festival = existing.scalar_one_or_none()

        if festival is None:
            festival = Festival(**FESTIVAL)
            db.add(festival)
            await db.flush()
            logger.info("Created festival: {}", festival.name)
        else:
            logger.info("Festival '{}' exists — wiping prior lineup", FESTIVAL["slug"])
            await _wipe_existing_lineup(db, festival)
            festival.name = FESTIVAL["name"]
            festival.location = FESTIVAL["location"]
            festival.start_date = FESTIVAL["start_date"]
            festival.end_date = FESTIVAL["end_date"]
            await db.flush()

        stage_map: dict[str, Stage] = {}
        for stage_data in [*STAGES, STAGE_TBA]:
            stage = Stage(festival_id=festival.id, **stage_data)
            db.add(stage)
            stage_map[stage_data["name"]] = stage
        await db.flush()
        logger.info("Inserted {} stages", len(stage_map))

        tba_stage = stage_map[STAGE_TBA["name"]]

        total_performances = 0
        artist_map: dict[str, Artist] = {}
        for day, artist_names in LINEUP.items():
            # Noon placeholder on the announced day — exact time is unknown but we
            # need a day-anchor so the UI can group acts under their day heading.
            start_anchor = datetime(day.year, day.month, day.day, 12, 0)
            for name in artist_names:
                if name not in artist_map:
                    artist = Artist(name=name)
                    db.add(artist)
                    artist_map[name] = artist
                else:
                    artist = artist_map[name]
            await db.flush()

            for name in artist_names:
                db.add(
                    Performance(
                        festival_id=festival.id,
                        stage_id=tba_stage.id,
                        artist_id=artist_map[name].id,
                        start_time=start_anchor,
                        end_time=None,
                    )
                )
                total_performances += 1

        await db.commit()
        logger.info(
            "Inserted {} artists across {} performances — seed complete",
            len(artist_map),
            total_performances,
        )


if __name__ == "__main__":
    asyncio.run(seed())
