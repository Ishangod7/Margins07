import time
import uuid
from datetime import datetime, timezone, timedelta
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
_COMMENTS_STORE: dict[str, list[dict]] = {}
_SEED_ANSWERS_STORE: dict[str, list[dict]] = {}


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


class CommentCreateIn(BaseModel):
    body: str = Field(min_length=2, max_length=1500)


_SEED_ANSWER_VOTES: set[tuple[str, str]] = set()


def _get_seed_doubts() -> list[dict]:
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "seed-doubt-maths1-1",
            "class_id": "a6c4688d-0d00-4946-8a76-c11f90f25e89",
            "subject_id": "5613012d-53bc-49c9-9b29-98ac1d2a1323",
            "title": "Cayley-Hamilton Theorem: Finding A^4 and A^(-1) for a 3x3 non-diagonal matrix",
            "body": (
                "In Unit 1 (Matrices), I am trying to evaluate A^4 - 4A^3 - 5A^2 + A + 2I for:\n"
                "```python\n"
                "# Matrix A:\n"
                "# [[1, 2, 0],\n"
                "#  [2, -1, 0],\n"
                "#  [0, 0, -1]]\n"
                "```\n\n"
                "My characteristic equation comes out to `λ^3 + λ^2 - 5λ - 5 = 0`.\n"
                "When dividing the polynomial by the characteristic polynomial, what is the fastest reduction technique "
                "to get both A^4 and A^(-1) without computing full matrix multiplication?"
            ),
            "status": "solved",
            "tags": ["maths-1", "matrices", "cayley-hamilton", "linear-algebra"],
            "created_by": "student-rohan",
            "author_name": "Rohan Varma",
            "answer_count": 1,
            "follow_count": 6,
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=2)).isoformat(),
            "subject": {"id": "5613012d-53bc-49c9-9b29-98ac1d2a1323", "name": "Mathematics-I", "code": "MATHS-I"},
            "answers": [
                {
                    "id": "seed-ans-maths1-1",
                    "doubt_id": "seed-doubt-maths1-1",
                    "body": (
                        "By Cayley-Hamilton theorem, `A^3 + A^2 - 5A - 5I = 0` (zero matrix).\n\n"
                        "To evaluate higher powers like `A^4`, perform polynomial long division:\n"
                        "```text\n"
                        "P(λ) = Q(λ) * (λ^3 + λ^2 - 5λ - 5) + R(λ)\n"
                        "```\n"
                        "Since `A^3 + A^2 - 5A - 5I = 0`, `P(A)` simply evaluates to the remainder `R(A)` (which is at most degree 2)!\n\n"
                        "For `A^(-1)`:\n"
                        "Multiply the characteristic equation by `A^(-1)`:\n"
                        "```text\n"
                        "A^2 + A - 5I - 5*A^(-1) = 0\n"
                        "=> A^(-1) = (1/5) * (A^2 + A - 5I)\n"
                        "```\n"
                        "This saves at least 15 minutes of matrix multiplication in the exam."
                    ),
                    "is_accepted": True,
                    "helpful_count": 7,
                    "created_by": "f530e526-dea0-49f9-88cb-982a195b056a",
                    "author_name": "Ishan Gupta",
                    "created_at": (now - timedelta(days=1)).isoformat(),
                    "updated_at": (now - timedelta(days=1)).isoformat(),
                }
            ],
        },
        {
            "id": "seed-doubt-phy-1",
            "class_id": "a6c4688d-0d00-4946-8a76-c11f90f25e89",
            "subject_id": "036be447-5667-42b9-97aa-fd07f0779776",
            "title": "Why does the central spot in Newton's Rings appear dark in reflected light?",
            "body": (
                "In Physics Lab Exp 1 (Newton's Rings), at the point of contact between the plano-convex lens "
                "and the glass plate, the film thickness t = 0.\n\n"
                "If path difference is `2μt*cos(r)`, then at t = 0, shouldn't the path difference be 0, "
                "which is the condition for constructive interference (bright fringe)? "
                "Why is the central ring always dark under reflection?"
            ),
            "status": "answered",
            "tags": ["physics", "interference", "newtons-rings", "optics"],
            "created_by": "student-tanvi",
            "author_name": "Tanvi Mehta",
            "answer_count": 1,
            "follow_count": 9,
            "created_at": (now - timedelta(days=3)).isoformat(),
            "updated_at": (now - timedelta(days=3)).isoformat(),
            "subject": {"id": "036be447-5667-42b9-97aa-fd07f0779776", "name": "Physics", "code": "PHY"},
            "answers": [
                {
                    "id": "seed-ans-phy-1",
                    "doubt_id": "seed-doubt-phy-1",
                    "body": (
                        "You must account for the Stokes phase shift on reflection at a denser medium boundary!\n\n"
                        "In reflected light, ray 1 reflects from the glass-air boundary (rarer medium, no phase change). "
                        "Ray 2 reflects from the air-glass boundary (denser medium, introduces a phase shift of π or path shift of λ/2).\n\n"
                        "Therefore, the effective path difference is:\n"
                        "```text\n"
                        "Δ = 2μt*cos(r) + λ/2\n"
                        "```\n"
                        "At the point of contact (t = 0):\n"
                        "```text\n"
                        "Δ = 0 + λ/2 = λ/2\n"
                        "```\n"
                        "A path difference of λ/2 satisfies destructive interference: `(2n + 1)*λ/2` for n = 0. "
                        "Hence, the central spot is always perfectly dark!"
                    ),
                    "is_accepted": False,
                    "helpful_count": 5,
                    "created_by": "student-siddharth",
                    "author_name": "Siddharth Rao",
                    "created_at": (now - timedelta(days=2)).isoformat(),
                    "updated_at": (now - timedelta(days=2)).isoformat(),
                }
            ],
        },
        {
            "id": "seed-doubt-bee-1",
            "class_id": "a6c4688d-0d00-4946-8a76-c11f90f25e89",
            "subject_id": "a9419596-22ef-4734-84a7-a126b4ec6c18",
            "title": "Thevenin equivalent resistance with dependent sources in AC circuits",
            "body": (
                "In BEE Unit 1 (Network Theorems), when finding R_th across load terminals A-B "
                "for a circuit with a dependent current source `2*I_x`:\n"
                "- Deactivating independent sources leaves the dependent source intact.\n"
                "Can someone confirm if applying a 1V test source or 1A test source is preferred, "
                "and how I_x is related to the test source current?"
            ),
            "status": "open",
            "tags": ["bee", "thevenin", "dependent-sources", "network-theorems"],
            "created_by": "student-aarav",
            "author_name": "Aarav Joshi",
            "answer_count": 0,
            "follow_count": 4,
            "created_at": (now - timedelta(hours=4)).isoformat(),
            "updated_at": (now - timedelta(hours=4)).isoformat(),
            "subject": {"id": "a9419596-22ef-4734-84a7-a126b4ec6c18", "name": "Basic Electrical Engineering", "code": "BEE"},
            "answers": [],
        },
    ]


