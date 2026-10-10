from dataclasses import dataclass
import jwt
from fastapi import Header, HTTPException
from .config import SUPABASE_JWT_SECRET


@dataclass
class CurrentUser:
    user_id: str
    email: str | None


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:].strip()
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    return CurrentUser(user_id=payload["sub"], email=payload.get("email"))
