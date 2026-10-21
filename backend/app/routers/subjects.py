import time
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/subjects", tags=["subjects"])

_SUBJ_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}


def _membership(user: CurrentUser) -> str:
    now = time.time()
    if user.user_id in _SUBJ_MEMBERSHIP_CACHE:
        exp, cid = _SUBJ_MEMBERSHIP_CACHE[user.user_id]
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
    _SUBJ_MEMBERSHIP_CACHE[user.user_id] = (now + 60.0, cid)
    return cid


def _matches_subject(tag: str, subject_name: str, subject_code: str) -> bool:
    t = tag.lower().strip()
    s_name = subject_name.lower().strip()
    s_code = subject_code.lower().strip()
    if t == s_code or t == s_name:
        return True
    if len(t) >= 3 and (t in s_name or s_name in t):
        return True
    return False


@router.get("")
def list_subject_hubs(user: CurrentUser = Depends(get_current_user)):
    """
    Returns all subjects for the user's class with aggregated stats:
    - resource_count
    - doubt_count
    - solved_doubt_count
    - helper_count (peers offering help for this subject)
    """
    class_id = _membership(user)

    # 1. Fetch subjects
    subjects_res = (
        supabase_admin.table("subjects")
        .select("id, class_id, name, code, semester")
        .eq("class_id", class_id)
        .order("name")
        .execute()
    )
    subjects = subjects_res.data or []

    # 2. Resources count map
    res_data = (
        supabase_admin.table("resources")
        .select("subject_id")
        .eq("class_id", class_id)
        .execute()
        .data or []
    )
    res_count_map: Dict[str, int] = {}
    for r in res_data:
        sid = r.get("subject_id")
        if sid:
            res_count_map[sid] = res_count_map.get(sid, 0) + 1

    # 3. Doubts count map
    doubts_data = (
        supabase_admin.table("doubts")
        .select("subject_id, status")
        .eq("class_id", class_id)
        .execute()
        .data or []
    )
    doubt_count_map: Dict[str, int] = {}
    solved_count_map: Dict[str, int] = {}
    for d in doubts_data:
        sid = d.get("subject_id")
        if sid:
            doubt_count_map[sid] = doubt_count_map.get(sid, 0) + 1
            if d.get("status") == "solved":
                solved_count_map[sid] = solved_count_map.get(sid, 0) + 1

    # 4. Classmate mentors map
    memberships = (
        supabase_admin.table("class_memberships")
        .select("user_id")
        .eq("class_id", class_id)
        .eq("status", "active")
        .execute()
        .data or []
    )
    member_ids = [m["user_id"] for m in memberships]

    profiles = []
    if member_ids:
        profiles = (
            supabase_admin.table("profiles")
            .select("id, skills, can_help_with")
            .in_("id", member_ids)
            .execute()
            .data or []
        )

    # Enrich subjects
    for s in subjects:
        sid = s["id"]
        s_name = s.get("name", "")
        s_code = s.get("code", "")
        s["resource_count"] = res_count_map.get(sid, 0)
        s["doubt_count"] = doubt_count_map.get(sid, 0)
        s["solved_doubt_count"] = solved_count_map.get(sid, 0)

        # Count peers who can help with this subject
        helpers = 0
        for p in profiles:
            can_help = p.get("can_help_with") or []
            skills = p.get("skills") or []
            tags = can_help + skills
            if any(_matches_subject(tag, s_name, s_code) for tag in tags):
                helpers += 1
        s["helper_count"] = helpers

    return subjects


