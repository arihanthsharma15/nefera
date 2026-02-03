# app/core/deps/auth.py

from fastapi import Header, HTTPException, Depends
from app.core.security.supabase_jwt import verify_supabase_jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import HEADERS
from app.db.base import get_db
from app.models import User, UserRole

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
        payload = verify_supabase_jwt(token)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(student_security),
    db: Session = Depends(get_db),
) -> dict:
    """Verify Supabase JWT and ensure a corresponding local `User` exists.

    This dependency DOES NOT auto-create local users. It returns the decoded
    JWT payload if a local user exists for the token's email; otherwise it
    returns 404 instructing the client to call `/auth/supabase-login`.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = credentials.credentials
    try:
        payload = verify_supabase_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Respect privacy: do not auto-create. Ask client to call login endpoint.
        raise HTTPException(status_code=404, detail="Local profile not found; please call /auth/supabase-login")

    # Attach minimal local info to payload for downstream code
    payload["nefera_user_id"] = user.id
    payload["nefera_role"] = user.role.name if isinstance(user.role, UserRole) else str(user.role)
    return payload

def require_role(role: str):
    """Return a dependency that ensures the JWT belongs to a local user with the given role.

    Use uppercase role names matching `UserRole` (e.g. 'STUDENT', 'COUNSELOR').
    """
    def checker(
        credentials: HTTPAuthorizationCredentials = Depends(student_security),
        db: Session = Depends(get_db),
    ):
        payload = None
        if credentials is None:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        token = credentials.credentials
        try:
            payload = verify_supabase_jwt(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Token missing email")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Local profile not found; please call /auth/supabase-login")

        # Normalize role check
        try:
            expected = getattr(UserRole, role)
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid role configuration")

        if user.role != expected:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        payload["nefera_user_id"] = user.id
        payload["nefera_role"] = user.role.name if isinstance(user.role, UserRole) else str(user.role)
        return payload

    return checker
