from dataclasses import dataclass
import jwt
from fastapi import Header, HTTPException
from .config import SUPABASE_JWT_SECRET
from .db import supabase_admin


@dataclass
class CurrentUser:
    user_id: str
    email: str | None


import time

_TOKEN_CACHE: dict[str, tuple[float, CurrentUser]] = {}

def get_current_user(authorization: str | None = Header(None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = authorization[7:].strip()

    # Check memory cache (30s TTL)
    now = time.time()
    if token in _TOKEN_CACHE:
        exp, user = _TOKEN_CACHE[token]
        if now < exp:
            return user

    # Fast local cryptographic JWT decode (0.1ms)
    if SUPABASE_JWT_SECRET and SUPABASE_JWT_SECRET != "your-jwt-secret":
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user = CurrentUser(user_id=payload["sub"], email=payload.get("email"))
            _TOKEN_CACHE[token] = (now + 30.0, user)
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "Session expired, please log in again")
        except jwt.InvalidTokenError:
            pass

    # Fallback to Supabase GoTrue server verification
    try:
        user_res = supabase_admin.auth.get_user(token)
        if user_res and user_res.user:
            user = CurrentUser(user_id=user_res.user.id, email=user_res.user.email)
            _TOKEN_CACHE[token] = (now + 30.0, user)
            return user
    except Exception:
        pass

    raise HTTPException(401, "Invalid or expired token")

