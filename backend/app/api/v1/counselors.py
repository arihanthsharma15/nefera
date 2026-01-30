# app/api/v1/counselors.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app import models, schemas
from typing import List
from app.db.base import get_db
from app import models
from app.core.deps.auth import require_demo
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/counselors", tags=["counselors"])


# --------------------------------------
# 1) Overall school risk summary
# --------------------------------------
@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["COUNSELOR"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Returns real-time count of students in each risk zone.
    """
    stats = (
        db.query(
            models.StudentProfile.risk_status,
            func.count(models.StudentProfile.id),
        )
        .group_by(models.StudentProfile.risk_status)
        .all()
    )

    data = {status: count for status, count in stats}

    return {
        "green": data.get("GREEN", 0),
        "orange": data.get("ORANGE", 0),
        "red": data.get("RED", 0),
        "crisis": data.get("CRISIS", 0),
    }


# --------------------------------------
# 2) Class-wise risk summary
# --------------------------------------
@router.get("/dashboard/by-class")
def dashboard_by_class(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["COUNSELOR"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Har class ke liye GREEN / ORANGE / RED / CRISIS counts.
    """
    rows = (
        db.query(
            models.Class.id,
            models.Class.name,
            models.StudentProfile.risk_status,
            func.count(models.StudentProfile.id),
        )
        .join(
            models.StudentProfile,
            models.StudentProfile.class_id == models.Class.id,
        )
        .group_by(
            models.Class.id,
            models.Class.name,
            models.StudentProfile.risk_status,
        )
        .all()
    )

    result = {}
    for class_id, class_name, risk_status, count in rows:
        if class_id not in result:
            result[class_id] = {
                "class_id": class_id,
                "class_name": class_name,
                "green": 0,
                "orange": 0,
                "red": 0,
                "crisis": 0,
            }
        key = risk_status.lower()
        if key in result[class_id]:
            result[class_id][key] = count

    return list(result.values())


# --------------------------------------
# 3) Risky students list (ORANGE / RED / CRISIS)
# --------------------------------------
@router.get("/students/risky")
def get_at_risk_students(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["COUNSELOR"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Returns list of students needing attention:
    id, email, class info, risk_status, streak.
    """
    students = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.risk_status.in_(["ORANGE", "RED", "CRISIS"]))
        .all()
    )

    result = []
    for s in students:
        user = s.user
        classroom = s.classroom

        result.append(
            {
                "id": s.id,
                "name": user.full_name if user else None,
                "risk_status": s.risk_status,
                "roll_number": s.roll_number,
                "streak": s.streak_count,
                "email": user.email if user else None,
                "class_id": s.class_id,
                "class_name": classroom.name if classroom else None,
            }
        )
    return result


# --------------------------------------
# 4) Single student detailed view
# --------------------------------------
@router.get("/student/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["COUNSELOR"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Detailed view for one student:
    - identity: email + class
    - risk_status, streak
    - last 14 days moods (date, mood, sleep_hours)
    - recent assessments (type, score, created_at)
    """
    profile = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.id == student_id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    user = profile.user
    classroom = profile.classroom

    # Last 14 days moods
    cutoff = datetime.utcnow() - timedelta(days=14)
    moods = (
        db.query(models.DailyJournal)
        .filter(
            models.DailyJournal.student_id == profile.id,
            models.DailyJournal.date >= cutoff,
        )
        .order_by(models.DailyJournal.date.desc())
        .all()
    )

    recent_moods = [
        {
            "id": e.id,
            "date": e.date,
            "mood": e.mood,
            "sleep_hours": e.sleep_hours,
        }
        for e in moods
    ]

    # Recent assessments (latest 10)
    assessments = (
        db.query(models.Assessment)
        .filter(models.Assessment.student_id == profile.id)
        .order_by(models.Assessment.created_at.desc())
        .limit(10)
        .all()
    )

    assessments_out = [
        {
            "id": a.id,
            "type": a.type,
            "total_score": a.total_score,
            "created_at": a.created_at,
        }
        for a in assessments
    ]

    return {
    "id": profile.id,
    "name": user.full_name if user else None,
    "email": user.email if user else None,
    "roll_number": profile.roll_number,
    "class_name": classroom.name if classroom else None,
    "risk_status": profile.risk_status,
    "streak_count": profile.streak_count,
    "recent_moods": recent_moods,
    "assessments": assessments_out,
}

@router.get("/reports", response_model=List[schemas.IncidentReportOut])
def get_incident_reports_for_counselor(
    db: Session = Depends(get_db),
    _role = Depends(require_demo(ROLES["COUNSELOR"])),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
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