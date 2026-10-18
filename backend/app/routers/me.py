import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(tags=["me"])

_ME_CACHE: dict[str, tuple[float, dict]] = {}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=50)
    bio: Optional[str] = Field(None, max_length=300)
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    can_help_with: Optional[List[str]] = None
    currently_learning: Optional[List[str]] = None


class PrivacyUpdate(BaseModel):
    show_avatar: Optional[bool] = None
    show_bio: Optional[bool] = None
    show_skills: Optional[bool] = None
    show_interests: Optional[bool] = None
    show_contributions: Optional[bool] = None


def _clean_tags(tags: Optional[List[str]], max_tags: int = 15) -> List[str]:
    if not tags:
        return []
    cleaned = []
    for t in tags:
        s = str(t).strip()
        if s and s not in cleaned:
            cleaned.append(s[:40])
    return cleaned[:max_tags]


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    now = time.time()
    if user.user_id in _ME_CACHE:
        exp, cached = _ME_CACHE[user.user_id]
        if now < exp:
            return cached

    p = supabase_admin.table("profiles").select("*").eq("id", user.user_id).maybe_single().execute()
    m = (
        supabase_admin.table("class_memberships")
        .select("class_id,status,joined_at")
        .eq("user_id", user.user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    res = {
        "id": user.user_id,
        "email": user.email,
        "profile": p.data if p else None,
        "class_id": m.data["class_id"] if m and m.data else None,
        "joined_at": m.data.get("joined_at") if m and m.data else None,
    }
    _ME_CACHE[user.user_id] = (now + 60.0, res)
    return res


@router.patch("/me/profile")
def update_profile(body: ProfileUpdate, user: CurrentUser = Depends(get_current_user)):
    updates = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip()
    if body.bio is not None:
        updates["bio"] = body.bio.strip()
    if body.skills is not None:
        updates["skills"] = _clean_tags(body.skills, 15)
    if body.interests is not None:
        updates["interests"] = _clean_tags(body.interests, 15)
    if body.can_help_with is not None:
        updates["can_help_with"] = _clean_tags(body.can_help_with, 10)
    if body.currently_learning is not None:
        updates["currently_learning"] = _clean_tags(body.currently_learning, 10)

    if not updates:
        raise HTTPException(400, "No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = (
        supabase_admin.table("profiles")
        .update(updates)
        .eq("id", user.user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(500, "Failed to update profile")

    # Invalidate cache
    _ME_CACHE.pop(user.user_id, None)
    return res.data[0]


@router.get("/me/privacy")
def get_privacy(user: CurrentUser = Depends(get_current_user)):
    p = (
        supabase_admin.table("profiles")
        .select("show_avatar,show_bio,show_skills,show_interests,show_contributions")
        .eq("id", user.user_id)
        .maybe_single()
        .execute()
    )
    if not p or not p.data:
        raise HTTPException(404, "Profile not found")
    return p.data


@router.patch("/me/privacy")
def update_privacy(body: PrivacyUpdate, user: CurrentUser = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No privacy settings provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = (
        supabase_admin.table("profiles")
        .update(updates)
        .eq("id", user.user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(500, "Failed to update privacy settings")

    _ME_CACHE.pop(user.user_id, None)
    return res.data[0]


@router.get("/me/export")
def export_my_data(user: CurrentUser = Depends(get_current_user)):
    # 1. Profile
    profile = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user.user_id)
        .maybe_single()
        .execute()
        .data
    )

    # 2. Resources uploaded
    resources = (
        supabase_admin.table("resources")
        .select("id, title, description, kind, file_name, file_size, download_count, save_count, created_at")
        .eq("uploaded_by", user.user_id)
        .execute()
        .data
        or []
    )

    # 3. Doubts asked
    doubts = (
        supabase_admin.table("doubts")
        .select("id, title, body, status, tags, answer_count, follow_count, created_at")
        .eq("asked_by", user.user_id)
        .execute()
        .data
        or []
    )

    # 4. Answers given
    answers = (
        supabase_admin.table("answers")
        .select("id, doubt_id, body, is_accepted, helpful_count, created_at")
        .eq("answered_by", user.user_id)
        .execute()
        .data
        or []
    )

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user_id": user.user_id,
        "email": user.email,
        "profile": profile,
        "resources_uploaded": resources,
        "doubts_asked": doubts,
        "answers_given": answers,
    }


@router.get("/me/saved")
def get_my_saved(user: CurrentUser = Depends(get_current_user)):
    # 1. Fetch saved resources
    saves_res = (
        supabase_admin.table("resource_saves")
        .select("resource_id, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", desc=True)
        .execute()
    )
    saved_ids = [s["resource_id"] for s in (saves_res.data or [])]
    resources = []
    if saved_ids:
        r_res = (
            supabase_admin.table("resources")
            .select("id, title, description, kind, unit, download_count, save_count, created_at, subjects(name, code)")
            .in_("id", saved_ids)
            .execute()
        )
        resources = r_res.data or []
        for r in resources:
            r["is_saved"] = True
            subj = r.pop("subjects", None)
            if isinstance(subj, dict):
                r["subject"] = subj

    # 2. Fetch followed doubts
    follows_res = (
        supabase_admin.table("doubt_follows")
        .select("doubt_id, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", desc=True)
        .execute()
    )
    doubt_ids = [f["doubt_id"] for f in (follows_res.data or [])]
    doubts = []
    if doubt_ids:
        d_res = (
            supabase_admin.table("doubts")
            .select("id, title, body, status, answer_count, follow_count, created_at, subjects(name, code)")
            .in_("id", doubt_ids)
            .execute()
        )
        doubts = d_res.data or []
        for d in doubts:
            d["is_followed"] = True
            subj = d.pop("subjects", None)
            if isinstance(subj, dict):
                d["subject"] = subj

    return {
        "saved_resources": resources,
        "followed_doubts": doubts,
    }


@router.get("/me/activity")
def get_my_activity(user: CurrentUser = Depends(get_current_user)):
    # My doubts
    doubts = (
        supabase_admin.table("doubts")
        .select("id, title, status, answer_count, follow_count, created_at, subjects(name, code)")
        .eq("asked_by", user.user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    for d in doubts:
        subj = d.pop("subjects", None)
        if isinstance(subj, dict):
            d["subject"] = subj

    # My answers
    answers = (
        supabase_admin.table("answers")
        .select("id, doubt_id, body, is_accepted, helpful_count, created_at, doubts(id, title, status)")
        .eq("answered_by", user.user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    for a in answers:
        d = a.pop("doubts", None)
        if isinstance(d, dict):
            a["doubt"] = d

    # My resources
    resources = (
        supabase_admin.table("resources")
        .select("id, title, kind, unit, download_count, save_count, created_at, subjects(name, code)")
        .eq("uploaded_by", user.user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    for r in resources:
        subj = r.pop("subjects", None)
        if isinstance(subj, dict):
            r["subject"] = subj

    return {
        "doubts": doubts,
        "answers": answers,
        "resources": resources,
    }
