import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/search", tags=["search"])

_SEARCH_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}


def _membership(user: CurrentUser) -> str:
    now = time.time()
    if user.user_id in _SEARCH_MEMBERSHIP_CACHE:
        exp, cid = _SEARCH_MEMBERSHIP_CACHE[user.user_id]
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
    _SEARCH_MEMBERSHIP_CACHE[user.user_id] = (now + 60.0, cid)
    return cid


def make_initials(name: str) -> str:
    parts = name.strip().split()
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@router.get("")
def global_search(
    q: str = Query("", min_length=0),
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)
    query = q.strip()
    if not query or len(query) < 2:
        return {
            "q": query,
            "notices": [],
            "resources": [],
            "doubts": [],
            "people": [],
            "total_count": 0,
        }

    q_filter = f"%{query}%"

    # 1. Search Notices
    notices_res = (
        supabase_admin.table("notices")
        .select("id, title, content, category, is_pinned, published_at")
        .eq("class_id", class_id)
        .or_(f"title.ilike.{q_filter},content.ilike.{q_filter}")
        .order("is_pinned", desc=True)
        .order("published_at", desc=True)
        .limit(5)
        .execute()
    )
    notices = notices_res.data or []

    # 2. Search Resources
    resources_res = (
        supabase_admin.table("resources")
        .select("id, title, description, kind, unit, subjects(name, code)")
        .eq("class_id", class_id)
        .or_(f"title.ilike.{q_filter},description.ilike.{q_filter}")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    resources = resources_res.data or []
    for r in resources:
        subj = r.pop("subjects", None)
        if isinstance(subj, dict):
            r["subject_name"] = subj.get("name")
            r["subject_code"] = subj.get("code")

    # 3. Search Doubts
    doubts_res = (
        supabase_admin.table("doubts")
        .select("id, title, body, status, answer_count, subjects(name, code)")
        .eq("class_id", class_id)
        .or_(f"title.ilike.{q_filter},body.ilike.{q_filter}")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    doubts = doubts_res.data or []
    for d in doubts:
        subj = d.pop("subjects", None)
        if isinstance(subj, dict):
            d["subject_name"] = subj.get("name")
            d["subject_code"] = subj.get("code")

    # 4. Search People
    members_res = (
        supabase_admin.table("class_memberships")
        .select("user_id")
        .eq("class_id", class_id)
        .eq("status", "active")
        .execute()
    )
    member_ids = [m["user_id"] for m in (members_res.data or [])]

    people = []
    if member_ids:
        profiles_res = (
            supabase_admin.table("profiles")
            .select("id, display_name, bio, role, skills, show_bio, show_skills")
            .in_("id", member_ids)
            .ilike("display_name", q_filter)
            .limit(5)
            .execute()
        )
        for p in (profiles_res.data or []):
            name = p.get("display_name") or "Classmate"
            people.append({
                "id": p["id"],
                "display_name": name,
                "initials": make_initials(name),
                "role": p.get("role", "member"),
                "bio": p.get("bio") if p.get("show_bio", True) else None,
                "skills": (p.get("skills") or []) if p.get("show_skills", True) else [],
            })

    total_count = len(notices) + len(resources) + len(doubts) + len(people)

    return {
        "q": query,
        "notices": notices,
        "resources": resources,
        "doubts": doubts,
        "people": people,
        "total_count": total_count,
    }
