from sqlalchemy.orm import Session
from app import models  # ✅ Models yahan se import ho rahe hain
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple
from app.models import SafetyEvent, DailyJournal, StudentProfile


# ---------- Journal keyword lists (MVP) ----------

SEVERE_PHRASES: List[str] = [
    "i don't want to live",
    "don't want to live",
    "i want to die",
    "want to die",
    "better off dead",
    "i wish i wasn't here",
    "wish i wasnt here",
    "i don't want to wake up",
    "dont want to wake up",
    "want to disappear",
    "everyone would be better without me",
    "i hurt myself",
    "cut myself",
]

SELF_WORTH_TERMS: List[str] = [
    "i am bad",
    "i'm bad",
    "im bad",
    "i'm not good enough",
    "im not good enough",
    "nobody likes me",
    "i don't matter",
    "i dont matter",
    "i hate myself",
    "i always mess up",
]

LOW_MOOD_TERMS: List[str] = [
    "nothing is fun",
    "bored of everything",
    "no energy",
    "tired all the time",
    "dont feel like doing anything",
    "don't feel like doing anything",
    "don't feel like playing",
    "dont feel like playing",
]

ANXIETY_TERMS: List[str] = [
    "always scared",
    "very scared",
    "panic attack",
    "panic",
    "heart beating fast",
    "heart is racing",
    "can't breathe",
    "cant breathe",
    "hard to breathe",
]


def analyze_journal_text(journal_text: str | None) -> Dict[str, Any]:
    """
    Simple keyword-based analysis of journal text.

    Returns dict:
    {
        "has_anxiety_terms": bool,
        "has_low_mood_terms": bool,
        "has_self_worth_terms": bool,
        "has_severe_suicidal_terms": bool,
        "matches": {
            "severe": [...],
            "self_worth": [...],
            "low_mood": [...],
            "anxiety": [...],
        }
    }
    """
    flags = {
        "has_anxiety_terms": False,
        "has_low_mood_terms": False,
        "has_self_worth_terms": False,
        "has_severe_suicidal_terms": False,
        "matches": {
            "severe": [],
            "self_worth": [],
            "low_mood": [],
            "anxiety": [],
        },
    }

    if not journal_text:
        return flags

    text = journal_text.lower()

    # Severe phrases
    for phrase in SEVERE_PHRASES:
        if phrase in text:
            flags["has_severe_suicidal_terms"] = True
            flags["matches"]["severe"].append(phrase)

    # Self-worth
    for phrase in SELF_WORTH_TERMS:
        if phrase in text:
            flags["has_self_worth_terms"] = True
            flags["matches"]["self_worth"].append(phrase)

    # Low mood
    for phrase in LOW_MOOD_TERMS:
        if phrase in text:
            flags["has_low_mood_terms"] = True
            flags["matches"]["low_mood"].append(phrase)

    # Anxiety
    for phrase in ANXIETY_TERMS:
        if phrase in text:
            flags["has_anxiety_terms"] = True
            flags["matches"]["anxiety"].append(phrase)

    return flags

def calculate_phq9(answers: list[int]):
    """
    PHQ-9 Logic (Depression)
    Returns: (score, depression_severity_risk, suicide_flag)
    - risk: depression severity (GREEN/YELLOW/ORANGE/RED)
    - suicide_flag: True if Q9 > 0 (needs suicide risk follow-up)
    """
    score = sum(answers)
    
    # Question 9 (index 8) is suicide risk flag
    suicide_risk = False
    if len(answers) >= 9 and answers[8] > 0:
        suicide_risk = True
        
    risk = "GREEN"
    if 5 <= score <= 9:
        risk = "YELLOW"        # Mild depression
    elif 10 <= score <= 14:
        risk = "ORANGE"        # Moderate
    elif 15 <= score <= 19:
        risk = "RED"           # Moderately severe
    elif score >= 20:
        risk = "RED"           # Severe
    
    # NOTE: DON'T overwrite risk with "CRISIS" here.
    # Crisis handling is separate via suicide_risk flag + SafetyEvent.
    return score, risk, suicide_risk



