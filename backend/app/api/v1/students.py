# app/api/v1/students.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.base import get_db
from app import models, schemas
from app.core.scoring import calculate_phq9, calculate_gad7, update_student_risk_profile
from app.core.deps.auth import require_student  # ✅ Supabase-based student auth
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/students", tags=["students"])


def _get_current_student_profile(db: Session, payload: dict) -> models.StudentProfile:
    """
    Supabase JWT se payload aata hai; us se DB ka student_profile nikalenge.
    Abhi simplest: email se map kar (ensure karo Supabase aur DB mein email same hai).
    """
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token (no email)")

    user = db.query(models.User).filter(
        models.User.email == email,
        models.User.role == models.UserRole.STUDENT
    ).first()

    if not user or not user.student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return user.student_profile


@router.post("/checkin", response_model=schemas.CheckinResponse)
def create_daily_checkin(
    checkin: schemas.CheckinCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),   # 🔑 Only valid Supabase student token allowed
):
    # 1. Student profile nikaal
    profile = _get_current_student_profile(db, payload)

    # 2. Entry save kar
    entry = models.DailyJournal(
        student_id=profile.id,
        mood=checkin.mood,
        sleep_hours=checkin.sleep_hours,
        checkin_data=checkin.checkin_data,
        journal_text=checkin.journal_text,
    )
    db.add(entry)
    profile.streak_count += 1
    db.commit()
    db.refresh(entry)

    # 3. Risk engine background mein
    background_tasks.add_task(update_student_risk_profile, db, profile.id)

    # 4. Frontend ko friendly message + tool
    message = "Thanks for checking in."
    tool = None

    if checkin.mood == "HAPPY":
        message = "🎉 Awesome day! Noticing good moments helps your brain."
    elif checkin.mood == "WORRIED":
        message = "Brave sharing your worries."
        tool = "Breathing: Inhale nose 1-2-3, exhale mouth 1-2-3-4, do 3 times."
    elif checkin.mood == "SAD":
        message = "Your feelings matter. You are not alone."
        tool = "Hand on heart, hug arms, 3 slow deep breaths."
    elif checkin.mood == "FLAT":
        message = "Low energy days are normal."
        tool = "Stand, stretch arms high, 3 deep breaths."

    return schemas.CheckinResponse(message=message, coping_tool=tool)


@router.post("/assessment", response_model=schemas.AssessmentResponse)
def submit_assessment(
    assessment: schemas.AssessmentCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),   # 🔑 Again, only that student
):
    profile = _get_current_student_profile(db, payload)

    # 1. Score calculate
    if assessment.type == "PHQ9":
        score, risk_level, is_alert = calculate_phq9(assessment.answers)
    elif assessment.type == "GAD7":
        score, risk_level, is_alert = calculate_gad7(assessment.answers)
    else:
        raise HTTPException(status_code=400, detail="Invalid assessment type")

    # 2. Save DB
    record = models.Assessment(
        student_id=profile.id,
        type=assessment.type,
        total_score=score,
        answers=assessment.answers,
        is_alert=is_alert,
    )
    db.add(record)

    # 3. Risk escalate agar needed
    if is_alert or risk_level in ["RED", "CRISIS"]:
        # CRISIS → counselor dashboard mein dikhega (already risk_status field hai profile mein)
        profile.risk_status = "CRISIS" if is_alert else "RED"

    db.commit()

    return schemas.AssessmentResponse(
        score=score,
        risk_level=risk_level,
        alert_triggered=is_alert,
    )

@router.get("/journals", response_model=List[schemas.JournalEntryOut])
def get_my_journals(
    days: int = 14,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """
    Current student ke last `days` journals.
    Default: 14 din.
    Return: sirf date, mood, sleep_hours (journal_text nahi).
    """
    profile = _get_current_student_profile(db, payload)

    cutoff = datetime.utcnow() - timedelta(days=days)

    entries = (
        db.query(models.DailyJournal)
        .filter(
            models.DailyJournal.student_id == profile.id,
            models.DailyJournal.date >= cutoff,
        )
        .order_by(models.DailyJournal.date.desc())
        .all()
    )

    # Manual mapping (orm_mode ke bina)
    result = []
    for e in entries:
        raw = e.checkin_data or {}
        if not isinstance(raw, dict):
            raw = {}

        triggers = raw.get("triggers")
        # ensure triggers is a list or None
        if isinstance(triggers, str):
            triggers = [triggers]
        elif triggers is None:
            triggers = None

        notes = raw.get("notes")

        result.append(
            schemas.JournalEntryOut(
                id=e.id,
                date=e.date,
                mood=e.mood,
                sleep_hours=e.sleep_hours,
                journal_text=e.journal_text,
                triggers=triggers,
                notes=notes,
            )
        )

    return result

@router.get("/assessments/history", response_model=List[schemas.AssessmentHistoryOut])
def get_my_assessment_history(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """
    Current student ke saare assessments (PHQ9, GAD7),
    latest first.
    """
    profile = _get_current_student_profile(db, payload)

    assessments = (
        db.query(models.Assessment)
        .filter(models.Assessment.student_id == profile.id)
        .order_by(models.Assessment.created_at.desc())
        .all()
    )

    return [
        schemas.AssessmentHistoryOut(
            id=a.id,
            type=a.type,
            total_score=a.total_score,
            created_at=a.created_at,
        )
        for a in assessments
    ]