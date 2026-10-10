from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/notices", tags=["notices"])
CATEGORIES = {"Academic", "Deadline", "Exam", "Assignment", "General", "Important"}


import time

_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}

def _membership(user: CurrentUser) -> str:
    now = time.time()
    if user.user_id in _MEMBERSHIP_CACHE:
        exp, cid = _MEMBERSHIP_CACHE[user.user_id]
        if now < exp:
            return cid

    m = (
        supabase_admin.table("class_memberships")
        .select("class_id")
        .eq("user_id", user.user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    if not m or not m.data:
        raise HTTPException(403, "You are not an active member of a class")
    cid = m.data["class_id"]
    _MEMBERSHIP_CACHE[user.user_id] = (now + 60.0, cid)
    return cid


def _require_cr(user: CurrentUser) -> str:
    class_id = _membership(user)
    p = supabase_admin.table("profiles").select("role").eq("id", user.user_id).maybe_single().execute()
    if not p or not p.data or p.data["role"] != "cr":
        raise HTTPException(403, "Only the CR can do this")
    return class_id


class NoticeIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1, max_length=5000)
    category: str = "General"


@router.get("")
def list_notices(user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    rows = (
        supabase_admin.table("notices")
        .select("*")
        .eq("class_id", class_id)
        .order("is_pinned", desc=True)
        .order("published_at", desc=True)
        .execute()
        .data
    )
    ids = list({r["created_by"] for r in rows if r.get("created_by")})
    names = {}
    if ids:
        for p in supabase_admin.table("profiles").select("id,display_name").in_("id", ids).execute().data:
            names[p["id"]] = p["display_name"]
    for r in rows:
        r["author_name"] = names.get(r.get("created_by"))
    return rows


@router.post("", status_code=201)
def create_notice(body: NoticeIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _require_cr(user)
    if body.category not in CATEGORIES:
        raise HTTPException(400, "Invalid category")
    res = (
        supabase_admin.table("notices")
        .insert({"class_id": class_id, "title": body.title.strip(), "content": body.content.strip(),
                 "category": body.category, "created_by": user.user_id})
        .execute()
    )
    return res.data[0]


def _own_notice(notice_id: str, class_id: str):
    n = supabase_admin.table("notices").select("id,is_pinned,class_id").eq("id", notice_id).maybe_single().execute()
    if not n or not n.data or n.data["class_id"] != class_id:
        raise HTTPException(404, "Notice not found")
    return n.data


@router.patch("/{notice_id}/pin")
def toggle_pin(notice_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _require_cr(user)
    n = _own_notice(notice_id, class_id)
    res = supabase_admin.table("notices").update({"is_pinned": not n["is_pinned"]}).eq("id", notice_id).execute()
    return res.data[0]


@router.delete("/{notice_id}", status_code=204)
def delete_notice(notice_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _require_cr(user)
    _own_notice(notice_id, class_id)
    supabase_admin.table("notices").delete().eq("id", notice_id).execute()