def calculate_gad7(answers: list[int]):
    """
    GAD-7 Logic (Anxiety)
    Returns: (score, risk_label, is_crisis)
    """
    score = sum(answers)
    
    risk = "GREEN"
    if 5 <= score <= 9: risk = "YELLOW"       # Mild
    elif 10 <= score <= 14: risk = "ORANGE"   # Moderate
    elif score >= 15: risk = "RED"            # Severe
    
    return score, risk, False


def create_safety_event(
    db: Session,
    student_id: int,
    trigger_type: str,
    risk_band: str,
    details: Dict[str, Any] | None = None,
) -> SafetyEvent:
    """
    Create and persist a SafetyEvent row.
    Used for:
    - PHQ9 Q9 > 0  (trigger_type="PHQ9_Q9")
    - Severe journal phrases (trigger_type="JOURNAL_SEVERE")
    - CSSRS non-GREEN risk (trigger_type="CSSRS")
    """
    event = SafetyEvent(
        student_id=student_id,
        trigger_type=trigger_type,
        risk_band=risk_band,
        details=details or {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event



def update_student_risk_profile(db: Session, student_id: int):
    """
    Analyzes last 7 days of journals to update risk status automatically.
    Now also considers severe suicidal phrases from journal flags.
    """
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    entries: List[DailyJournal] = db.query(models.DailyJournal).filter(
        models.DailyJournal.student_id == student_id,
        models.DailyJournal.date >= seven_days_ago
    ).all()
    
    # Counters
    worried_days = 0
    sad_flat_days = 0
    has_severe_recent = False

    for e in entries:
        if e.mood == "WORRIED":
            worried_days += 1
        elif e.mood in ["SAD", "FLAT"]:
            sad_flat_days += 1

        # 🔴 new: if any entry has severe suicidal terms in last 7 days
        if getattr(e, "has_severe_suicidal_terms", False):
            has_severe_recent = True
    
    # Decision Rules
    new_status = "GREEN"

    # 🔴 Hard override: any severe phrase in last 7 days -> CRISIS
    if has_severe_recent:
        new_status = "CRISIS"
    else:
        # Existing mood-based rules
        if worried_days >= 3:
            new_status = "ORANGE"
            
        if sad_flat_days >= 3:
            if sad_flat_days >= 5:
                new_status = "RED"
            else:
                new_status = "ORANGE" if new_status != "RED" else "RED"

    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    
    if student:
        # Once CRISIS, don't downgrade automatically
        if student.risk_status == "CRISIS":
            return "CRISIS"
            
        student.risk_status = new_status
        db.commit()
        
    return new_status

def calculate_cssrs(answers: List[int]) -> Tuple[int, str, bool]:
    """
    C-SSRS (screening) scoring helper.

    answers: list of 0/1 for questions 1..6
    Returns: (score, risk_band, is_crisis)

    Mapping (MVP):
      - All 0          -> GREEN
      - Q1 or Q2 = 1   -> LOW         (passive wish)
      - Q3 or Q4 = 1   -> MODERATE    (active ideation)
      - Q5 = 1         -> HIGH        (intent + plan)
      - Q6 = 1         -> CRISIS      (behaviour/attempt)
    """
    if not answers:
        return 0, "GREEN", False

    # simple "score" = sum of YES answers
    score = sum(answers)

    q1 = answers[0] if len(answers) > 0 else 0
    q2 = answers[1] if len(answers) > 1 else 0
    q3 = answers[2] if len(answers) > 2 else 0
    q4 = answers[3] if len(answers) > 3 else 0
    q5 = answers[4] if len(answers) > 4 else 0
    q6 = answers[5] if len(answers) > 5 else 0

    risk_band = "GREEN"
    is_crisis = False

    if score == 0:
        risk_band = "GREEN"
    elif (q1 == 1 or q2 == 1) and (q3 == 0 and q4 == 0 and q5 == 0 and q6 == 0):
        risk_band = "LOW"
    elif q3 == 1 or q4 == 1:
        risk_band = "MODERATE"
    elif q5 == 1:
        risk_band = "HIGH"
    elif q6 == 1:
        risk_band = "CRISIS"

    if risk_band in ("HIGH", "CRISIS"):
        is_crisis = True

    return score, risk_band, is_crisis