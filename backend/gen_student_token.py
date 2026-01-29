# backend/gen_student_token.py
import os, sys
sys.path.append(os.getcwd())

from datetime import datetime, timedelta
import jwt  # tum already isko use kar rahe ho
from app.core.config import settings

def main():
    # SAME email jo seed_student.py me use ki thi
    email = "student1@demo.com"

    payload = {
        "sub": "dev-student-1",
        "email": email,
        "aud": "authenticated",  # require_student ye hi expect karta hai
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=12),
    }

    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
    print("Use this token in Authorization header as:\n")
    print("Bearer " + token)

if __name__ == "__main__":
    main()