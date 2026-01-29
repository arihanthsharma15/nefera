from sqlalchemy.orm import Session
from app import models  # ✅ Models yahan se import ho rahe hain
from datetime import datetime, timedelta

def calculate_phq9(answers: list[int]):
    """
    PHQ-9 Logic (Depression)
    Returns: (score, risk_label, is_crisis)
    """
    score = sum(answers)
    
    # Logic: Question 9 (index 8) is suicide risk
    suicide_risk = False
    if len(answers) >= 9 and answers[8] > 0:
        suicide_risk = True
        
    risk = "GREEN"
    if 5 <= score <= 9: risk = "YELLOW"       # Mild
    elif 10 <= score <= 14: risk = "ORANGE"   # Moderate
    elif 15 <= score <= 19: risk = "RED"      # Moderately Severe
    elif score >= 20: risk = "RED"            # Severe
    
    if suicide_risk: 
        risk = "CRISIS"
    
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

def update_student_risk_profile(db: Session, student_id: int):
    """
    Analyzes last 7 days of journals to update risk status automatically.
    """
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    # ✅ FIX 1: models.DailyJournal use kiya
    entries = db.query(models.DailyJournal).filter(
        models.DailyJournal.student_id == student_id,
        models.DailyJournal.date >= seven_days_ago
    ).all()
    
    # Counters
    worried_days = 0
    sad_flat_days = 0
    
    for e in entries:
        if e.mood == "WORRIED":
            worried_days += 1
        elif e.mood in ["SAD", "FLAT"]:
            sad_flat_days += 1
            
    # Decision Rules
    new_status = "GREEN"
    
    if worried_days >= 3:
        new_status = "ORANGE"
        
    if sad_flat_days >= 3:
        if sad_flat_days >= 5:
            new_status = "RED"
        else:
            new_status = "ORANGE" if new_status != "RED" else "RED"

    # ✅ FIX 2: models.StudentProfile use kiya
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    
    if student:
        if student.risk_status == "CRISIS":
            return "CRISIS"
            
        student.risk_status = new_status
        db.commit()
        
    return new_status