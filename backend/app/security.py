from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac
from hmac import compare_digest, new as hmac_new
import base64
import json
import os

from .config import settings


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = pbkdf2_hmac("sha256", password.encode(), salt, 210_000)
    return f"pbkdf2_sha256$210000${_b64_encode(salt)}${_b64_encode(digest)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = pbkdf2_hmac(
            "sha256", password.encode(), _b64_decode(salt), int(rounds)
        )
        return compare_digest(_b64_encode(digest), expected)
    except (ValueError, TypeError):
        return False


def create_token(user_id: int, role: str) -> str:
    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.token_minutes)
    payload = _b64_encode(
        json.dumps(
            {"sub": str(user_id), "role": role, "exp": int(expires.timestamp())}
        ).encode()
    )
    signature = _b64_encode(
        hmac_new(
            settings.app_secret.encode(), f"{header}.{payload}".encode(), "sha256"
        ).digest()
    )
    return f"{header}.{payload}.{signature}"


def decode_token(token: str) -> dict[str, object] | None:
    try:
        header, payload, signature = token.split(".")
        expected = _b64_encode(
            hmac_new(
                settings.app_secret.encode(),
                f"{header}.{payload}".encode(),
                "sha256",
            ).digest()
        )
        if not compare_digest(signature, expected):
            return None
        data = json.loads(_b64_decode(payload))
        if int(data["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return data
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None
