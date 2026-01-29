# app/core/security/jwt.py

import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.core.config import settings

ALGO = "HS256"

def sign_demo_token(role: str) -> str:
    payload = {
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=6),
        "iat": datetime.utcnow(),
        "type": "demo"
    }
    return jwt.encode(payload, settings.DEMO_JWT_SECRET, algorithm=ALGO)


def verify_demo_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.DEMO_JWT_SECRET,
            algorithms=[ALGO]
        )
        if payload.get("type") != "demo":
            raise HTTPException(status_code=404)
        return payload
    except Exception:
        raise HTTPException(status_code=404)
