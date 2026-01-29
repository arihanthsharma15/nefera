# app/api/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.security.jwt import sign_demo_token
from app.core.constants import ROLES

router = APIRouter(tags=["auth"])


class DemoLoginRequest(BaseModel):
    password: str
    role: str


@router.post("/demo-login")
def demo_login(data: DemoLoginRequest):
    if data.password != settings.DEMO_PASSWORD:
        raise HTTPException(status_code=404)


    if data.role not in ROLES.values():
        raise HTTPException(status_code=404)

    token = sign_demo_token(data.role)

    return {
        "token": token,
        "role": data.role
    }
