# app/api/v1/counselors.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app import models, schemas
from app.core.scoring import (
    calculate_phq9,
    calculate_gad7,
    calculate_cssrs,
    create_safety_event,
)
from typing import List
from app.db.base import get_db
from app import models
from app.core.deps.auth import require_role
from app.core.deps.entrypoint import require_entrypoint
from app.core.constants import ROLES, ENTRYPOINTS

router = APIRouter(prefix="/counselors", tags=["counselors"])

@router.post("/broadcast")
def counselor_broadcast(
    payload: schemas.BroadcastCreate,
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Counselor sends a message to the whole school.
    """
    counselor_user = None
    if isinstance(_role, dict) and _role.get("email"):
        counselor_user = db.query(models.User).filter(models.User.email == _role["email"]).first()

    if not counselor_user or not counselor_user.school_id:
        raise HTTPException(status_code=404, detail="Counselor not linked to a school")

    msg = models.BroadcastMessage(
        sender_role=models.UserRole.COUNSELOR,
        school_id=counselor_user.school_id,
        class_id=None,
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


# --------------------------------------
# 1) Overall school risk summary
# --------------------------------------
@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
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
    _role = Depends(require_role("COUNSELOR")),
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
    _role = Depends(require_role("COUNSELOR")),
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
                "name": user.full_name if (user and user.full_name) else (user.email if user else None),
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
    _role = Depends(require_role("COUNSELOR")),
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

    parent_contacts = []
    for p in profile.parents:
        parent_contacts.append(
            {
                "id": p.id,
                "name": p.full_name,
                "email": p.email,
                "phone": p.phone_number,
            }
        )

    return {
    "id": profile.id,
    "name": user.full_name if user else None,
    "email": user.email if user else None,
    "phone": user.phone_number if user else None,
    "roll_number": profile.roll_number,
    "class_name": classroom.name if classroom else None,
    "risk_status": profile.risk_status,
    "streak_count": profile.streak_count,
    "recent_moods": recent_moods,
    "assessments": assessments_out,
    "parents": parent_contacts,
}

@router.get("/reports", response_model=List[schemas.IncidentReportOut])
def get_incident_reports_for_counselor(
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
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
        student_user = r.student.user if r.student else None
        result.append(
            schemas.IncidentReportOut(
                id=r.id,
                incident_type=r.type.value,
                description=r.description,
                status=r.status.value,
                class_name=r.classroom.name if r.classroom else None,
                student_name=student_user.full_name if student_user else None,
                student_login_id=student_user.login_id if student_user else None,
                created_at=r.created_at,
                is_anonymous=(r.student_id is None),
            )
        )
    return result


@router.patch("/reports/{report_id}", response_model=schemas.IncidentReportOut)
def update_incident_report_status(
    report_id: str,
    payload: schemas.IncidentReportUpdate,
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    report = db.query(models.IncidentReport).filter(models.IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = models.IncidentStatus(payload.status)
    db.commit()
    db.refresh(report)

    student_user = report.student.user if report.student else None
    return schemas.IncidentReportOut(
        id=report.id,
        incident_type=report.type.value,
        description=report.description,
        status=report.status.value,
        class_name=report.classroom.name if report.classroom else None,
        student_name=student_user.full_name if student_user else None,
        student_login_id=student_user.login_id if student_user else None,
        created_at=report.created_at,
        is_anonymous=(report.student_id is None),
    )


# --------------------------------------
# 3.5) Classes list
# --------------------------------------
@router.get("/classes")
def get_classes(
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    classes = db.query(models.Class).order_by(models.Class.name.asc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
        }
        for c in classes
    ]


# --------------------------------------
# 3.6) Students by class
# --------------------------------------
@router.get("/students")
def get_students(
    class_id: int | None = None,
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    q = db.query(models.StudentProfile)
    if class_id is not None:
        q = q.filter(models.StudentProfile.class_id == class_id)
    students = q.all()

    result = []
    for s in students:
        user = s.user
        classroom = s.classroom
        name = None
        if user:
            name = user.full_name or user.email
        if not name:
            name = s.roll_number or f"Student {s.id}"
        result.append(
            {
                "id": s.id,
                "name": name,
                "risk_status": s.risk_status,
                "roll_number": s.roll_number,
                "email": user.email if user else None,
                "class_id": s.class_id,
                "class_name": classroom.name if classroom else None,
            }
        )

    return result


# --------------------------------------
# 4.1) Counselor-administered assessments
# --------------------------------------
@router.post("/assessments", response_model=schemas.AssessmentResponse)
def submit_counselor_assessment(
    assessment: schemas.CounselorAssessmentCreate,
    db: Session = Depends(get_db),
    _role = Depends(require_role("COUNSELOR")),
    _ep   = Depends(require_entrypoint(ENTRYPOINTS["COUNSELOR"])),
):
    """
    Counselor fills PHQ-9 / GAD-7 / C-SSRS on behalf of a student.
    Saves assessment for the selected student and updates risk/safety events.
    """
    profile = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.id == assessment.student_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1) Score calculate
    if assessment.type == "PHQ9":
        score, risk_level, is_alert = calculate_phq9(assessment.answers)
    elif assessment.type == "GAD7":
        score, risk_level, is_alert = calculate_gad7(assessment.answers)
    elif assessment.type == "CSSRS":
        score, risk_level, is_alert = calculate_cssrs(assessment.answers)
    else:
        raise HTTPException(status_code=400, detail="Invalid assessment type")

    # 2) Save DB
    record = models.Assessment(
        student_id=profile.id,
        type=assessment.type,
        total_score=score,
        answers=assessment.answers,
        is_alert=is_alert,
    )
    db.add(record)

    # 3) Safety events
    if assessment.type == "PHQ9" and is_alert:
        q9_score = assessment.answers[8] if len(assessment.answers) >= 9 else None
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="PHQ9_Q9",
            risk_band="CRISIS",
            details={
                "q9_score": q9_score,
                "total_score": score,
                "depression_severity": risk_level,
                "type": "PHQ9",
                "source": "counselor",
            },
        )

    if assessment.type == "CSSRS" and risk_level != "GREEN":
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="CSSRS",
            risk_band=risk_level,
            details={
                "answers": assessment.answers,
                "type": "CSSRS",
                "source": "counselor",
            },
        )

    # 🔴 PHQ-9 RED (non-Q9) -> safety event
    if assessment.type == "PHQ9" and (not is_alert) and risk_level in ["RED"]:
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="PHQ9",
            risk_band="RED",
            details={
                "total_score": score,
                "depression_severity": risk_level,
                "type": "PHQ9",
                "source": "counselor",
            },
        )

    # 🔴 GAD-7 ORANGE/RED -> safety event
    if assessment.type == "GAD7" and risk_level in ["ORANGE", "RED"]:
        create_safety_event(
            db=db,
            student_id=profile.id,
            trigger_type="GAD7",
            risk_band=risk_level,
            details={
                "total_score": score,
                "type": "GAD7",
                "source": "counselor",
            },
        )

    # 4) Risk escalation (explicit DB update for stability)
    target_status = None
    if assessment.type == "PHQ9":
        if is_alert:
            target_status = "CRISIS"
        elif risk_level in ["RED"]:
            target_status = "RED"
        elif risk_level in ["ORANGE"]:
            target_status = "ORANGE"
    elif assessment.type == "GAD7":
        if risk_level in ["RED"]:
            target_status = "RED"
        elif risk_level in ["ORANGE", "YELLOW"]:
            target_status = "ORANGE"
    elif assessment.type == "CSSRS":
        if risk_level in ["HIGH", "CRISIS"]:
            target_status = "CRISIS"
        elif risk_level == "MODERATE":
            target_status = "RED"
        elif risk_level == "LOW":
            target_status = "ORANGE"

    if target_status:
        db.query(models.StudentProfile).filter(models.StudentProfile.id == profile.id).update(
            {"risk_status": target_status}
        )

    db.commit()

    return schemas.AssessmentResponse(
        score=score,
        risk_level=risk_level,
        alert_triggered=is_alert,
    )
