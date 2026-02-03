# app/core/security/supabase_jwt.py

from __future__ import annotations

import json
import time
import urllib.request
import urllib.error
from typing import Any

from jose import jwk, jwt

from app.core.config import settings

_JWKS_CACHE: dict[str, Any] | None = None
_JWKS_CACHE_AT: float | None = None
_JWKS_TTL_SECONDS = 60 * 10  # 10 minutes


def _jwks_urls() -> list[str]:
    if getattr(settings, "SUPABASE_JWKS_URL", None):
        return [settings.SUPABASE_JWKS_URL]
    if getattr(settings, "SUPABASE_URL", None):
        base = settings.SUPABASE_URL.rstrip("/")
        return [
            base + "/auth/v1/keys",
            base + "/auth/v1/.well-known/jwks.json",
        ]
    return []


def _fetch_jwks() -> dict[str, Any] | None:
    global _JWKS_CACHE, _JWKS_CACHE_AT

    now = time.time()
    if _JWKS_CACHE and _JWKS_CACHE_AT and (now - _JWKS_CACHE_AT) < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE

    urls = _jwks_urls()
    if not urls:
        return None

    apikey = (
        getattr(settings, "SUPABASE_ANON_KEY", None)
        or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
    )
    for url in urls:
        req = urllib.request.Request(url, method="GET")
        # Supabase JWKS endpoint may require apikey header.
        if apikey:
            req.add_header("apikey", apikey)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                body = resp.read()
                data = json.loads(body)
                if isinstance(data, dict) and "keys" in data:
                    _JWKS_CACHE = data
                    _JWKS_CACHE_AT = now
                    return data
        except urllib.error.HTTPError:
            continue
        except Exception:
            continue

    return None


def verify_supabase_jwt(token: str) -> dict:
    """
    Verify a Supabase JWT. Supports:
    - Legacy HS256 via SUPABASE_JWT_SECRET
    - RS256 via Supabase JWKS (default for new projects)
    """
    # 1) Try HS256 legacy secret if configured
    if getattr(settings, "SUPABASE_JWT_SECRET", None):
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except Exception:
            pass

    # 2) Try JWKS (RS256 / ECDSA)
    jwks = _fetch_jwks()
    if not jwks:
        raise Exception("JWKS not available for token verification")

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise Exception("Token missing kid header")

    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise Exception("JWKS key not found for token kid")

    key_obj = jwk.construct(key)
    return jwt.decode(
        token,
        key_obj,
        algorithms=[key.get("alg", "RS256")],
        audience="authenticated",
    )
