from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app import models
from app.core.deps.auth import require_demo
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/parents", tags=["parents"])

@router.get("/dashboard")
def parent_dashboard(
    days: int = 7,
    db: Session = Depends(get_db),
    _payload = Depends(require_demo(ROLES["PARENT"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["PARENT"])),
):
    """
    Parent view: shows ONLY their linked child's snapshot.
    For prototype: picks the first parent user in DB and their first child.
    """

    # 1) Get some parent user (for demo we just pick the first)
    parent_user = (
        db.query(models.User)
        .filter(models.User.role == models.UserRole.PARENT)
        .first()
    )

    if not parent_user:
        raise HTTPException(status_code=404, detail="No parent user found")

    if not parent_user.children:
        raise HTTPException(status_code=404, detail="No linked children for this parent")

    # 2) Take the first linked child (student_profile)
    student = parent_user.children[0]
    classroom = student.classroom

    cutoff = datetime.utcnow() - timedelta(days=days)

    # 3) Mood distribution for this child
    mood_counts = (
        db.query(models.DailyJournal.mood, func.count(models.DailyJournal.id))
        .filter(
            models.DailyJournal.student_id == student.id,
            models.DailyJournal.date >= cutoff,
        )
        .group_by(models.DailyJournal.mood)
        .all()
    )

    total = sum(c for _, c in mood_counts) or 1
    mood_distribution = {
        mood: round(count / total * 100, 1) for mood, count in mood_counts
    }


    internal_risk = student.risk_status

    # Parent-facing mapping
    if internal_risk == "CRISIS":
        display_risk = "CONTACT_SCHOOL"  # frontend: "Please contact school counselor"
    else:
        display_risk = internal_risk

    return {
        "student_id": student.id,
        "class_name": classroom.name if classroom else None,
        "risk_status": display_risk,
        "streak_count": student.streak_count,
        "mood_distribution": mood_distribution,
        "risk_status_note": (
        "Risk status is calculated mainly from the child's private journal entries "
        "If you see 'CONTACT_SCHOOL', please reach out to the school counselor for more information and support."
    ),
    }