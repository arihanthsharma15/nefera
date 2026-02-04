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
            login_id="PR-001",
        )
        db.add(principal_user)
        db.commit()
        db.refresh(principal_user)
        print("✅ Principal created")
    else:
        if not principal_user.full_name:
            principal_user.full_name = "Demo Principal"
        if not principal_user.login_id:
            principal_user.login_id = "PR-001"
        db.commit()

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
            login_id="CO-001",
        )
        db.add(counselor_user)
        db.commit()
        db.refresh(counselor_user)
        print("✅ Counselor created")
    else:
        if not counselor_user.full_name:
            counselor_user.full_name = "School Counselor"
        if not counselor_user.login_id:
            counselor_user.login_id = "CO-001"
        db.commit()

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
            login_id="TE-001",
        )
        db.add(teacher_user)
        db.commit()
        db.refresh(teacher_user)
        print("✅ Teacher created")
    else:
        if not teacher_user.full_name:
            teacher_user.full_name = "Demo Teacher"
        if not teacher_user.login_id:
            teacher_user.login_id = "TE-001"
        db.commit()

    # ---------------------------
    # PARENT 1
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
            login_id="PA-001",
        )
        db.add(parent_user)
        db.commit()
        db.refresh(parent_user)
        print("✅ Parent created")
    else:
        if not parent_user.full_name:
            parent_user.full_name = "Demo Parent"
        if not parent_user.login_id:
            parent_user.login_id = "PA-001"
        db.commit()

    # ---------------------------
    # PARENT 2
    # ---------------------------
    parent2_email = "parent2@test.com"
    parent2_user = db.query(models.User).filter_by(email=parent2_email).first()

    if not parent2_user:
        parent2_user = models.User(
            email=parent2_email,
            hashed_password=None,
            role=models.UserRole.PARENT,
            school_id=school.id,
            full_name="Demo Parent 2",
            login_id="PA-002",
        )
        db.add(parent2_user)
        db.commit()
        db.refresh(parent2_user)
        print("✅ Parent2 created")
    else:
        if not parent2_user.full_name:
            parent2_user.full_name = "Demo Parent 2"
        if not parent2_user.login_id:
            parent2_user.login_id = "PA-002"
        db.commit()

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
            login_id="ST-001",
        )
        db.add(student_user)
        db.commit()
        db.refresh(student_user)
        print("✅ Student user created")
    else:
        if not student_user.full_name:
            student_user.full_name = "Demo Student"
        if not student_user.login_id:
            student_user.login_id = "ST-001"
        db.commit()

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
            login_id="ST-002",
        )
        db.add(student2_user)
        db.commit()
        db.refresh(student2_user)
        print("✅ Student2 user created")
    else:
        if not student2_user.full_name:
            student2_user.full_name = "Demo Student 2"
        if not student2_user.login_id:
            student2_user.login_id = "ST-002"
        db.commit()

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