def _init_seed_comments():
    now = datetime.now(timezone.utc)
    if "seed-ans-maths1-1" not in _COMMENTS_STORE:
        _COMMENTS_STORE["seed-ans-maths1-1"] = [
            {
                "id": "seed-c-maths1-1",
                "answer_id": "seed-ans-maths1-1",
                "author_id": "student-aditya",
                "author_name": "Aditya Sharma",
                "body": "Thanks @Ishan Gupta! That polynomial division trick is much faster than multiplying out 3x3 matrices.",
                "created_at": (now - timedelta(hours=22)).isoformat(),
                "is_mine": False,
            },
            {
                "id": "seed-c-maths1-2",
                "answer_id": "seed-ans-maths1-1",
                "author_id": "f530e526-dea0-49f9-88cb-982a195b056a",
                "author_name": "Ishan Gupta",
                "body": "@Aditya Sharma yes, Ms. Pooja Pote highlighted this in tutorial 1 as the exact method expected in end-sem papers.",
                "created_at": (now - timedelta(hours=18)).isoformat(),
                "is_mine": False,
            },
        ]
    if "seed-ans-phy-1" not in _COMMENTS_STORE:
        _COMMENTS_STORE["seed-ans-phy-1"] = [
            {
                "id": "seed-c-phy-1",
                "answer_id": "seed-ans-phy-1",
                "author_id": "student-tanvi",
                "author_name": "Tanvi Mehta",
                "body": "Great explanation @Siddharth Rao! Does this also explain why transmitted Newton's Rings have a bright center?",
                "created_at": (now - timedelta(hours=20)).isoformat(),
                "is_mine": False,
            },
            {
                "id": "seed-c-phy-2",
                "answer_id": "seed-ans-phy-1",
                "author_id": "student-siddharth",
                "author_name": "Siddharth Rao",
                "body": "@Tanvi Mehta Exactly! In transmitted light, both rays undergo either two reflections or zero phase-reversing reflections, so no net λ/2 shift occurs at t = 0.",
                "created_at": (now - timedelta(hours=14)).isoformat(),
                "is_mine": False,
            },
        ]


