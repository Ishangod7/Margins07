import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/doubts", tags=["doubts"])

_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}
_SUBJECTS_MAP_CACHE: dict[str, tuple[float, dict]] = {}
_PROFILES_NAME_CACHE: dict[str, tuple[float, str]] = {}
_DOUBTS_CACHE: dict[str, tuple[float, list, dict, dict]] = {}


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


def _is_cr(user_id: str) -> bool:
    p = supabase_admin.table("profiles").select("role").eq("id", user_id).maybe_single().execute()
    return bool(p and p.data and p.data.get("role") == "cr")


def _get_profile_names(user_ids: list[str]) -> dict[str, str]:
    now = time.time()
    name_map = {}
    missing_ids = []
    for uid in set(user_ids):
        if uid in _PROFILES_NAME_CACHE and now < _PROFILES_NAME_CACHE[uid][0]:
            name_map[uid] = _PROFILES_NAME_CACHE[uid][1]
        else:
            missing_ids.append(uid)

    if missing_ids:
        profiles = supabase_admin.table("profiles").select("id, display_name").in_("id", missing_ids).execute().data or []
        for p in profiles:
            name_map[p["id"]] = p["display_name"]
            _PROFILES_NAME_CACHE[p["id"]] = (now + 300.0, p["display_name"])
    return name_map


class DoubtCreateIn(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    body: str = Field(min_length=5, max_length=5000)
    subject_id: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)


class AnswerCreateIn(BaseModel):
    body: str = Field(min_length=3, max_length=5000)


@router.get("")
def list_doubts(
    subject_id: Optional[str] = None,
    status: Optional[str] = None,
    mine: bool = False,
    q: Optional[str] = None,
    sort: str = "recent",
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)
    now = time.time()
    is_default = (not subject_id and not status and not mine and not q and sort == "recent")

    if is_default and class_id in _DOUBTS_CACHE and now < _DOUBTS_CACHE[class_id][0]:
        _, cached_doubts, sub_map, name_map = _DOUBTS_CACHE[class_id]
        doubts = [dict(d) for d in cached_doubts]
    else:
        query = supabase_admin.table("doubts").select("*").eq("class_id", class_id)

        if subject_id:
            query = query.eq("subject_id", subject_id)

        if status and status in ("open", "answered", "solved"):
            query = query.eq("status", status)

        if mine:
            query = query.eq("created_by", user.user_id)

        if q and q.strip():
            term = q.strip()
            query = query.or_(f"title.ilike.%{term}%,body.ilike.%{term}%")

        if sort == "unanswered":
            query = query.eq("answer_count", 0).order("created_at", desc=True)
        elif sort == "popular":
            query = query.order("follow_count", desc=True).order("answer_count", desc=True)
        else:
            query = query.order("created_at", desc=True)

        doubts = query.limit(50).execute().data or []

        # Resolve subjects
        sub_ids = [d["subject_id"] for d in doubts if d.get("subject_id")]
        sub_map = {}
        missing_sub_ids = []
        for sid in set(sub_ids):
            if sid in _SUBJECTS_MAP_CACHE and now < _SUBJECTS_MAP_CACHE[sid][0]:
                sub_map[sid] = _SUBJECTS_MAP_CACHE[sid][1]
            else:
                missing_sub_ids.append(sid)

        if missing_sub_ids:
            subs = supabase_admin.table("subjects").select("id, name, code").in_("id", missing_sub_ids).execute().data or []
            for s in subs:
                sub_map[s["id"]] = s
                _SUBJECTS_MAP_CACHE[s["id"]] = (now + 300.0, s)

        # Resolve author names
        author_ids = [d["created_by"] for d in doubts if d.get("created_by")]
        name_map = _get_profile_names(author_ids)

        if is_default:
            _DOUBTS_CACHE[class_id] = (now + 20.0, [dict(d) for d in doubts], sub_map, name_map)

    # Check follows for current user
    doubt_ids = [d["id"] for d in doubts]
    followed_ids = set()
    if doubt_ids:
        follows = (
            supabase_admin.table("doubt_follows")
            .select("doubt_id")
            .in_("doubt_id", doubt_ids)
            .eq("user_id", user.user_id)
            .execute()
            .data or []
        )
        followed_ids = {f["doubt_id"] for f in follows}

    for d in doubts:
        sid = d.get("subject_id")
        d["subject"] = sub_map.get(sid)
        d["author_name"] = name_map.get(d.get("created_by"), "Classmate")
        d["is_followed"] = d["id"] in followed_ids
        d["is_mine"] = d.get("created_by") == user.user_id

    return doubts


