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

# Artists grouped by their announced festival day. Spellings re-verified against
# the cropped per-day poster strips and cross-referenced with Jambase's
# canonical A-Z lineup (jambase.com/festival/electric-forest-2026). A handful of
# small-text names are still my best read of the poster and may need verification
# (HEDEX, All Go Collective, Liam Goldfish — these don't appear in Jambase's
# canonical list but I read them clearly off the poster crop).
LINEUP: dict[date, list[str]] = {
    date(2026, 6, 25): [
        "ALLEYCVT",
        "ALL:LO Collective",
        "Bardo",
        "Bipolar Sunshine",
        "Close Friends Only",
        "Daniel Allan",
        "Devault",
        "Disco Lines",
        "Dixon's Violin",
        "D.O.D.",
        "Effin",
        "Eggy",
        "Eli Brown",
        "Excision",
        "Ganja White Night",
        "HERSHE",
        "Jackie Hollander",
        "Jkyl & Hyde",
        "LSD Clownsystem",
        "Magoo",
        "MCR-T",
        "Midnight Generation",
        "Night Tapes",
        "Odd Mob",
        "ProbCause",
        "SHIMA",
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
        "GRiZ",
        "Iniko",
        "Ivy Lab",
        "Kaleena Zanders",
        "Łaszewo",
        "Levity",
        "Mild Minds",
        "Motifv",
        "MUZZ",
        "Nikita The Wicked",
        "Nitepunk",
        "Passion Pit",
        "Purple Disco Machine",
        "Ranger Trucco",
        "Richard Finger",
        "Saint Ludo",
        "Sammy Virji",
        "SBTRKT",
        "Ship Wrek",
        "SIDEPIECE",
        "Supertaste",
        "Swimming Paul",
        "The Flints",
        "Wilkinson",
    ],
    date(2026, 6, 27): [
        "Avello",
        "Cain Culto",
        "Capochino",
        "Channel Tres",
        "Chmura",
        "Chris Lake",
        "Costa",
        "DJ Diesel B2B T-Pain (Bass DJ Set)",
        "EOTO",
        "HEYZ",
        "INJI",
        "jigitz",
        "Kai Wachi",
        "Lyrah",
        "Madeon",
        "Ravenscoon",
        "Rio Kosta",
        "Riot",
        "Rochelle Jordan",
        "Sam Gellaitry",
        "Shpongle (Simon Posford Live)",
        "SIPPY",
        "Snow Wife",
        "Starjunk 95",
        "Steller",
        "Sullivan King",
        "The Sponges",
        "The String Cheese Incident (2 Sets)",
        "Tiffany Day",
        "Tourist",
        "Vandelux",
        "Whethan",
    ],
    date(2026, 6, 28): [
        "Bob Moses (Club Set)",
        "Bombargo",
        "Bricknasty",
        "Chris Luno",
        "Daniel Donato's Cosmic Country",
        "Deadtronica",
        "Frost Children",
        "GRiZ Chasing The Golden Hour",
        "Illenium",
        "Jean Dawson",
        "Kaskade",
        "Lane 8",
        "LSDREAM",
        "LIGHTCODE",
        "Mary Droppinz",
        "MPH",
        "OMNOM",
        "Oppidan",
        "Qrion",
        "River Tiber",
        "Underscores",
        "Vincent Antone",
        "Wax Monkey",
        "Wes Mills",
        "Wooli",
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
