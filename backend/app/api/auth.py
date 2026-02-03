# app/api/auth.py

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.security.supabase_jwt import verify_supabase_jwt
from typing import Optional
import urllib.request
import urllib.error
import urllib.parse
import json

from app.core.config import settings
from app.core.constants import ROLES

from app.db.base import get_db
from app.models import User, UserRole, StudentProfile
from app.core.deps.auth import require_user

router = APIRouter(tags=["auth"])


# ---------------- SUPABASE LOGIN ----------------
class SupabaseLoginRequest(BaseModel):
    access_token: Optional[str] = None


@router.post("/supabase-login")
def supabase_login(
    data: SupabaseLoginRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Accept a Supabase JWT from the client, verify it with the
    `SUPABASE_JWT_SECRET`, ensure a local `User` (and `StudentProfile`
    for students) exists, and return basic user info.
    """
    # Accept token either in request body (`access_token`) or
    # `Authorization: Bearer <token>` header. Header takes precedence.
    token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        token = data.access_token

    try:
        payload = verify_supabase_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase token")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email")

    # Attempt to infer role from token claims (role or app_metadata.role)
    role_claim = payload.get("role") or (payload.get("app_metadata") or {}).get("role")
    role_str = None
    if isinstance(role_claim, str):
        role_str = role_claim.lower()

    # Map to our canonical role values (e.g. 'student', 'counselor')
    role_map = {v: k for k, v in ROLES.items()}  # e.g. {'student': 'STUDENT'}
    mapped = role_map.get(role_str) if role_str else None

    # If role not present in token, try Supabase Admin API to fetch user metadata
    if not mapped:
        meta = _fetch_supabase_user_metadata(email)
        if meta:
            # Try common fields: user_metadata.role or role
            role_claim = (meta.get("user_metadata") or {}).get("role") or meta.get("role")
            if isinstance(role_claim, str):
                mapped = role_map.get(role_claim.lower())

    # Default to STUDENT when unsure
    role_enum = UserRole.STUDENT
    if mapped:
        try:
            role_enum = getattr(UserRole, mapped)
        except Exception:
            role_enum = UserRole.STUDENT

    # Ensure local user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, role=role_enum, full_name=payload.get("user_metadata", {}).get("full_name") or payload.get("name"))
        db.add(user)
        db.commit()
        db.refresh(user)


    # If student, ensure StudentProfile exists
    if user.role == UserRole.STUDENT and not user.student_profile:
        profile = StudentProfile(user_id=user.id, class_id=None)
        db.add(profile)
        db.commit()

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "name": user.full_name,
    }

def _fetch_supabase_user_metadata(email: str) -> Optional[dict]:
    """Fetch user metadata from Supabase Admin API using the service role key.

    Returns the first user object or None on failure / not found.
    """
    url = getattr(settings, "SUPABASE_URL", None)
    service_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
    if not url or not service_key:
        return None

    # Build admin URL
    admin_url = url.rstrip("/") + f"/admin/v1/users?email={urllib.parse.quote(email)}"
    req = urllib.request.Request(admin_url, method="GET")
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("apikey", service_key)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read()
            data = json.loads(body)
            # Supabase returns a list of users
            if isinstance(data, list) and len(data) > 0:
                return data[0]
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None

    


# ---------------- REAL USER INFO ----------------
@router.get("/me")
def get_me(
    payload=Depends(require_user),
    db: Session = Depends(get_db),
):
    email = payload.get("email")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "name": user.full_name,
    }