@router.post("", status_code=201)
def create_doubt(body: DoubtCreateIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    if body.subject_id:
        sub = (
            supabase_admin.table("subjects")
            .select("id")
            .eq("id", body.subject_id)
            .eq("class_id", class_id)
            .maybe_single()
            .execute()
        )
        if not sub or not sub.data:
            raise HTTPException(400, "Invalid subject selected for this class")

    clean_tags = [t.strip().lower() for t in (body.tags or []) if t.strip()][:5]

    row = {
        "class_id": class_id,
        "subject_id": body.subject_id,
        "title": body.title.strip(),
        "body": body.body.strip(),
        "status": "open",
        "tags": clean_tags,
        "created_by": user.user_id,
    }

    res = supabase_admin.table("doubts").insert(row).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create doubt")
    _DOUBTS_CACHE.pop(class_id, None)
    return res.data[0]


@router.get("/{doubt_id}")
def get_doubt_detail(doubt_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    doubt_res = (
        supabase_admin.table("doubts")
        .select("*")
        .eq("id", doubt_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not doubt_res or not doubt_res.data:
        raise HTTPException(404, "Doubt not found")

    doubt = doubt_res.data

    # Subject name
    if doubt.get("subject_id"):
        sid = doubt["subject_id"]
        now = time.time()
        if sid in _SUBJECTS_MAP_CACHE and now < _SUBJECTS_MAP_CACHE[sid][0]:
            doubt["subject"] = _SUBJECTS_MAP_CACHE[sid][1]
        else:
            s = supabase_admin.table("subjects").select("id, name, code").eq("id", sid).maybe_single().execute()
            if s and s.data:
                doubt["subject"] = s.data
                _SUBJECTS_MAP_CACHE[sid] = (now + 300.0, s.data)

    # Fetch answers for this doubt
    answers = (
        supabase_admin.table("answers")
        .select("*")
        .eq("doubt_id", doubt_id)
        .order("is_accepted", desc=True)
        .order("helpful_count", desc=True)
        .order("created_at", desc=False)
        .execute()
        .data or []
    )

    # Collect author IDs from both doubt and answers
    all_uids = [doubt["created_by"]] + [a["created_by"] for a in answers]
    name_map = _get_profile_names(all_uids)

    doubt["author_name"] = name_map.get(doubt["created_by"], "Classmate")
    doubt["is_mine"] = doubt["created_by"] == user.user_id

    # Check doubt follow
    follow = (
        supabase_admin.table("doubt_follows")
        .select("id")
        .eq("doubt_id", doubt_id)
        .eq("user_id", user.user_id)
        .maybe_single()
        .execute()
    )
    doubt["is_followed"] = bool(follow and follow.data)

    # Check votes by current user on answers
    answer_ids = [a["id"] for a in answers]
    voted_ids = set()
    if answer_ids:
        votes = (
            supabase_admin.table("answer_votes")
            .select("answer_id")
            .in_("answer_id", answer_ids)
            .eq("user_id", user.user_id)
            .execute()
            .data or []
        )
        voted_ids = {v["answer_id"] for v in votes}

    for a in answers:
        a["author_name"] = name_map.get(a["created_by"], "Classmate")
        a["is_mine"] = a["created_by"] == user.user_id
        a["has_voted"] = a["id"] in voted_ids

    doubt["answers"] = answers
    return doubt


@router.post("/{doubt_id}/answers", status_code=201)
def post_answer(doubt_id: str, body: AnswerCreateIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    # Verify doubt exists in class
    doubt = (
        supabase_admin.table("doubts")
        .select("id, class_id")
        .eq("id", doubt_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not doubt or not doubt.data:
        raise HTTPException(404, "Doubt not found in your class")

    row = {
        "doubt_id": doubt_id,
        "body": body.body.strip(),
        "created_by": user.user_id,
    }

    res = supabase_admin.table("answers").insert(row).execute()
    if not res.data:
        raise HTTPException(500, "Failed to post answer")
    return res.data[0]


@router.post("/{doubt_id}/follow")
def toggle_follow_doubt(doubt_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    doubt = (
        supabase_admin.table("doubts")
        .select("id, follow_count")
        .eq("id", doubt_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not doubt or not doubt.data:
        raise HTTPException(404, "Doubt not found")

    existing = (
        supabase_admin.table("doubt_follows")
        .select("id")
        .eq("doubt_id", doubt_id)
        .eq("user_id", user.user_id)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        supabase_admin.table("doubt_follows").delete().eq("doubt_id", doubt_id).eq("user_id", user.user_id).execute()
        return {"followed": False}
    else:
        supabase_admin.table("doubt_follows").insert({"doubt_id": doubt_id, "user_id": user.user_id}).execute()
        return {"followed": True}


@router.delete("/{doubt_id}", status_code=204)
def delete_doubt(doubt_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    doubt = (
        supabase_admin.table("doubts")
        .select("id, created_by")
        .eq("id", doubt_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not doubt or not doubt.data:
        raise HTTPException(404, "Doubt not found")

    d = doubt.data
    is_owner = d["created_by"] == user.user_id
    if not is_owner and not _is_cr(user.user_id):
        raise HTTPException(403, "Only the author or a CR can delete this doubt")

    supabase_admin.table("doubts").delete().eq("id", doubt_id).execute()
    return None


# =========================================================
# Answer Endpoints (accept & vote)
# =========================================================

answers_router = APIRouter(prefix="/answers", tags=["answers"])


@answers_router.post("/{answer_id}/accept")
def toggle_accept_answer(answer_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    ans = (
        supabase_admin.table("answers")
        .select("id, doubt_id, is_accepted, created_by")
        .eq("id", answer_id)
        .maybe_single()
        .execute()
    )
    if not ans or not ans.data:
        raise HTTPException(404, "Answer not found")

    answer = ans.data
    doubt_id = answer["doubt_id"]

    # Verify doubt belongs to class and caller is asker or CR
    d = (
        supabase_admin.table("doubts")
        .select("id, class_id, created_by, accepted_answer_id")
        .eq("id", doubt_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not d or not d.data:
        raise HTTPException(404, "Doubt not found")

    doubt = d.data
    is_asker = doubt["created_by"] == user.user_id
    if not is_asker and not _is_cr(user.user_id):
        raise HTTPException(403, "Only the student who asked this doubt can accept an answer")

    currently_accepted = answer.get("is_accepted", False)

    if currently_accepted:
        # Unaccept
        supabase_admin.table("answers").update({"is_accepted": False}).eq("id", answer_id).execute()
        supabase_admin.table("doubts").update({"status": "answered", "accepted_answer_id": None}).eq("id", doubt_id).execute()
        return {"is_accepted": False, "doubt_status": "answered"}
    else:
        # Unaccept any previous accepted answer for this doubt
        supabase_admin.table("answers").update({"is_accepted": False}).eq("doubt_id", doubt_id).execute()
        # Accept this one
        supabase_admin.table("answers").update({"is_accepted": True}).eq("id", answer_id).execute()
        supabase_admin.table("doubts").update({"status": "solved", "accepted_answer_id": answer_id}).eq("id", doubt_id).execute()
        return {"is_accepted": True, "doubt_status": "solved"}


@answers_router.post("/{answer_id}/vote")
def toggle_vote_answer(answer_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    ans = (
        supabase_admin.table("answers")
        .select("id, doubt_id, created_by, helpful_count")
        .eq("id", answer_id)
        .maybe_single()
        .execute()
    )
    if not ans or not ans.data:
        raise HTTPException(404, "Answer not found")

    answer = ans.data

    if answer["created_by"] == user.user_id:
        raise HTTPException(400, "You cannot upvote your own answer")

    # Verify doubt is in caller's class
    d = (
        supabase_admin.table("doubts")
        .select("id")
        .eq("id", answer["doubt_id"])
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not d or not d.data:
        raise HTTPException(403, "Answer belongs to a different class")

    existing = (
        supabase_admin.table("answer_votes")
        .select("id")
        .eq("answer_id", answer_id)
        .eq("user_id", user.user_id)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        supabase_admin.table("answer_votes").delete().eq("answer_id", answer_id).eq("user_id", user.user_id).execute()
        return {"voted": False}
    else:
        supabase_admin.table("answer_votes").insert({"answer_id": answer_id, "user_id": user.user_id}).execute()
        return {"voted": True}


@answers_router.delete("/{answer_id}", status_code=204)
def delete_answer(answer_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    ans = (
        supabase_admin.table("answers")
        .select("id, doubt_id, created_by")
        .eq("id", answer_id)
        .maybe_single()
        .execute()
    )
    if not ans or not ans.data:
        raise HTTPException(404, "Answer not found")

    answer = ans.data

    d = (
        supabase_admin.table("doubts")
        .select("id")
        .eq("id", answer["doubt_id"])
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not d or not d.data:
        raise HTTPException(403, "Answer belongs to a different class")

    is_owner = answer["created_by"] == user.user_id
    if not is_owner and not _is_cr(user.user_id):
        raise HTTPException(403, "Only the author or a CR can delete this answer")

    supabase_admin.table("answers").delete().eq("id", answer_id).execute()
    return None
