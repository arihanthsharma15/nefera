# app/core/deps/auth.py

from fastapi import Header, HTTPException, Depends
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.constants import HEADERS
from app.core.security.jwt import verify_demo_token

student_security = HTTPBearer()


# -----------------------------
# STUDENT AUTH (Supabase JWT)
# -----------------------------
def require_student(
    credentials: HTTPAuthorizationCredentials = Depends(student_security),
) -> dict:
    """
    Supabase JWT verify karta hai.
    Swagger me 'Authorize' button se Bearer token aayega.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = credentials.credentials  # 'Bearer ' ke baad ka part

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# -----------------------------
# DEMO AUTH (role based)
# -----------------------------
def require_demo(role: str):
    def checker(x_nefera_demo_token: str = Header(...)):
        payload = verify_demo_token(x_nefera_demo_token)
        if payload.get("role") != role:
            raise HTTPException(status_code=404)
        return payload
    return checker
