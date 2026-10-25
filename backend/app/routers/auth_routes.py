import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from ..db import supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory rate limiting for signup attempts: {ip: [timestamps]}
_SIGNUP_ATTEMPTS: dict[str, list[float]] = {}
_MAX_ATTEMPTS_PER_WINDOW = 10
_WINDOW_SECONDS = 300  # 5 minutes


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=60)
    invite_code: str
    consent_privacy: bool = Field(default=True, description="Affirmative consent to Privacy Notice under DPDP Act 2023")
    consent_terms: bool = Field(default=True, description="Affirmative agreement to Terms of Use")


@router.post("/signup")
def signup(body: SignupRequest, request: Request):
    # 1. Rate limiting check
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    history = _SIGNUP_ATTEMPTS.setdefault(client_ip, [])
    # Evict older than window
    _SIGNUP_ATTEMPTS[client_ip] = [t for t in history if now - t < _WINDOW_SECONDS]
    if len(_SIGNUP_ATTEMPTS[client_ip]) >= _MAX_ATTEMPTS_PER_WINDOW:
        raise HTTPException(
            429,
            "Too many registration attempts from this connection. Please wait 5 minutes before trying again."
        )
    _SIGNUP_ATTEMPTS[client_ip].append(now)

    # 2. Consent checks (DPDP Act affirmative consent)
    if not body.consent_privacy:
        raise HTTPException(
            400,
            "Affirmative consent to the Privacy Notice is required to register an account."
        )
    if not body.consent_terms:
        raise HTTPException(
            400,
            "Agreement to the Margins Community Terms of Use is required to register."
        )

    # 3. College email domain validation
    email_clean = str(body.email).strip().lower()
    allowed_domains = ("@tcetmumbai.in", "@student.tcetmumbai.in")
    is_college_domain = any(email_clean.endswith(d) for d in allowed_domains)
    # Allow admin/founder fallback domains for development
    is_whitelisted = email_clean in ("guptaishan973@gmail.com", "guptaishan369@gmail.com", "zoro29541@gmail.com")
    if not is_college_domain and not is_whitelisted:
        raise HTTPException(
            400,
            "Margins is restricted to TCET students. Please register with your college email ending in @tcetmumbai.in."
        )

    # 4. Invite code verification
    cls = (
        supabase_admin.table("classes")
        .select("id")
        .eq("invite_code", body.invite_code.strip().upper())
        .maybe_single()
        .execute()
    )
    if not cls or not cls.data:
        raise HTTPException(
            400,
            "Invalid or expired invite code. Please contact your Class Representative (CR) for the active Division A code."
        )
    class_id = cls.data["id"]

    # 5. User creation
    try:
        created = supabase_admin.auth.admin.create_user(
            {"email": email_clean, "password": body.password, "email_confirm": True}
        )
    except Exception as e:
        msg = str(e)
        if "already" in msg.lower():
            raise HTTPException(409, "An account with this college email already exists. Please log in.")
        raise HTTPException(400, msg)
    uid = created.user.id

    # 6. Profile & Membership
    try:
        supabase_admin.table("profiles").insert(
            {"id": uid, "display_name": body.display_name.strip(), "role": "member"}
        ).execute()
        supabase_admin.table("class_memberships").insert(
            {"user_id": uid, "class_id": class_id, "status": "active"}
        ).execute()
    except Exception as e:
        supabase_admin.auth.admin.delete_user(uid)
        raise HTTPException(500, f"Could not complete registration profile setup: {e}")

    return {"ok": True, "message": "Account created successfully."}

