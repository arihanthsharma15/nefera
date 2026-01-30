from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
from app import models, schemas
from app.db.base import get_db
from app import models
from app.core.deps.auth import require_demo
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS
from app.schemas import BroadcastCreate, BroadcastOut
from collections import Counter

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

@router.get("/reports", response_model=List[schemas.IncidentReportOut])
def get_incident_reports_for_principal(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["PRINCIPAL"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["PRINCIPAL"])),
):
    
    reports = (
        db.query(models.IncidentReport)
        .join(models.Class, models.IncidentReport.class_id == models.Class.id)
        .order_by(models.IncidentReport.created_at.desc())
        .all()
    )

    result = []
    for r in reports:
        result.append(
            schemas.IncidentReportOut(
                id=r.id,
                incident_type=r.type.value,
                description=r.description,
                status=r.status.value,
                class_name=r.classroom.name if r.classroom else None,
                created_at=r.created_at,
                is_anonymous=(r.student_id is None),
            )
        )
    return result

@router.get("/top-stressors")
def principal_top_stressors(
    days: int = 7,
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["PRINCIPAL"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["PRINCIPAL"])),
):
    """
    Top stressors across the school based on DailyJournal.trigger_tags.
    Looks at last `days` days. 
    trigger_tags is expected to be a JSON array of strings.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Last `days` days ke saare journals
    rows = (
        db.query(models.DailyJournal.trigger_tags)
        .filter(models.DailyJournal.date >= cutoff)
        .all()
    )

    all_tags: list[str] = []

    for (tags,) in rows:
        if not tags:
            continue
        # JSON array case
        if isinstance(tags, list):
            all_tags.extend([str(t).strip() for t in tags if t])
        else:
            # fallback: comma-separated string
            for t in str(tags).split(","):
                t = t.strip()
                if t:
                    all_tags.append(t)

    counts = Counter(all_tags)
    top = [{"tag": tag, "count": count} for tag, count in counts.most_common(5)]

    return {"top_stressors": top}

@router.post("/broadcast", response_model=BroadcastOut)
def principal_broadcast(
    payload: BroadcastCreate,
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["PRINCIPAL"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["PRINCIPAL"])),
):
    """
    Principal sends a message to the whole school (all students of their school).
    For demo: we just pick the first principal user to get school_id.
    """
    principal_user = (
        db.query(models.User)
        .filter(models.User.role == models.UserRole.PRINCIPAL)
        .first()
    )
    if not principal_user or not principal_user.school_id:
        raise HTTPException(status_code=404, detail="No principal with school found")

    msg = models.BroadcastMessage(
        sender_role=models.UserRole.PRINCIPAL,
        school_id=principal_user.school_id,
        class_id=None,
        student_profile_id=None,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return BroadcastOut(
        id=msg.id,
        sender_role=msg.sender_role.value,
        content=msg.content,
        created_at=msg.created_at,
    )