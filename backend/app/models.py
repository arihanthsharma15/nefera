from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base  
from sqlalchemy import Table 
import uuid

parent_student_link = Table(
    "parent_student_link",
    Base.metadata,
    Column("parent_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("student_profile_id", Integer, ForeignKey("student_profiles.id"), primary_key=True),
)


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    COUNSELOR = "COUNSELOR"
    PRINCIPAL = "PRINCIPAL"
    TEACHER = "TEACHER"
    PARENT = "PARENT"

class IncidentType(str, enum.Enum):
    BULLYING = "BULLYING"
    HARASSMENT = "HARASSMENT"
    RAGGING = "RAGGING"
    OTHER = "OTHER"


class IncidentStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    RESOLVED = "RESOLVED"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    role = Column(Enum(UserRole))
    school_id = Column(Integer, ForeignKey("schools.id"))

    full_name = Column(String, nullable=True)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    school = relationship("School", back_populates="users")

    # 👇 NEW: if this user is a parent, these are their children
    children = relationship(
        "StudentProfile",
        secondary=parent_student_link,
        back_populates="parents"
    )

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    users = relationship("User", back_populates="school")
    classes = relationship("Class", back_populates="school")

class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    school_id = Column(Integer, ForeignKey("schools.id"))
    school = relationship("School", back_populates="classes")
    students = relationship("StudentProfile", back_populates="classroom")

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))

    roll_number = Column(String, nullable=True)
    
    # Risk Engine ke liye
    risk_status = Column(String, default="GREEN") # GREEN, ORANGE, RED, CRISIS
    streak_count = Column(Integer, default=0)
    
    
    user = relationship("User", back_populates="student_profile")
    classroom = relationship("Class", back_populates="students")
    entries = relationship("DailyJournal", back_populates="student")
    assessments = relationship("Assessment", back_populates="student")

    parents = relationship(
        "User",
        secondary=parent_student_link,
        back_populates="children"
    )
    safety_events = relationship("SafetyEvent", back_populates="student")

class DailyJournal(Base):
    __tablename__ = "daily_journals"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    mood = Column(String)  # HAPPY, WORRIED, SAD, etc.
    sleep_hours = Column(Integer)
    checkin_data = Column(JSON)  # {"triggers": "Exams", "intensity": 5}
    journal_text = Column(Text, nullable=True)  # yahi column me encrypted text store karenge

    # 🔍 Keyword-based risk flags (for risk engine + alerts)
    has_anxiety_terms = Column(Boolean, default=False, nullable=False)
    has_low_mood_terms = Column(Boolean, default=False, nullable=False)
    has_self_worth_terms = Column(Boolean, default=False, nullable=False)
    has_severe_suicidal_terms = Column(Boolean, default=False, nullable=False)

    trigger_tags = Column(JSON, nullable=True)
    
    student = relationship("StudentProfile", back_populates="entries")

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    type = Column(String) # PHQ9, GAD7, CSSRS
    total_score = Column(Integer)
    answers = Column(JSON) 
    is_alert = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    student = relationship("StudentProfile", back_populates="assessments")


class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)

    # e.g. "PHQ9_Q9", "JOURNAL_SEVERE", "CSSRS"
    trigger_type = Column(String, nullable=False)

    # e.g. "LOW", "MODERATE", "HIGH", "CRISIS"
    risk_band = Column(String, nullable=False)

    # Extra info: scores, matched phrases, etc.
    details = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", back_populates="safety_events")

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # Nullable: allows anonymous
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)

    # Required: to know which class/school it belongs to
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    type = Column(Enum(IncidentType), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.PENDING, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (optional, but useful)
    student = relationship("StudentProfile", backref="incident_reports", lazy="joined")
    classroom = relationship("Class", backref="incident_reports", lazy="joined")
    school = relationship("School", backref="incident_reports", lazy="joined")

class BroadcastMessage(Base):
    __tablename__ = "broadcast_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_role = Column(Enum(UserRole), nullable=False)

    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)

    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", backref="broadcast_messages")
    classroom = relationship("Class", backref="broadcast_messages")
    student = relationship("StudentProfile", backref="broadcast_messages")