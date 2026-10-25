import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/notifications", tags=["notifications"])

_NOTIF_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}


def _membership(user: CurrentUser) -> str:
    now = time.time()
    if user.user_id in _NOTIF_MEMBERSHIP_CACHE:
        exp, cid = _NOTIF_MEMBERSHIP_CACHE[user.user_id]
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
    _NOTIF_MEMBERSHIP_CACHE[user.user_id] = (now + 60.0, cid)
    return cid


@router.get("")
def get_notifications(
    since: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns an aggregated real-time stream of notifications for the current student:
    - Notices published by CR
    - Answers on user's asked doubts
    - Accepted solution alerts
    - New study resources uploaded to the shelf
    """
    class_id = _membership(user)
    items: List[Dict[str, Any]] = []

    # 1. Recent Notices in the class
    try:
        notices_res = (
            supabase_admin.table("notices")
            .select("id, title, content, category, published_at, is_pinned")
            .eq("class_id", class_id)
            .order("published_at", desc=True)
            .limit(6)
            .execute()
        )
        for n in (notices_res.data or []):
            content_preview = (n.get("content") or "").strip()
            if len(content_preview) > 90:
                content_preview = content_preview[:90] + "..."
            items.append({
                "id": f"notice_{n['id']}",
                "type": "notice",
                "title": f"Notice: {n['title']}",
                "body": content_preview,
                "link": "/notices",
                "created_at": n.get("published_at") or "",
                "actor_name": "TCET Department of ES&H",
                "category": n.get("category", "General"),
                "is_pinned": n.get("is_pinned", False),
            })
    except Exception as e:
        print("[NOTIF ERROR] notices query failed:", e)

    # 2. Answers on doubts asked by current user
    try:
        my_doubts = (
            supabase_admin.table("doubts")
            .select("id, title")
            .eq("created_by", user.user_id)
            .limit(20)
            .execute()
        )
        my_doubt_map = {d["id"]: d["title"] for d in (my_doubts.data or [])}
        if my_doubt_map:
            answers_res = (
                supabase_admin.table("answers")
                .select("id, doubt_id, created_by, body, created_at")
                .in_("doubt_id", list(my_doubt_map.keys()))
                .neq("created_by", user.user_id)
                .order("created_at", desc=True)
                .limit(8)
                .execute()
            )
            ans_author_ids = [a["created_by"] for a in (answers_res.data or []) if a.get("created_by")]
            p_map = {}
            if ans_author_ids:
                p_res = supabase_admin.table("profiles").select("id, display_name").in_("id", ans_author_ids).execute()
                p_map = {p["id"]: p["display_name"] for p in (p_res.data or [])}
            for ans in (answers_res.data or []):
                d_title = my_doubt_map.get(ans["doubt_id"], "your doubt")
                body_snippet = (ans.get("body") or "").strip()
                if len(body_snippet) > 85:
                    body_snippet = body_snippet[:85] + "..."
                actor = p_map.get(ans.get("created_by"), "A classmate")
                items.append({
                    "id": f"answer_{ans['id']}",
                    "type": "answer",
                    "title": f"{actor} answered: \"{d_title}\"",
                    "body": body_snippet,
                    "link": f"/doubts/{ans['doubt_id']}",
                    "created_at": ans.get("created_at") or "",
                    "actor_name": actor,
                })
    except Exception as e:
        print("[NOTIF ERROR] answers query failed:", e)

    # 3. Accepted solutions on current user's answers
    try:
        accepted_res = (
            supabase_admin.table("answers")
            .select("id, doubt_id, body, created_at")
            .eq("created_by", user.user_id)
            .eq("is_accepted", True)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        acc_doubt_ids = [a["doubt_id"] for a in (accepted_res.data or []) if a.get("doubt_id")]
        acc_doubt_map = {}
        if acc_doubt_ids:
            d_res = supabase_admin.table("doubts").select("id, title").in_("id", acc_doubt_ids).execute()
            acc_doubt_map = {d["id"]: d["title"] for d in (d_res.data or [])}

        for a in (accepted_res.data or []):
            d_title = acc_doubt_map.get(a.get("doubt_id"), "the question")
            items.append({
                "id": f"accepted_{a['id']}",
                "type": "accepted",
                "title": "Your answer was accepted as solution!",
                "body": f"For: \"{d_title}\"",
                "link": f"/doubts/{a['doubt_id']}",
                "created_at": a.get("created_at") or "",
                "actor_name": "Question Author",
            })
    except Exception as e:
        print("[NOTIF ERROR] accepted answers query failed:", e)

    # 4. New resources shared by classmates
    try:
        res_query = (
            supabase_admin.table("resources")
            .select("id, title, kind, unit, created_at, created_by, subjects(name)")
            .eq("class_id", class_id)
            .order("created_at", desc=True)
            .limit(8)
            .execute()
        )
        u_ids = [r["created_by"] for r in (res_query.data or []) if r.get("created_by")]
        u_map = {}
        if u_ids:
            p_res = supabase_admin.table("profiles").select("id, display_name").in_("id", u_ids).execute()
            u_map = {p["id"]: p["display_name"] for p in (p_res.data or [])}

        for r in (res_query.data or []):
            subj = r.get("subjects") or {}
            subj_name = subj.get("name") if isinstance(subj, dict) else ""
            uploader = u_map.get(r.get("created_by"), "Classmate")
            kind_str = (r.get("kind") or "notes").upper()
            unit_str = f" · {r['unit']}" if r.get("unit") else ""
            items.append({
                "id": f"resource_{r['id']}",
                "type": "resource",
                "title": f"New {kind_str}: {r['title']}",
                "body": f"{subj_name}{unit_str} uploaded by {uploader}",
                "link": f"/resources?q={r['title']}",
                "created_at": r.get("created_at") or "",
                "actor_name": uploader,
            })
    except Exception as e:
        print("[NOTIF ERROR] resources query failed:", e)

    # 5. Recent classmate doubts asked in class
    try:
        class_doubts = (
            supabase_admin.table("doubts")
            .select("id, title, created_by, created_at, subjects(name)")
            .eq("class_id", class_id)
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )
        d_author_ids = [d["created_by"] for d in (class_doubts.data or []) if d.get("created_by")]
        d_p_map = {}
        if d_author_ids:
            p_res = supabase_admin.table("profiles").select("id, display_name").in_("id", d_author_ids).execute()
            d_p_map = {p["id"]: p["display_name"] for p in (p_res.data or [])}

        for d in (class_doubts.data or []):
            author = d_p_map.get(d.get("created_by"), "Classmate")
            subj = d.get("subjects") or {}
            sname = subj.get("name") if isinstance(subj, dict) else "General"
            items.append({
                "id": f"doubt_{d['id']}",
                "type": "answer",
                "title": f"{author} asked: \"{d['title']}\"",
                "body": f"Subject: {sname} · Click to view discussion and provide answer",
                "link": f"/doubts/{d['id']}",
                "created_at": d.get("created_at") or "",
                "actor_name": author,
            })
    except Exception as e:
        print("[NOTIF ERROR] class doubts query failed:", e)

    # Sort all notification items newest first
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    top_items = items[:20]

    # Calculate unread count against client 'since' timestamp
    unread_count = 0
    if since:
        unread_count = sum(1 for item in top_items if (item.get("created_at") or "") > since)
    else:
        unread_count = len(top_items)

    return {
        "notifications": top_items,
        "total_count": len(top_items),
        "unread_count": unread_count,
    }
