# backend/seed_student.py

import os, sys
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app import models

def main():
    db: Session = SessionLocal()

    print("🌱 Seeding Data...")

    # ---------------------------
    # SCHOOL
    # ---------------------------
    school = db.query(models.School).filter_by(name="Demo School").first()
    if not school:
        school = models.School(name="Demo School")
        db.add(school)
        db.commit()
        db.refresh(school)
        print(f"✅ Created School: ID {school.id}")

    # ---------------------------
    # CLASSES
    # ---------------------------
    classroom_a = (
        db.query(models.Class)
        .filter_by(name="10-A", school_id=school.id)
        .first()
    )
    if not classroom_a:
        classroom_a = models.Class(name="10-A", school_id=school.id)
        db.add(classroom_a)
        db.commit()
        db.refresh(classroom_a)
        print(f"✅ Created Class: ID {classroom_a.id}")

    classroom_b = (
        db.query(models.Class)
        .filter_by(name="10-B", school_id=school.id)
        .first()
    )
    if not classroom_b:
        classroom_b = models.Class(name="10-B", school_id=school.id)
        db.add(classroom_b)
        db.commit()
        db.refresh(classroom_b)
        print(f"✅ Created Class: ID {classroom_b.id}")

    # ---------------------------
    # PRINCIPAL
    # ---------------------------
    principal_email = "principal@test.com"
    principal_user = db.query(models.User).filter_by(email=principal_email).first()

    if not principal_user:
        principal_user = models.User(
            email=principal_email,
            hashed_password=None,
            role=models.UserRole.PRINCIPAL,
            school_id=school.id,
            full_name="Demo Principal",
        )
        db.add(principal_user)
        db.commit()
        db.refresh(principal_user)
        print("✅ Principal created")

    # ---------------------------
    # COUNSELOR
    # ---------------------------
    counselor_email = "counselor@test.com"
    counselor_user = db.query(models.User).filter_by(email=counselor_email).first()

    if not counselor_user:
        counselor_user = models.User(
            email=counselor_email,
            hashed_password=None,
            role=models.UserRole.COUNSELOR,
            school_id=school.id,
            full_name="School Counselor",
        )
        db.add(counselor_user)
        db.commit()
        db.refresh(counselor_user)
        print("✅ Counselor created")

    # ---------------------------
    # TEACHER
    # ---------------------------
    teacher_email = "teacher@test.com"
    teacher_user = db.query(models.User).filter_by(email=teacher_email).first()

    if not teacher_user:
        teacher_user = models.User(
            email=teacher_email,
            hashed_password=None,
            role=models.UserRole.TEACHER,
            school_id=school.id,
            full_name="Demo Teacher",
        )
        db.add(teacher_user)
        db.commit()
        db.refresh(teacher_user)
        print("✅ Teacher created")

    # ---------------------------
    # PARENT
    # ---------------------------
    parent_email = "parent@test.com"
    parent_user = db.query(models.User).filter_by(email=parent_email).first()

    if not parent_user:
        parent_user = models.User(
            email=parent_email,
            hashed_password=None,
            role=models.UserRole.PARENT,
            school_id=school.id,
            full_name="Demo Parent",
        )
        db.add(parent_user)
        db.commit()
        db.refresh(parent_user)
        print("✅ Parent created")

    # ---------------------------
    # STUDENT USER
    # ---------------------------
    student_email = "student@test.com"
    student_user = db.query(models.User).filter_by(email=student_email).first()

    if not student_user:
        student_user = models.User(
            email=student_email,
            hashed_password=None,
            role=models.UserRole.STUDENT,
            school_id=school.id,
            full_name="Demo Student",
        )
        db.add(student_user)
        db.commit()
        db.refresh(student_user)
        print("✅ Student user created")

    # ---------------------------
    # STUDENT PROFILE
    # ---------------------------
    profile = db.query(models.StudentProfile).filter_by(user_id=student_user.id).first()
    if not profile:
        profile = models.StudentProfile(
            user_id=student_user.id,
            class_id=classroom_a.id,
            risk_status="GREEN",
            streak_count=0,
            roll_number="1",
        )
        db.add(profile)
        db.commit()
        print("✅ Student profile created")

    # Optional second student for demo charts
    student2_email = "student2@test.com"
    student2_user = db.query(models.User).filter_by(email=student2_email).first()
    if not student2_user:
        student2_user = models.User(
            email=student2_email,
            hashed_password=None,
            role=models.UserRole.STUDENT,
            school_id=school.id,
            full_name="Demo Student 2",
        )
        db.add(student2_user)
        db.commit()
        db.refresh(student2_user)
        print("✅ Student2 user created")

    profile2 = db.query(models.StudentProfile).filter_by(user_id=student2_user.id).first()
    if not profile2:
        profile2 = models.StudentProfile(
            user_id=student2_user.id,
            class_id=classroom_b.id,
            risk_status="ORANGE",
            streak_count=2,
            roll_number="2",
        )
        db.add(profile2)
        db.commit()
        print("✅ Student2 profile created")

    # Link parent to student profile
    if parent_user and profile and parent_user not in profile.parents:
        profile.parents.append(parent_user)
        db.commit()
        print("✅ Linked parent to student")

    db.close()
    print("✨ Seeding Complete!")

if __name__ == "__main__":
    main()
