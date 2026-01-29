# backend/seed_student.py

import os, sys
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app import models

def main():
    db: Session = SessionLocal()

    # 1) Demo school
    school = models.School(name="Demo School")
    db.add(school)
    db.flush()

    # 2) Demo class
    classroom = models.Class(name="10-A", school_id=school.id)
    db.add(classroom)
    db.flush()

    # 3) Demo student user
    student_email = "student1@demo.com"

    user = models.User(
        email=student_email,
        hashed_password=None,
        role=models.UserRole.STUDENT,
        school_id=school.id,
    )
    db.add(user)
    db.flush()  # id mil jayega

    # 4) Student profile
    profile = models.StudentProfile(
        user_id=user.id,
        class_id=classroom.id,
        risk_status="GREEN",
        streak_count=0,
    )
    db.add(profile)
    db.flush()  # profile.id bhi mil jayega

    # ✅ IDs ko yahin store kar lo, session close ke baad use nahi karna
    user_id = user.id
    profile_id = profile.id

    db.commit()
    db.close()

    print("✅ Seeded student:")
    print(f"  email = {student_email}")
    print(f"  user_id = {user_id}, student_profile_id = {profile_id}")

if __name__ == "__main__":
    main()