def _get_answer_comments(answer_id: str, current_user_id: str) -> list[dict]:
    _init_seed_comments()
    comments = _COMMENTS_STORE.get(answer_id, [])
    result = []
    for c in comments:
        item = dict(c)
        item["is_mine"] = item.get("author_id") == current_user_id
        result.append(item)
    return result


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

        # Augment with curated curriculum doubts
        existing_ids = {d["id"] for d in doubts}
        seeds = _get_seed_doubts()
        filtered_seeds = []
        for s in seeds:
            if s["id"] in existing_ids:
                continue
            if subject_id and s.get("subject_id") != subject_id:
                continue
            if status and s.get("status") != status:
                continue
            if mine and s.get("created_by") != user.user_id:
                continue
            if q and q.strip():
                term = q.strip().lower()
                if term not in s["title"].lower() and term not in s["body"].lower():
                    continue
            if sort == "unanswered" and s.get("answer_count", 0) > 0:
                continue
            filtered_seeds.append(s)

        doubts = doubts + filtered_seeds

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

    if doubt_id.startswith("seed-doubt-"):
        seeds = _get_seed_doubts()
        match = next((d for d in seeds if d["id"] == doubt_id), None)
        if not match:
            raise HTTPException(404, "Doubt not found")
        doubt = dict(match)
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
        doubt["is_mine"] = doubt.get("created_by") == user.user_id

        # Merge base answers and dynamic answers
        all_answers = [dict(a) for a in doubt.get("answers", [])] + _SEED_ANSWERS_STORE.get(doubt_id, [])
        for a in all_answers:
            a["is_mine"] = a.get("created_by") == user.user_id
            a["has_voted"] = (a["id"], user.user_id) in _SEED_ANSWER_VOTES
            a["comments"] = _get_answer_comments(a["id"], user.user_id)
        doubt["answers"] = all_answers
        return doubt

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
        a["comments"] = _get_answer_comments(a["id"], user.user_id)

    doubt["answers"] = answers
    return doubt


@router.post("/{doubt_id}/answers", status_code=201)
def post_answer(doubt_id: str, body: AnswerCreateIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    if doubt_id.startswith("seed-doubt-"):
        name_map = _get_profile_names([user.user_id])
        author_name = name_map.get(user.user_id, "Classmate")
        ans_id = f"seed-ans-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
        row = {
            "id": ans_id,
            "doubt_id": doubt_id,
            "body": body.body.strip(),
            "is_accepted": False,
            "helpful_count": 0,
            "created_by": user.user_id,
            "author_name": author_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_mine": True,
            "has_voted": False,
            "comments": [],
        }
        _SEED_ANSWERS_STORE.setdefault(doubt_id, []).append(row)
        return row

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
    ans_data = res.data[0]
    ans_data["comments"] = []
    return ans_data


@router.post("/{doubt_id}/follow")
def toggle_follow_doubt(doubt_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    if doubt_id.startswith("seed-doubt-"):
        pair = (doubt_id, user.user_id)
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

    if answer_id.startswith("seed-ans-"):
        return {"is_accepted": True, "doubt_status": "solved"}

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

    if answer_id.startswith("seed-ans-"):
        pair = (answer_id, user.user_id)
        if pair in _SEED_ANSWER_VOTES:
            _SEED_ANSWER_VOTES.remove(pair)
            return {"voted": False}
        else:
            _SEED_ANSWER_VOTES.add(pair)
            return {"voted": True}

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


# =========================================================
# Threaded Comments Endpoints (Follow-up Discussions)
# =========================================================

@answers_router.post("/{answer_id}/comments", status_code=201)
@router.post("/{doubt_id}/answers/{answer_id}/comments", status_code=201)
def post_comment(
    answer_id: str,
    body: CommentCreateIn,
    doubt_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)
    name_map = _get_profile_names([user.user_id])
    author_name = name_map.get(user.user_id, "Classmate")

    comment = {
        "id": f"comment-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}",
        "answer_id": answer_id,
        "author_id": user.user_id,
        "author_name": author_name,
        "body": body.body.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_mine": True,
    }
    _COMMENTS_STORE.setdefault(answer_id, []).append(comment)
    return comment


@answers_router.get("/{answer_id}/comments")
@router.get("/{doubt_id}/answers/{answer_id}/comments")
def list_comments(
    answer_id: str,
    doubt_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    _membership(user)
    return _get_answer_comments(answer_id, user.user_id)


@answers_router.delete("/{answer_id}/comments/{comment_id}", status_code=204)
@router.delete("/{doubt_id}/answers/{answer_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    answer_id: str,
    comment_id: str,
    doubt_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    _membership(user)
    comments = _COMMENTS_STORE.get(answer_id, [])
    target = None
    for c in comments:
        if c.get("id") == comment_id:
            target = c
            break

    if not target:
        raise HTTPException(404, "Comment not found")

    is_author = target.get("author_id") == user.user_id
    if not is_author and not _is_cr(user.user_id):
        raise HTTPException(403, "Only the author or CR can delete this comment")

    _COMMENTS_STORE[answer_id] = [c for c in comments if c.get("id") != comment_id]
    return None

