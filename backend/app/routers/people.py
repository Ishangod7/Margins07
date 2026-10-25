import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/people", tags=["people"])

_PEOPLE_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}
_PEOPLE_CACHE: dict[str, tuple[float, list]] = {}


def _membership(user: CurrentUser) -> str:
    now = time.time()
    if user.user_id in _PEOPLE_MEMBERSHIP_CACHE:
        exp, cid = _PEOPLE_MEMBERSHIP_CACHE[user.user_id]
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
    _PEOPLE_MEMBERSHIP_CACHE[user.user_id] = (now + 60.0, cid)
    return cid


def make_initials(name: str) -> str:
    parts = name.strip().split()
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@router.get("")
def list_people(
    q: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)
    now = time.time()

    # 1. Fetch all active memberships for this class
    members_res = (
        supabase_admin.table("class_memberships")
        .select("user_id, joined_at")
        .eq("class_id", class_id)
        .eq("status", "active")
        .execute()
    )
    members = members_res.data or []
    if not members:
        return []

    user_ids = [m["user_id"] for m in members]
    joined_map = {m["user_id"]: m.get("joined_at") for m in members}

    # 2. Fetch profiles
    profiles_res = (
        supabase_admin.table("profiles")
        .select("*")
        .in_("id", user_ids)
        .execute()
    )
    profiles = profiles_res.data or []

    # 3. Aggregate contribution stats across class
    res_data = (
        supabase_admin.table("resources")
        .select("created_by")
        .eq("class_id", class_id)
        .execute()
        .data
        or []
    )
    resources_counts: Dict[str, int] = {}
    for r in res_data:
        uid = r.get("created_by")
        if uid:
            resources_counts[uid] = resources_counts.get(uid, 0) + 1

    ans_data = (
        supabase_admin.table("answers")
        .select("created_by, is_accepted")
        .execute()
        .data
        or []
    )
    answers_counts: Dict[str, int] = {}
    accepted_counts: Dict[str, int] = {}
    for a in ans_data:
        uid = a.get("created_by")
        if uid:
            answers_counts[uid] = answers_counts.get(uid, 0) + 1
            if a.get("is_accepted"):
                accepted_counts[uid] = accepted_counts.get(uid, 0) + 1

    # 4. Filter and apply privacy protections
    people = []
    q_lower = q.lower().strip() if q else ""
    skill_lower = skill.lower().strip() if skill else ""

    for p in profiles:
        uid = p["id"]
        is_self = uid == user.user_id

        show_bio = p.get("show_bio", True) or is_self
        show_skills = p.get("show_skills", True) or is_self
        show_interests = p.get("show_interests", True) or is_self
        show_contributions = p.get("show_contributions", True) or is_self

        name = p.get("display_name") or "Classmate"
        bio = p.get("bio") if show_bio else None
        skills = p.get("skills") or []
        if not show_skills:
            skills = []
        interests = p.get("interests") or []
        if not show_interests:
            interests = []
        can_help_with = p.get("can_help_with") or []
        currently_learning = p.get("currently_learning") or []

        # Search matching
        if q_lower:
            text_corpus = f"{name} {bio or ''} {' '.join(skills)} {' '.join(interests)} {' '.join(can_help_with)} {' '.join(currently_learning)}".lower()
            if q_lower not in text_corpus:
                continue

        if skill_lower:
            skills_lower = [s.lower() for s in skills]
            if skill_lower not in skills_lower:
                continue

        contributions = None
        if show_contributions:
            contributions = {
                "resources_count": resources_counts.get(uid, 0),
                "answers_count": answers_counts.get(uid, 0),
                "accepted_count": accepted_counts.get(uid, 0),
            }

        people.append(
            {
                "id": uid,
                "display_name": name,
                "initials": make_initials(name),
                "role": p.get("role", "member"),
                "avatar_path": p.get("avatar_path") if p.get("show_avatar", True) or is_self else None,
                "bio": bio,
                "skills": skills,
                "interests": interests,
                "can_help_with": can_help_with,
                "currently_learning": currently_learning,
                "contributions": contributions,
                "is_self": is_self,
                "joined_at": joined_map.get(uid),
            }
        )

    # Sort: CRs first, then alphabetical by name
    people.sort(key=lambda x: (0 if x["role"] == "cr" else 1, x["display_name"].lower()))
    return people


@router.get("/{person_id}")
def get_person(
    person_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)
    is_self = person_id == user.user_id

    # Verify target person is in the same class
    m = (
        supabase_admin.table("class_memberships")
        .select("joined_at")
        .eq("user_id", person_id)
        .eq("class_id", class_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    if not m or not m.data:
        raise HTTPException(404, "Student not found in your class")

    p = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", person_id)
        .maybe_single()
        .execute()
    )
    if not p or not p.data:
        raise HTTPException(404, "Student profile not found")

    profile = p.data
    show_bio = profile.get("show_bio", True) or is_self
    show_skills = profile.get("show_skills", True) or is_self
    show_interests = profile.get("show_interests", True) or is_self
    show_contributions = profile.get("show_contributions", True) or is_self

    name = profile.get("display_name") or "Classmate"
    bio = profile.get("bio") if show_bio else None
    skills = (profile.get("skills") or []) if show_skills else []
    interests = (profile.get("interests") or []) if show_interests else []

    contributions = None
    recent_resources = []
    recent_answers = []

    if show_contributions:
        # Fetch resources uploaded by this person
        res_list = (
            supabase_admin.table("resources")
            .select("id, title, kind, unit, download_count, save_count, created_at, subject_id")
            .eq("created_by", person_id)
            .eq("class_id", class_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
            .data
            or []
        )
        recent_resources = res_list

        # Fetch answers
        ans_list = (
            supabase_admin.table("answers")
            .select("id, body, is_accepted, helpful_count, created_at, doubt_id")
            .eq("created_by", person_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
            .data
            or []
        )
        # Fetch doubt titles for these answers
        if ans_list:
            doubt_ids = list({a["doubt_id"] for a in ans_list if a.get("doubt_id")})
            doubts_res = (
                supabase_admin.table("doubts")
                .select("id, title, status")
                .in_("id", doubt_ids)
                .execute()
                .data
                or []
            )
            d_map = {d["id"]: d for d in doubts_res}
            for a in ans_list:
                a["doubt"] = d_map.get(a.get("doubt_id"))
        recent_answers = ans_list

        # Compute summary counts
        res_count = len(recent_resources)
        ans_count = len(recent_answers)
        accepted_count = sum(1 for a in recent_answers if a.get("is_accepted"))

        contributions = {
            "resources_count": res_count,
            "answers_count": ans_count,
            "accepted_count": accepted_count,
            "recent_resources": recent_resources,
            "recent_answers": recent_answers,
        }

    return {
        "id": person_id,
        "display_name": name,
        "initials": make_initials(name),
        "role": profile.get("role", "member"),
        "avatar_path": profile.get("avatar_path") if profile.get("show_avatar", True) or is_self else None,
        "bio": bio,
        "skills": skills,
        "interests": interests,
        "can_help_with": profile.get("can_help_with") or [],
        "currently_learning": profile.get("currently_learning") or [],
        "contributions": contributions,
        "is_self": is_self,
        "joined_at": m.data.get("joined_at"),
    }
