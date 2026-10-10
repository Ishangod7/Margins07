from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from ..db import supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=60)
    invite_code: str


@router.post("/signup")
def signup(body: SignupRequest):
    cls = (
        supabase_admin.table("classes")
        .select("id")
        .eq("invite_code", body.invite_code.strip().upper())
        .maybe_single()
        .execute()
    )
    if not cls or not cls.data:
        raise HTTPException(400, "Invalid invite code. Check with your CR for the current code.")
    class_id = cls.data["id"]

    try:
        created = supabase_admin.auth.admin.create_user(
            {"email": body.email, "password": body.password, "email_confirm": True}
        )
    except Exception as e:
        msg = str(e)
        if "already" in msg.lower():
            raise HTTPException(409, "An account with this email already exists.")
        raise HTTPException(400, msg)
    uid = created.user.id

    try:
        supabase_admin.table("profiles").insert(
            {"id": uid, "display_name": body.display_name.strip(), "role": "member"}
        ).execute()
        supabase_admin.table("class_memberships").insert(
            {"user_id": uid, "class_id": class_id, "status": "active"}
        ).execute()
    except Exception as e:
        supabase_admin.auth.admin.delete_user(uid)
        raise HTTPException(500, f"Could not finish signup: {e}")
    return {"ok": True}
