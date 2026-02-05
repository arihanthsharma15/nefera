from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app import models, schemas
from app.core.deps.auth import require_role
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/teachers", tags=["teachers"])

@router.post("/broadcast")
def teacher_broadcast(
    payload: schemas.BroadcastCreate,
    db: Session = Depends(get_db),
    _role = Depends(require_role("TEACHER")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["TEACHER"])),
):
    """
    Teacher sends a message to their class.
    """
    teacher_user = None
    if isinstance(_role, dict) and _role.get("email"):
        teacher_user = db.query(models.User).filter(models.User.email == _role["email"]).first()

    if not teacher_user or not teacher_user.school_id:
        raise HTTPException(status_code=404, detail="Teacher not linked to a school")

    class_id = teacher_user.class_id
    if not class_id:
        # fallback to first class in school
        classroom = db.query(models.Class).filter(models.Class.school_id == teacher_user.school_id).first()
        class_id = classroom.id if classroom else None

    msg = models.BroadcastMessage(
        sender_role=models.UserRole.TEACHER,
        school_id=teacher_user.school_id,
        class_id=class_id,
        student_profile_id=None,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "sender_role": msg.sender_role.value,
        "content": msg.content,
        "created_at": msg.created_at,
    }

@router.get("/dashboard")
def teacher_class_mood(
    class_id: int | None = None,
    days: int = 7,
    db: Session = Depends(get_db),
    _role = Depends(require_role("TEACHER")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["TEACHER"])),
):
    """
    Teacher view: apne class ka mood + risk snapshot.
    NOTE: Abhi class_id query param se aa raha hai
    (later teacher-class mapping se aayega).
    """
    classroom = None
    if class_id is None:
        teacher_user = None
        if isinstance(_role, dict) and _role.get("email"):
            teacher_user = db.query(models.User).filter(models.User.email == _role["email"]).first()
        if teacher_user and teacher_user.class_id:
            classroom = db.query(models.Class).filter(models.Class.id == teacher_user.class_id).first()
    else:
        classroom = db.query(models.Class).filter(models.Class.id == class_id).first()
    if classroom is None:
        classroom = db.query(models.Class).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    class_id = classroom.id

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


@router.get("/students")
def teacher_students(
    class_id: int | None = None,
    db: Session = Depends(get_db),
    _role = Depends(require_role("TEACHER")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["TEACHER"])),
):
    """
    Teacher view: list students for a class.
    NOTE: Abhi class_id query param se aa raha hai
    (later teacher-class mapping se aayega).
    """
    classroom = None
    if class_id is None:
        teacher_user = None
        if isinstance(_role, dict) and _role.get("email"):
            teacher_user = db.query(models.User).filter(models.User.email == _role["email"]).first()
        if teacher_user and teacher_user.class_id:
            classroom = db.query(models.Class).filter(models.Class.id == teacher_user.class_id).first()
    else:
        classroom = db.query(models.Class).filter(models.Class.id == class_id).first()
    if classroom is None:
        classroom = db.query(models.Class).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")

    students = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.class_id == classroom.id)
        .all()
    )

    payload = []
    for student in students:
        user = student.user
        name = None
        if user:
            name = user.full_name or user.email
        if not name:
            name = student.roll_number or f"Student {student.id}"
        payload.append({
            "id": student.id,
            "name": name,
            "roll_number": student.roll_number,
            "class_name": classroom.name,
            "risk_status": student.risk_status,
        })

    return {
        "class_id": classroom.id,
        "class_name": classroom.name,
        "students": payload,
    }
