from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app import models
from app.core.deps.auth import require_demo
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/teachers", tags=["teachers"])

@router.get("/dashboard")
def teacher_class_mood(
    class_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["TEACHER"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["TEACHER"])),
):
    """
    Teacher view: apne class ka mood + risk snapshot.
    NOTE: Abhi class_id query param se aa raha hai
    (later teacher-class mapping se aayega).
    """
    classroom = (
        db.query(models.Class)
        .filter(models.Class.id == class_id)
        .first()
    )
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")

    cutoff = datetime.utcnow() - timedelta(days=days)

    # Mood distribution
    mood_counts = (
        db.query(models.DailyJournal.mood, func.count(models.DailyJournal.id))
        .join(models.StudentProfile, models.StudentProfile.id == models.DailyJournal.student_id)
        .filter(
            models.StudentProfile.class_id == class_id,
            models.DailyJournal.date >= cutoff,
        )
        .group_by(models.DailyJournal.mood)
        .all()
    )

    total = sum(c for _, c in mood_counts) or 1
    mood_distribution = {
        mood: round(count / total * 100, 1) for mood, count in mood_counts
    }

    # Risk zones counts within class
    risk_stats = (
        db.query(models.StudentProfile.risk_status, func.count(models.StudentProfile.id))
        .filter(models.StudentProfile.class_id == class_id)
        .group_by(models.StudentProfile.risk_status)
        .all()
    )
    risk_data = {status: count for status, count in risk_stats}

    return {
        "class_id": class_id,
        "class_name": classroom.name,
        "mood_distribution": mood_distribution,
        "risk_zones": {
            "green": risk_data.get("GREEN", 0),
            "orange": risk_data.get("ORANGE", 0),
            "red": risk_data.get("RED", 0),
            "crisis": risk_data.get("CRISIS", 0),
        },
    }