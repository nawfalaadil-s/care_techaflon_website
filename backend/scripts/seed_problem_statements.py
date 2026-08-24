"""Seed the 3 starter problem statements (idempotent by title)."""

import os
import sys
import uuid
from pathlib import Path

os.environ.setdefault("DEBUG", "false")
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text

from app.database.base import SessionLocal

STATEMENTS = [
    (
        "Doomsday Supply Grid",
        "Build an AI allocation engine that rations critical supplies during a simulated citywide collapse.",
        "Teams design a forecasting + optimization service that predicts shortage hotspots from live feeds and reallocates limited supply convoys. Judged on prediction accuracy, constraint handling, and the clarity of the operator dashboard.",
        "ai-ml", "hard",
    ),
    (
        "Shelter Status Network",
        "A real-time web platform tracking capacity, resources, and safety of survivor shelters.",
        "Create a responsive web app where shelter coordinators post live capacity and resource data, survivors search safe locations, and organizers view a city-wide heat map. Offline-first behavior and accessibility are scored.",
        "web", "medium",
    ),
    (
        "Last Signal",
        "A mobile companion app that keeps teams coordinated when infrastructure fails.",
        "Build an Android/iOS app with mesh-style check-ins, low-bandwidth messaging, and battery-aware location pings so rescue squads stay synced. Reliability under poor connectivity is the core challenge.",
        "app", "medium",
    ),
]

db = SessionLocal()
try:
    existing = {
        row[0]
        for row in db.execute(text("SELECT title FROM problem_statements"))
    }
    added = 0
    for title, summary, description, track, difficulty in STATEMENTS:
        if title in existing:
            continue
        db.execute(
            text(
                "INSERT INTO problem_statements"
                " (id, title, summary, description, track, difficulty,"
                "  sponsor, published)"
                " VALUES (:id, :title, :summary, :description, :track,"
                "         :difficulty, NULL, true)"
            ),
            {
                "id": str(uuid.uuid4()),
                "title": title,
                "summary": summary,
                "description": description,
                "track": track,
                "difficulty": difficulty,
            },
        )
        added += 1
    db.commit()
    n = db.execute(text("SELECT count(*) FROM problem_statements")).scalar()
    print(f"added {added}, total now {n}")
finally:
    db.close()
