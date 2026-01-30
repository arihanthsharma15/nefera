# backend/seed_student.py

import os, sys
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app import models

def main():
    db: Session = SessionLocal()

    print("🌱 Seeding Data...")

    # 1) Get or Create School
    school = db.query(models.School).filter_by(name="Demo School").first()
    if not school:
        school = models.School(name="Demo School")
        db.add(school)
        db.commit()
        db.refresh(school)
        print(f"✅ Created School: ID {school.id}")
    else:
        print(f"ℹ️ School already exists: ID {school.id}")

    # 2) Get or Create Class
    classroom = (
        db.query(models.Class)
        .filter_by(name="10-A", school_id=school.id)
        .first()
    )
    if not classroom:
        classroom = models.Class(name="10-A", school_id=school.id)
        db.add(classroom)
        db.commit()
        db.refresh(classroom)
        print(f"✅ Created Class: ID {classroom.id}")
    else:
        print(f"ℹ️ Class already exists: ID {classroom.id}")

    # 3) Get or Create PRINCIPAL user
    principal_email = "principal@demo.com"
    principal_user = db.query(models.User).filter_by(email=principal_email).first()

    if not principal_user:
        principal_user = models.User(
            email=principal_email,
            hashed_password=None,  # Supabase/auth backend handle karega
            role=models.UserRole.PRINCIPAL,
            school_id=school.id,
            full_name="Demo Principal",
        )
        db.add(principal_user)
        db.commit()
        db.refresh(principal_user)
        print(f"✅ Created Principal: ID {principal_user.id}")
    else:
        print(f"ℹ️ Principal already exists: ID {principal_user.id}")

    # 4) Get or Create STUDENT user
    student_email = "student1@demo.com"
    user = db.query(models.User).filter_by(email=student_email).first()

    if not user:
        user = models.User(
            email=student_email,
            hashed_password=None,
            role=models.UserRole.STUDENT,
            school_id=school.id,
            full_name="Demo Student",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ Created Student User: ID {user.id}")
    else:
        print(f"ℹ️ Student User already exists: ID {user.id}")

    # 5) Get or Create StudentProfile
    profile = db.query(models.StudentProfile).filter_by(user_id=user.id).first()
    if not profile:
        profile = models.StudentProfile(
            user_id=user.id,
            class_id=classroom.id,
            risk_status="GREEN",
            streak_count=0,
            roll_number="1",
        )
        db.add(profile)
        db.commit()
        print(f"✅ Created Student Profile for User ID {user.id}")
    else:
        print(f"ℹ️ Student Profile already exists")

    db.close()
    print("✨ Seeding Complete!")

if __name__ == "__main__":
    main()