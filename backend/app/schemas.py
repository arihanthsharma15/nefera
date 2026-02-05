from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict, Literal
from datetime import datetime


# --- Incident Reporting Schemas ---

class IncidentReportCreate(BaseModel):
    incident_type: Literal["BULLYING", "HARASSMENT", "RAGGING", "OTHER"]
    description: str
    anonymous: bool = True


class IncidentReportOut(BaseModel):
    id: str
    incident_type: str
    description: str
    status: str
    class_name: Optional[str] = None
    student_name: Optional[str] = None
    student_login_id: Optional[str] = None
    created_at: datetime
    is_anonymous: bool

class IncidentReportUpdate(BaseModel):
    status: Literal["PENDING", "REVIEWED", "RESOLVED"]

# --- Check-in Schemas ---
class CheckinCreate(BaseModel):
    mood: str
    sleep_hours: Optional[int] = 0
    checkin_data: Dict[str, Any] = Field(default_factory=dict)
    journal_text: Optional[str] = None
    triggers: Optional[List[str]] = None 

class CheckinResponse(BaseModel):
    message: str
    coping_tool: Optional[str] = None

# --- Journal Schemas ---
class JournalCreate(BaseModel):
    title: Optional[str] = None
    content: str
    mood: Optional[str] = None
    triggers: Optional[List[str]] = None

class JournalResponse(BaseModel):
    message: str
    coping_tool: Optional[str] = None

# --- Assessment Schemas ---
class AssessmentCreate(BaseModel):
    # "PHQ9", "GAD7", "CSSRS"
    type: Literal["PHQ9", "GAD7", "CSSRS"]
    answers: List[int]

class CounselorAssessmentCreate(BaseModel):
    # Counselor-administered assessments for a specific student
    student_id: int
    type: Literal["PHQ9", "GAD7", "CSSRS"]
    answers: List[int]

class AssessmentResponse(BaseModel):
    score: int
    risk_level: str
    alert_triggered: bool

class JournalEntryOut(BaseModel):
    id: int
    date: datetime
    mood: Optional[str] = None
    sleep_hours: Optional[int] = None
    journal_text: Optional[str] = None        
    triggers: Optional[List[str]] = None
    notes: Optional[str] = None

class AssessmentHistoryOut(BaseModel):
    id: int
    type: str
    total_score: int
    created_at: datetime

class StudentCredentialOutput(BaseModel):
    name: str
    username: str      # Teacher sees Roll No (e.g. "15")
    temp_password: str # Teacher sees PIN (e.g. "1500")
    class_id: str
    status: str        # "Created" or "Error"

class BulkImportResponse(BaseModel):
    total_processed: int
    students: List[StudentCredentialOutput]


class BroadcastCreate(BaseModel):
    content: str


class BroadcastOut(BaseModel):
    id: int
    sender_role: str
    content: str
    created_at: datetime
