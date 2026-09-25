import hashlib
import secrets
import hmac
import time
import base64
import json
from typing import Optional, Dict, Any
from app.config import settings

SECRET_KEY = getattr(settings, "SECRET_KEY", "nexyra_secret_auth_key_2026_super_secure")

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 rounds and random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt and PBKDF2 hash."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, key_hex = hashed_password.split("$")
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str, full_name: str, expires_in_seconds: int = 86400 * 7) -> str:
    """Creates a secure URL-safe HMAC-SHA256 signed access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "full_name": full_name,
        "exp": int(time.time()) + expires_in_seconds
    }
    data_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), data_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{data_b64}.{sig}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies token signature and checks expiration."""
    if not token or "." not in token:
        return None
    try:
        data_b64, sig = token.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), data_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data_b64.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
