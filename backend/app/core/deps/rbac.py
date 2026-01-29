# app/core/deps/rbac.py

from fastapi import HTTPException

def enforce_role(payload: dict, expected: str):
    if payload.get("role") != expected:
        raise HTTPException(status_code=404)