@router.get("/{subject_id}")
def get_subject_hub(subject_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    Returns a unified Subject Hub view:
    - Subject metadata
    - All resources for this subject (notes, pyqs, etc.)
    - All doubts for this subject
    - Peer helpers/mentors in the class
    - Units breakdown (Unit 1 to Unit 6)
    """
    class_id = _membership(user)

    # 1. Fetch Subject
    subj_res = (
        supabase_admin.table("subjects")
        .select("id, class_id, name, code, semester")
        .eq("id", subject_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not subj_res or not subj_res.data:
        raise HTTPException(404, "Subject not found in your class")
    subject = subj_res.data

    # 2. Fetch Resources for this subject
    resources_res = (
        supabase_admin.table("resources")
        .select("id, title, description, kind, unit, tags, file_name, file_size, mime_type, external_url, save_count, created_at, uploader_id, profiles(display_name)")
        .eq("subject_id", subject_id)
        .eq("class_id", class_id)
        .order("created_at", desc=True)
        .execute()
    )
    raw_resources = resources_res.data or []

    # Check user saves for these resources
    saved_ids = set()
    if raw_resources:
        r_ids = [r["id"] for r in raw_resources]
        saves_res = (
            supabase_admin.table("resource_saves")
            .select("resource_id")
            .eq("user_id", user.user_id)
            .in_("resource_id", r_ids)
            .execute()
        )
        saved_ids = {s["resource_id"] for s in (saves_res.data or [])}

    resources = []
    unit_counts: Dict[str, int] = {f"Unit {i}": 0 for i in range(1, 7)}
    for r in raw_resources:
        prof = r.pop("profiles", None) or {}
        uploader_name = prof.get("display_name") if isinstance(prof, dict) else "Classmate"
        r["uploader_name"] = uploader_name
        r["is_saved"] = r["id"] in saved_ids
        r["is_mine"] = r.get("uploader_id") == user.user_id
        resources.append(r)

        u = r.get("unit")
        if u and u in unit_counts:
            unit_counts[u] += 1

    # 3. Fetch Doubts for this subject
    doubts_res = (
        supabase_admin.table("doubts")
        .select("id, title, body, status, answer_count, created_at, author_id, profiles(display_name)")
        .eq("subject_id", subject_id)
        .eq("class_id", class_id)
        .order("created_at", desc=True)
        .execute()
    )
    raw_doubts = doubts_res.data or []
    doubts = []
    for d in raw_doubts:
        prof = d.pop("profiles", None) or {}
        d["author_name"] = prof.get("display_name") if isinstance(prof, dict) else "Classmate"
        d["is_mine"] = d.get("author_id") == user.user_id
        doubts.append(d)

    # 4. Fetch Peer Helpers for this subject
    memberships = (
        supabase_admin.table("class_memberships")
        .select("user_id")
        .eq("class_id", class_id)
        .eq("status", "active")
        .execute()
        .data or []
    )
    member_ids = [m["user_id"] for m in memberships]

    helpers = []
    if member_ids:
        profiles_res = (
            supabase_admin.table("profiles")
            .select("id, display_name, bio, role, skills, can_help_with, show_bio, show_skills")
            .in_("id", member_ids)
            .execute()
        )
        for p in (profiles_res.data or []):
            if p["id"] == user.user_id:
                continue
            can_help = p.get("can_help_with") or []
            skills = p.get("skills") or []
            tags = can_help + skills
            if any(_matches_subject(tag, subject["name"], subject["code"]) for tag in tags):
                helpers.append({
                    "id": p["id"],
                    "display_name": p.get("display_name", "Classmate"),
                    "role": p.get("role", "member"),
                    "bio": p.get("bio") if p.get("show_bio", True) else None,
                    "skills": (p.get("skills") or []) if p.get("show_skills", True) else [],
                    "can_help_with": p.get("can_help_with") or [],
                })

    solved_doubts = sum(1 for d in doubts if d.get("status") == "solved")

    return {
        "subject": subject,
        "resources": resources,
        "doubts": doubts,
        "helpers": helpers,
        "units": unit_counts,
        "stats": {
            "total_resources": len(resources),
            "total_doubts": len(doubts),
            "solved_doubts": solved_doubts,
            "helper_count": len(helpers),
        },
    }
