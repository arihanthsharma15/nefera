from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app import models
from app.core.deps.auth import require_demo
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/principal", tags=["principal"])

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["PRINCIPAL"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["PRINCIPAL"])),
):
    """
    Admin view: school-wide risk + mood summary.
    """
    # Risk zones across school
    risk_stats = (
        db.query(models.StudentProfile.risk_status, func.count(models.StudentProfile.id))
        .group_by(models.StudentProfile.risk_status)
        .all()
    )
    risk_data = {status: count for status, count in risk_stats}

    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Mood distribution across school
    mood_stats = (
        db.query(models.DailyJournal.mood, func.count(models.DailyJournal.id))
        .filter(models.DailyJournal.date >= seven_days_ago)
        .group_by(models.DailyJournal.mood)
        .all()
    )
    total_moods = sum(c for _, c in mood_stats) or 1
    mood_distribution = {
        mood: round(count / total_moods * 100, 1) for mood, count in mood_stats
    }

    return {
        "risk_zones": {
            "green": risk_data.get("GREEN", 0),
            "orange": risk_data.get("ORANGE", 0),
            "red": risk_data.get("RED", 0),
            "crisis": risk_data.get("CRISIS", 0),
        },
        "mood_distribution": mood_distribution,
    }