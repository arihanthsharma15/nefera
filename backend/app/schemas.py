from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Check-in Schemas ---
class CheckinCreate(BaseModel):
    mood: str
    sleep_hours: Optional[int] = 0
    checkin_data: Dict[str, Any] = {} 
    journal_text: Optional[str] = None

class CheckinResponse(BaseModel):
    message: str
    coping_tool: Optional[str] = None

# --- Assessment Schemas ---
class AssessmentCreate(BaseModel):
    type: str # "PHQ9" or "GAD7"
    answers: List[int]

class AssessmentResponse(BaseModel):
    score: int
    risk_level: str
    alert_triggered: bool

class JournalEntryOut(BaseModel):
    id: int
    date: datetime
    mood: str
    sleep_hours: Optional[int] = None
    journal_text: Optional[str] = None        
    triggers: Optional[List[str]] = None
    notes: Optional[str] = None

class AssessmentHistoryOut(BaseModel):
    id: int
    type: str
    total_score: int
    created_at: datetime