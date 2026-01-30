# app/core/security/encryption.py

import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

_JOURNAL_KEY_ENV = "JOURNAL_FERNET_KEY"

_key = os.environ.get(_JOURNAL_KEY_ENV)
if not _key:
    # Dev ke liye error clear rakho
    raise RuntimeError(
        f"{_JOURNAL_KEY_ENV} environment variable not set. "
        "Generate one with:\n"
        "  from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\n"
        "and put it in your env."
    )

if isinstance(_key, str):
    _key_bytes = _key.encode("utf-8")
else:
    _key_bytes = _key

fernet = Fernet(_key_bytes)


def encrypt_text(plain: Optional[str]) -> Optional[str]:
    if plain is None or plain == "":
        return None
    return fernet.encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_text(token: Optional[str]) -> Optional[str]:
    if token is None:
        return None
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Agar purane data plaintext hai (dev), to as-is return kar do
        return token