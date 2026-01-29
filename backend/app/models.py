from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base  
from sqlalchemy import Table 

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
    parents = relationship(
        "User",
        secondary=parent_student_link,
        back_populates="children"
     )
    
    user = relationship("User", back_populates="student_profile")
    classroom = relationship("Class", back_populates="students")
    entries = relationship("DailyJournal", back_populates="student")
    assessments = relationship("Assessment", back_populates="student")

    parents = relationship(
        "User",
        secondary=parent_student_link,
        back_populates="children"
    )



class DailyJournal(Base):
    __tablename__ = "daily_journals"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    mood = Column(String) # HAPPY, WORRIED, SAD, etc.
    sleep_hours = Column(Integer)
    checkin_data = Column(JSON) # {"triggers": "Exams", "intensity": 5}
    journal_text = Column(Text, nullable=True)
    
    student = relationship("StudentProfile", back_populates="entries")

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    type = Column(String) # PHQ9, GAD7
    total_score = Column(Integer)
    answers = Column(JSON) 
    is_alert = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    student = relationship("StudentProfile", back_populates="assessments")

