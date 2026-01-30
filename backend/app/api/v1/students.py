# app/api/v1/students.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.base import get_db
from app import models, schemas
from app.core.scoring import (
    calculate_phq9,
    calculate_gad7,
    update_student_risk_profile,
    analyze_journal_text,
    create_safety_event,
    calculate_cssrs,
)

from app.core.deps.auth import require_student  # ✅ Supabase-based student auth
from app.core.security.encryption import encrypt_text, decrypt_text
from datetime import datetime, timedelta
from typing import List
from app.core.constants import CHECKIN_TRIGGER_TAGS

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/inbox", response_model=List[schemas.BroadcastOut])
def student_inbox(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """
    Student inbox: messages sent to their school, class, or specifically them.
    For demo: we just pick the first StudentProfile as 'current' student.
    """
    student = db.query(models.StudentProfile).first()
    if not student:
        raise HTTPException(status_code=404, detail="No student profile found")

    user = student.user
    if not user or not user.school_id:
        raise HTTPException(status_code=400, detail="Student not linked to a school")

    school_id = user.school_id
    class_id = student.class_id
    student_id = student.id

    msgs = (
        db.query(models.BroadcastMessage)
        .filter(
            (
                (models.BroadcastMessage.school_id == school_id) &
                (models.BroadcastMessage.class_id.is_(None)) &
                (models.BroadcastMessage.student_profile_id.is_(None))
            )
            |
            (models.BroadcastMessage.class_id == class_id)
            |
            (models.BroadcastMessage.student_profile_id == student_id)
        )
        .order_by(models.BroadcastMessage.created_at.desc())
        .all()
    )

    return [
        schemas.BroadcastOut(
            id=m.id,
            sender_role=m.sender_role.value,
            content=m.content,
            created_at=m.created_at,
        )
        for m in msgs
    ]


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

    raw_triggers = checkin.triggers or []

    # Filter only allowed tags
    valid_triggers = [
        t for t in raw_triggers if t in CHECKIN_TRIGGER_TAGS
    ]

    # Also push them into checkin_data["triggers"] for future analytics
    checkin_data = dict(checkin.checkin_data or {})
    if valid_triggers:
        checkin_data["triggers"] = valid_triggers

    # 2. Journal text analyze + encrypt

    # 🔍 2a) Keyword-based risk analysis on plaintext
    analysis = analyze_journal_text(checkin.journal_text)

    # 🔐 2b) Encrypt journal text before saving to DB
    encrypted_journal = encrypt_text(checkin.journal_text)

    # 2c) Entry save karo with flags
    entry = models.DailyJournal(
        student_id=profile.id,
        mood=checkin.mood,
        sleep_hours=checkin.sleep_hours,
        checkin_data=checkin.checkin_data,
        journal_text=encrypted_journal,
        has_anxiety_terms=analysis["has_anxiety_terms"],
        has_low_mood_terms=analysis["has_low_mood_terms"],
        has_self_worth_terms=analysis["has_self_worth_terms"],
        has_severe_suicidal_terms=analysis["has_severe_suicidal_terms"],
        trigger_tags=valid_triggers or None,
    )
    db.add(entry)
    profile.streak_count += 1
    db.commit()
    db.refresh(entry)

    # 🔴 3. Agar severe suicidal phrase mila hai, to immediate SafetyEvent + CRISIS
    if analysis["has_severe_suicidal_terms"]:
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="JOURNAL_SEVERE",
            risk_band="CRISIS",
            details={
                "matches": analysis["matches"],
                "mood": checkin.mood,
                "source": "daily_checkin",
            },
        )
        # Student ko CRISIS mark karo (update_student_risk_profile ise downgrade nahi karega)
        profile.risk_status = "CRISIS"
        db.commit()

     # 3. Risk engine background mein
    background_tasks.add_task(update_student_risk_profile, db, profile.id)

    # 4. Frontend ko friendly message + tool
    message = "Thanks for checking in."
    tool = None

    # 🔴 Severe text case: override mood-based "awesome day" etc.
    if analysis["has_severe_suicidal_terms"]:
        message = (
            "Thank you for sharing such big and heavy feelings. "
            "You are not alone and you deserve support. "
            "If you can, talk to a trusted grown-up (like a parent, teacher, or school helper) "
            "about how you feel."
        )
        tool = (
            "Try this: put your hand on your heart, take 3 slow deep breaths, "
            "and think of one safe person you could talk to."
        )

    # Agar severe nahi, to normal mood-based messages
    elif checkin.mood == "HAPPY":
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
    elif assessment.type == "CSSRS":
        score, risk_level, is_alert = calculate_cssrs(assessment.answers)
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

      # 3. Safety events + risk escalation

    # 🔴 PHQ-9 Question 9 positive -> safety event
    if assessment.type == "PHQ9" and is_alert:
        q9_score = None
        if len(assessment.answers) >= 9:
            q9_score = assessment.answers[8]

        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="PHQ9_Q9",
            risk_band="CRISIS",   # suicidality side pe crisis
            details={
                "q9_score": q9_score,
                "total_score": score,
                "depression_severity": risk_level,  # e.g. YELLOW
                "type": "PHQ9",
            },
        )

    # 🔴 CSSRS -> safety event for any non-GREEN risk
    if assessment.type == "CSSRS" and risk_level != "GREEN":
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="CSSRS",
            risk_band=risk_level,
            details={
                "answers": assessment.answers,
                "type": "CSSRS",
            },
        )

    # Risk escalation:
    #  - PHQ9:
    #       * is_alert (Q9 > 0)  -> CRISIS
    #       * risk_level RED     -> RED (if not already CRISIS)
    #  - CSSRS:
    #       * HIGH/CRISIS        -> CRISIS
    #       * MODERATE           -> at least RED
    #       * LOW                -> optionally ORANGE

        if assessment.type == "PHQ9":
            if is_alert:
                profile.risk_status = "CRISIS"   # suicidal flag -> CRISIS in student profile
            elif risk_level in ["RED"]:
                if profile.risk_status != "CRISIS":
                    profile.risk_status = "RED"

    elif assessment.type == "CSSRS":
        if risk_level in ["HIGH", "CRISIS"]:
            profile.risk_status = "CRISIS"
        elif risk_level == "MODERATE":
            if profile.risk_status != "CRISIS":
                profile.risk_status = "RED"
        elif risk_level == "LOW":
            # Optional: LOW ko ORANGE treat kar sakte ho
            if profile.risk_status not in ["RED", "CRISIS"]:
                profile.risk_status = "ORANGE"

    # GAD7 abhi sirf informative hai, direct risk_status change nahi kar rahe
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
                journal_text=decrypt_text(e.journal_text),
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

@router.post("/reports", response_model=schemas.IncidentReportOut)
def report_incident(
    report: schemas.IncidentReportCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """
    Student incident report (bullying, harassment, ragging, etc.)
    Can be anonymous (no student_id stored).
    """
    profile = _get_current_student_profile(db, payload)

    # Determine if anonymous
    if report.anonymous:
        student_id = None
    else:
        student_id = profile.id

    # We always know class and school from the student profile
    class_id = profile.class_id
    school_id = profile.classroom.school_id

    incident = models.IncidentReport(
        student_id=student_id,
        class_id=class_id,
        school_id=school_id,
        type=models.IncidentType(report.incident_type),
        description=report.description,
        status=models.IncidentStatus.PENDING,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    return schemas.IncidentReportOut(
        id=incident.id,
        incident_type=incident.type.value,
        description=incident.description,
        status=incident.status.value,
        class_name=incident.classroom.name if incident.classroom else None,
        created_at=incident.created_at,
        is_anonymous=(incident.student_id is None),
    )
