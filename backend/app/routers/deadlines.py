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
    Standard curriculum deadlines for TCET Mumbai AI&DS Semester I Division A.
    Uses dynamic dates relative to current month/year for realistic countdowns.
    """
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "deadline-maths-1",
            "title": "Applied Mathematics-I Assignment 1: Successive Differentiation & Leibniz Theorem",
            "subject_code": "MATHS-I",
            "subject_name": "Applied Mathematics-I",
            "due_at": (now + timedelta(days=2, hours=3)).isoformat(),
            "type": "assignment",
            "submission_mode": "Physical Assignment Submission to Ms. Pooja Pote (Room 503)",
            "description": "Submit handwritten solutions for Problem Set 1 covering Leibniz theorem, Euler's theorem for homogeneous functions, and Maclaurin series expansions.",
            "is_official": True,
            "created_by_name": "Ms. Pooja Pote",
        },
        {
            "id": "deadline-phy-journal-1",
            "title": "Engineering Physics-I Lab Journal Certification: Exp 1 to 4",
            "subject_code": "PHY",
            "subject_name": "Engineering Physics-I",
            "due_at": (now + timedelta(days=4, hours=6)).isoformat(),
            "type": "lab_journal",
            "submission_mode": "Physics Lab 515 (Mr. Atul Chaturvedi)",
            "description": "Hard-copy journal with verified index, ray diagrams, wavelength calculation tables, and percentage error analysis.",
            "is_official": True,
            "created_by_name": "Mr. Atul Chaturvedi (Class Incharge)",
        },
        {
            "id": "deadline-bee-pset-1",
            "title": "BEE Problem Set 1: Mesh & Nodal Circuit Analysis Theorems",
            "subject_code": "BEE",
            "subject_name": "Basic Electrical Engineering",
            "due_at": (now + timedelta(days=6, hours=4)).isoformat(),
            "type": "assignment",
            "submission_mode": "Classroom Submission to Mr. Rajesh Raj (Room 503/505)",
            "description": "Solve numericals on Thevenin's and Norton's equivalent circuits, Superposition theorem, and maximum power transfer in DC networks.",
            "is_official": True,
            "created_by_name": "Mr. Rajesh Raj",
        },
        {
            "id": "deadline-egd-sheet-1",
            "title": "Engineering Graphics Sheet 1 & 2: Orthographic Projections & ISO Standards",
            "subject_code": "EGD",
            "subject_name": "Engineering Graphics & Design",
            "due_at": (now + timedelta(days=8, hours=2)).isoformat(),
            "type": "assignment",
            "submission_mode": "Drawing Hall during Friday 08:30 AM Practical",
            "description": "Submit Sheet 1 & 2 on standard ISO A2 drawing sheet with complete title block, dimensioning, front view, top view, and side view in first angle projection.",
            "is_official": True,
            "created_by_name": "Dr. Prasad Kawade",
        },
        {
            "id": "deadline-egpc-report-1",
            "title": "EGPC Module 1: Formal Workplace Report & Executive Email Draft",
            "subject_code": "EGPC",
            "subject_name": "English for General & Professional Communication",
            "due_at": (now + timedelta(days=10, hours=5)).isoformat(),
            "type": "assignment",
            "submission_mode": "Language Laboratory / Google Classroom Submission",
            "description": "Draft a formal workplace technical report and an executive email proposal following standard business communication etiquette.",
            "is_official": True,
            "created_by_name": "Prof. Jyoti Vanawe",
        },
        {
            "id": "deadline-wmp-job-1",
            "title": "Workshop Practice Joint 1: Fitting Shop Male-Female Piece & Report",
            "subject_code": "WMP-I",
            "subject_name": "Workshop / Manufacturing Practices - I",
            "due_at": (now + timedelta(days=13, hours=7)).isoformat(),
            "type": "lab_journal",
            "submission_mode": "Main Workshop to Workshop Incharge",
            "description": "Submit mild steel fitting joint with dimension verification sheet and write-up on hacksawing, filing, and safety precautions.",
            "is_official": True,
            "created_by_name": "Main Workshop Incharge",
        },
        {
            "id": "deadline-ise-1",
            "title": "TCET In-Semester Examination (ISE-I): Applied Mathematics-I & Physics-I",
            "subject_code": "MATHS-I",
            "subject_name": "Applied Mathematics-I",
            "due_at": (now + timedelta(days=15, hours=4)).isoformat(),
            "type": "exam_submission",
            "submission_mode": "Examination Hall (Offline Pen-and-Paper)",
            "description": "ISE-I for 20 marks each covering Modules 1 and 2. Hall ticket and valid TCET ID card mandatory.",
            "is_official": True,
            "created_by_name": "Controller of Examinations (CoE)",
        },
        {
            "id": "deadline-aad-prep-1",
            "title": "AAD-I Speed Math & Quantitative Aptitude Timed Assessment",
            "subject_code": "AAD-I",
            "subject_name": "Attitude & Aptitude Development - I",
            "due_at": (now + timedelta(days=18, hours=0)).isoformat(),
            "type": "exam_submission",
            "submission_mode": "Online Portal Quiz during Saturday 09:30 AM Slot",
            "description": "30-minute timed aptitude test assessing mental arithmetic, percentages, ratio & proportion, and logical deduction series.",
            "is_official": True,
            "created_by_name": "Ms. Pooja Pote",
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
            for s_code in ["MATHS-I", "PHY", "BEE", "EGD", "EGPC", "AAD-I", "WMP-I", "ACAD"]:
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


@router.delete("/{deadline_id}", status_code=204)
def delete_deadline(deadline_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    Deletes a custom deadline task.
    """
    if user.user_id in _CUSTOM_DEADLINES:
        _CUSTOM_DEADLINES[user.user_id] = [
            d for d in _CUSTOM_DEADLINES[user.user_id] if d["id"] != deadline_id
        ]
    return None
