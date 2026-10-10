from fastapi import APIRouter, Depends
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    p = supabase_admin.table("profiles").select("*").eq("id", user.user_id).maybe_single().execute()
    m = (
        supabase_admin.table("class_memberships")
        .select("class_id,status")
        .eq("user_id", user.user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    return {
        "id": user.user_id,
        "email": user.email,
        "profile": p.data if p else None,
        "class_id": m.data["class_id"] if m and m.data else None,
    }
