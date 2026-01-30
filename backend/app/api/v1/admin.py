# backend/app/api/v1/admin.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app import models
from app.schemas import BulkImportResponse, StudentCredentialOutput
import csv
import io

router = APIRouter()


@router.post("/bulk-import-students", response_model=BulkImportResponse)
async def bulk_import_students(
    class_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # 2. Fetch class to get school_id
    classroom = (
        db.query(models.Class)
        .filter(models.Class.id == class_id)
        .first()
    )
    if not classroom:
        raise HTTPException(status_code=404, detail=f"Class ID {class_id} not found")

    school_id = classroom.school_id

    # 3. Read CSV content
    content = await file.read()
    decoded = content.decode("utf-8")

    # DEBUG: Print raw CSV
    print("---- RAW CSV ----")
    print(decoded)
    print("-----------------")

    csv_reader = csv.DictReader(io.StringIO(decoded), skipinitialspace=True)

    # Normalize headers (strip spaces)
    if csv_reader.fieldnames:
        csv_reader.fieldnames = [h.strip() for h in csv_reader.fieldnames]

    results = []

    # 4. Process each row
    for row in csv_reader:
        print("Row:", row)  # DEBUG

        name = (row.get("name") or "").strip()
        roll_no = (row.get("roll_no") or "").strip()

        if not name or not roll_no:
            print("Skipping row (missing name/roll_no)")
            continue

        # Fake email just to satisfy unique constraint and structure
        fake_email = f"{roll_no}_{class_id}@pilot.school"

        # Simple PIN for child login (we just expose roll_no + "00")
        pin = f"{roll_no}00"

        # Check if a student with this roll_no already exists in this class
        existing_profile = (
            db.query(models.StudentProfile)
            .filter(
                models.StudentProfile.class_id == class_id,
                models.StudentProfile.roll_number == roll_no,
            )
            .first()
        )

        if existing_profile:
            results.append(
                StudentCredentialOutput(
                    name=name,
                    username=roll_no,
                    temp_password=pin,
                    class_id=str(class_id),
                    status="Already Exists",
                )
            )
            continue

        # 5. Create User row
        new_user = models.User(
            email=fake_email,
            hashed_password=None,  # Auth handle karega; backend mein store nahi kar rahe
            role=models.UserRole.STUDENT,
            school_id=school_id,
            full_name=name,
        )
        db.add(new_user)
        db.flush()  # generate new_user.id

        # 6. Create StudentProfile row
        new_profile = models.StudentProfile(
            user_id=new_user.id,
            class_id=class_id,
            roll_number=roll_no,
            risk_status="GREEN",
            streak_count=0,
        )
        db.add(new_profile)

        results.append(
            StudentCredentialOutput(
                name=name,
                username=roll_no,       # child will use roll_no
                temp_password=pin,      # child PIN
                class_id=str(class_id),
                status="Created",
            )
        )

    db.commit()

    return BulkImportResponse(
        total_processed=len(results),
        students=results,
    )