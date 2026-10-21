import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/deadlines", tags=["deadlines"])

_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}
_USER_COMPLETIONS: dict[str, set[str]] = {}
_CUSTOM_DEADLINES: dict[str, list[dict]] = {}


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


def _get_base_deadlines() -> list[dict]:
    """
    Standard curriculum deadlines for TCET Mumbai AI&DS Semester 4 Division A.
    Uses dynamic dates relative to current month/year for realistic countdowns.
    """
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "deadline-dbms-journal-1",
            "title": "DBMS Lab Journal Submission (Exp 1 - 6)",
            "subject_code": "DBMS",
            "subject_name": "Database Management Systems",
            "due_at": (now + timedelta(days=2, hours=3)).isoformat(),
            "type": "lab_journal",
            "submission_mode": "Physical Lab Journal to Lab 402 (Prof. Kadam)",
            "description": "Hard-copy lab manual with verified index, ER diagrams, DDL queries, and relational algebra solutions. Signature required before end of lab session.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
        {
            "id": "deadline-ml-phase1",
            "title": "Machine Learning Mini-Project Phase 1: Problem Definition & EDA",
            "subject_code": "ML",
            "subject_name": "Machine Learning",
            "due_at": (now + timedelta(days=4, hours=10)).isoformat(),
            "type": "mini_project",
            "submission_mode": "Google Classroom PDF + Public GitHub Repo Link",
            "description": "Submit problem statement, dataset link (Kaggle/UCI), exploratory data analysis graphs, and baseline algorithm selection in a 4-page report.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
        {
            "id": "deadline-cn-pkt-2",
            "title": "Computer Networks: Subnetting & Packet Tracer Assignment 2",
            "subject_code": "CN",
            "subject_name": "Computer Networks",
            "due_at": (now + timedelta(days=6, hours=5)).isoformat(),
            "type": "assignment",
            "submission_mode": "Moodle Portal (.pkt file + PDF output)",
            "description": "Design a 4-subnet VLSM network topology in Cisco Packet Tracer. Include routing tables and verify ping connectivity across all VLAN routers.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
        {
            "id": "deadline-os-sched",
            "title": "Operating Systems: CPU Scheduling Algorithms Simulation",
            "subject_code": "OS",
            "subject_name": "Operating Systems",
            "due_at": (now + timedelta(days=9, hours=2)).isoformat(),
            "type": "assignment",
            "submission_mode": "Physical Submission in Lab 404",
            "description": "C/C++ code implementations of FCFS, SJF, and Round Robin scheduling algorithms with Gantt chart calculation and average waiting time comparison.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
        {
            "id": "deadline-wcd-portfolio",
            "title": "Web & Cloud Development: Portfolio Milestone 1",
            "subject_code": "WCD",
            "subject_name": "Web & Cloud Development",
            "due_at": (now + timedelta(days=12, hours=8)).isoformat(),
            "type": "mini_project",
            "submission_mode": "Live Vercel / Render Deployment URL",
            "description": "Personal developer portfolio built with modern CSS and responsive layouts. Must include projects showcase, skill badges, and contact form.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
        {
            "id": "deadline-ia1-clearance",
            "title": "Internal Assessment 1 (IA-1) Attendance & Eligibility Check",
            "subject_code": "GEN",
            "subject_name": "General & Departmental",
            "due_at": (now + timedelta(days=15, hours=0)).isoformat(),
            "type": "exam_submission",
            "submission_mode": "Sign In-Person with CR & Mentor at Div A Desk",
            "description": "Verify minimum 75% subject-wise attendance and clear any outstanding lab journal backlogs before the official IA-1 seating chart is released.",
            "is_official": True,
            "created_by_name": "Class Representative",
        },
    ]


class DeadlineCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    subject_code: str = "GEN"
    due_at: str
    type: str = "assignment"
    submission_mode: str = "Classroom Submission"
    description: Optional[str] = ""
    is_official: bool = False


@router.get("")
def list_deadlines(user: CurrentUser = Depends(get_current_user)):
    """
    Returns unified assignment and submission deadline tracker data for Division A:
    - Official CR broadcasts & curriculum deadlines
    - Custom user-created tasks
    - Personal student completion checkboxes
    - Live countdown metrics (urgent, pending, completed)
    """
    class_id = _membership(user)
    completed_set = _USER_COMPLETIONS.get(user.user_id, set())

    # 1. Base curriculum deadlines
    deadlines = [dict(d) for d in _get_base_deadlines()]

    # 2. Fetch any notices with category 'Deadline' or 'Assignment' from Supabase
    try:
        notices_res = (
            supabase_admin.table("notices")
            .select("id, title, content, category, published_at, created_at, profiles(display_name)")
            .eq("class_id", class_id)
            .in_("category", ["Deadline", "Assignment"])
            .order("published_at", desc=True)
            .execute()
        )
        for n in (notices_res.data or []):
            prof = n.get("profiles") or {}
            author_name = prof.get("display_name") if isinstance(prof, dict) else "CR"
            pub_date = n.get("published_at") or n.get("created_at")
            # Default due date to 5 days after publication if not specified
            due = (datetime.fromisoformat(pub_date.replace("Z", "+00:00")) + timedelta(days=5)).isoformat() if pub_date else datetime.now(timezone.utc).isoformat()
            
            # Infer subject code from title if possible
            t_upper = n.get("title", "").upper()
            code = "GEN"
            for s_code in ["DBMS", "ML", "CN", "OS", "WCD", "AM-IV"]:
                if s_code in t_upper:
                    code = s_code
                    break

            deadlines.append({
                "id": f"notice-{n['id']}",
                "title": n.get("title", "Submission Deadline"),
                "subject_code": code,
                "subject_name": f"{code} Coursework",
                "due_at": due,
                "type": "assignment" if n.get("category") == "Assignment" else "lab_journal",
                "submission_mode": "Official Class Notice",
                "description": n.get("content", ""),
                "is_official": True,
                "created_by_name": author_name,
            })
    except Exception:
        pass

    # 3. Add user custom deadlines for this class
    custom_list = _CUSTOM_DEADLINES.get(user.user_id, [])
    for c in custom_list:
        deadlines.append(c)

    # 4. Enrich each deadline with completion status & urgency
    now = datetime.now(timezone.utc)
    enriched = []
    urgent_count = 0
    pending_count = 0
    completed_count = 0

    for d in deadlines:
        is_done = d["id"] in completed_set
        d["completed"] = is_done

        # Calculate time remaining
        try:
            due_dt = datetime.fromisoformat(d["due_at"].replace("Z", "+00:00"))
            delta = due_dt - now
            seconds = delta.total_seconds()
            if seconds < 0:
                d["urgency"] = "overdue"
                d["time_remaining"] = "Past due"
            elif seconds <= 172800:  # 48 hours
                d["urgency"] = "urgent"
                hours = int(seconds // 3600)
                d["time_remaining"] = f"Due in {hours}h"
                if not is_done:
                    urgent_count += 1
            elif seconds <= 604800:  # 7 days
                d["urgency"] = "soon"
                days = int(seconds // 86400)
                d["time_remaining"] = f"Due in {days}d"
            else:
                d["urgency"] = "normal"
                days = int(seconds // 86400)
                d["time_remaining"] = f"Due in {days}d"
        except Exception:
            d["urgency"] = "normal"
            d["time_remaining"] = "Upcoming"

        if is_done:
            completed_count += 1
        else:
            pending_count += 1

        enriched.append(d)

    # Sort deadlines: urgent and upcoming first, then completed/overdue
    def sort_key(x):
        is_comp = 1 if x["completed"] else 0
        urg_order = {"urgent": 0, "soon": 1, "normal": 2, "overdue": 3}.get(x.get("urgency", "normal"), 2)
        return (is_comp, urg_order, x.get("due_at", ""))

    enriched.sort(key=sort_key)

    next_deadline = next((d for d in enriched if not d["completed"] and d.get("urgency") != "overdue"), None)

    return {
        "deadlines": enriched,
        "stats": {
            "total_count": len(enriched),
            "pending_count": pending_count,
            "completed_count": completed_count,
            "urgent_count": urgent_count,
            "next_deadline": next_deadline,
        },
    }


@router.post("", status_code=201)
def create_deadline(body: DeadlineCreateIn, user: CurrentUser = Depends(get_current_user)):
    """
    Creates a new deadline. If user is CR and marks is_official, it also publishes a notice.
    Otherwise, creates a student personal task.
    """
    class_id = _membership(user)
    now = datetime.now(timezone.utc)

    # Check if user is CR
    p = supabase_admin.table("profiles").select("role,display_name").eq("id", user.user_id).maybe_single().execute()
    is_cr = bool(p and p.data and p.data.get("role") == "cr")
    display_name = (p.data.get("display_name") if p and p.data else None) or "Student"

    deadline_id = f"custom-{int(time.time()*1000)}"

    item = {
        "id": deadline_id,
        "title": body.title.strip(),
        "subject_code": body.subject_code.upper().strip(),
        "subject_name": f"{body.subject_code.upper().strip()} Task",
        "due_at": body.due_at,
        "type": body.type,
        "submission_mode": body.submission_mode,
        "description": body.description or "",
        "is_official": bool(is_cr and body.is_official),
        "created_by_name": display_name if not (is_cr and body.is_official) else "Class Representative",
        "created_at": now.isoformat(),
        "completed": False,
    }

    if user.user_id not in _CUSTOM_DEADLINES:
        _CUSTOM_DEADLINES[user.user_id] = []
    _CUSTOM_DEADLINES[user.user_id].append(item)

    # If CR broadcast, also save in notices table as Deadline announcement
    if is_cr and body.is_official:
        try:
            supabase_admin.table("notices").insert({
                "class_id": class_id,
                "title": f"Submission Deadline: {body.title.strip()}",
                "content": f"{body.description}\n\nDue Date: {body.due_at}\nSubmission Mode: {body.submission_mode}",
                "category": "Deadline",
                "created_by": user.user_id,
            }).execute()
        except Exception:
            pass

    return item


@router.post("/{deadline_id}/toggle")
def toggle_deadline_completion(deadline_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    Toggles completion state for a deadline for the current student.
    """
    if user.user_id not in _USER_COMPLETIONS:
        _USER_COMPLETIONS[user.user_id] = set()

    completed_set = _USER_COMPLETIONS[user.user_id]
    if deadline_id in completed_set:
        completed_set.remove(deadline_id)
        is_completed = False
    else:
        completed_set.add(deadline_id)
        is_completed = True

    return {"id": deadline_id, "completed": is_completed}
