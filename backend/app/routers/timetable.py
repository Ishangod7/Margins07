import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/timetable", tags=["timetable"])

_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}
_ANNOUNCEMENTS_STORE: list[dict] = [
    {
        "id": "notice-tt-1",
        "text": "Friday 02:00 PM OS Lab for Batch A1 will be held in Lab 404 (Operating Systems & Virtualization Lab).",
        "posted_by": "Class Representative",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    }
]


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


class AnnouncementIn(BaseModel):
    text: str = Field(min_length=5, max_length=500)


def _get_base_schedule() -> list[dict]:
    """
    Standard Weekly Timetable for TCET Mumbai AI&DS Division A (Semester 4).
    Batches: A1, A2, A3
    """
    return [
        {
            "day": "Monday",
            "day_code": "mon",
            "slots": [
                {
                    "id": "mon-1",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "time_display": "09:00 - 10:00 AM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. S. Patil",
                    "batch": "all",
                    "notes": "Unit 2: Linear Models and Gradient Descent",
                },
                {
                    "id": "mon-2",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "time_display": "10:00 - 11:00 AM",
                    "subject_code": "DBMS",
                    "subject_name": "Database Management Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. R. Kadam",
                    "batch": "all",
                    "notes": "Relational Algebra and Tuple Calculus",
                },
                {
                    "id": "mon-break-1",
                    "start_time": "11:00",
                    "end_time": "11:15",
                    "time_display": "11:00 - 11:15 AM",
                    "subject_code": "RECESS",
                    "subject_name": "Short Tea Break",
                    "type": "break",
                    "room": "Floor 4 Foyer",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "mon-3",
                    "start_time": "11:15",
                    "end_time": "12:15",
                    "time_display": "11:15 - 12:15 PM",
                    "subject_code": "AM-IV",
                    "subject_name": "Applied Mathematics IV",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. K. Joshi",
                    "batch": "all",
                    "notes": "Complex Variables and Cauchy-Riemann Equations",
                },
                {
                    "id": "mon-4",
                    "start_time": "12:15",
                    "end_time": "13:15",
                    "time_display": "12:15 - 01:15 PM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. A. Mehta",
                    "batch": "all",
                    "notes": "Data Link Layer & Framing Techniques",
                },
                {
                    "id": "mon-lunch",
                    "start_time": "13:15",
                    "end_time": "14:00",
                    "time_display": "01:15 - 02:00 PM",
                    "subject_code": "LUNCH",
                    "subject_name": "Lunch Recess",
                    "type": "break",
                    "room": "Cafeteria / Lawn",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Lab Slot 2-4 PM
                {
                    "id": "mon-lab-a1",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "DBMS",
                    "subject_name": "DBMS Practical (Exp 3: Complex SQL Joins)",
                    "type": "lab",
                    "room": "Lab 403 (Postgres Lab)",
                    "faculty": "Prof. R. Kadam",
                    "batch": "A1",
                    "notes": "Carry hard-copy journal for signature",
                },
                {
                    "id": "mon-lab-a2",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning Lab (Exp 2: Polynomial Regression)",
                    "type": "lab",
                    "room": "Lab 405 (Turing AI Lab)",
                    "faculty": "Prof. S. Patil",
                    "batch": "A2",
                    "notes": "Jupyter Notebook submissions on Margins",
                },
                {
                    "id": "mon-lab-a3",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks Lab (Exp 3: Wireshark Packet Analysis)",
                    "type": "lab",
                    "room": "Lab 407 (Cisco Network Lab)",
                    "faculty": "Prof. A. Mehta",
                    "batch": "A3",
                    "notes": "Inspect TCP handshake sequence numbers",
                },
                {
                    "id": "mon-5",
                    "start_time": "16:00",
                    "end_time": "17:00",
                    "time_display": "04:00 - 05:00 PM",
                    "subject_code": "TUT",
                    "subject_name": "Applied Math Tutorial & Viva Prep",
                    "type": "tutorial",
                    "room": "Classroom 402",
                    "faculty": "Prof. K. Joshi",
                    "batch": "all",
                    "notes": "Assignment 2 problem-solving",
                },
            ],
        },
        {
            "day": "Tuesday",
            "day_code": "tue",
            "slots": [
                {
                    "id": "tue-1",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "time_display": "09:00 - 10:00 AM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. A. Mehta",
                    "batch": "all",
                    "notes": "Error Detection: CRC and Hamming Code",
                },
                {
                    "id": "tue-2",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "time_display": "10:00 - 11:00 AM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "all",
                    "notes": "CPU Scheduling: Round Robin and Priority Algorithms",
                },
                {
                    "id": "tue-break-1",
                    "start_time": "11:00",
                    "end_time": "11:15",
                    "time_display": "11:00 - 11:15 AM",
                    "subject_code": "RECESS",
                    "subject_name": "Short Tea Break",
                    "type": "break",
                    "room": "Floor 4 Foyer",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "tue-3",
                    "start_time": "11:15",
                    "end_time": "12:15",
                    "time_display": "11:15 - 12:15 PM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. S. Patil",
                    "batch": "all",
                    "notes": "Logistic Regression & Sigmoid Decision Boundaries",
                },
                {
                    "id": "tue-4",
                    "start_time": "12:15",
                    "end_time": "13:15",
                    "time_display": "12:15 - 01:15 PM",
                    "subject_code": "WCD",
                    "subject_name": "Web Computing & Dev",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. V. Sharma",
                    "batch": "all",
                    "notes": "Asynchronous JavaScript, Promises & Fetch API",
                },
                {
                    "id": "tue-lunch",
                    "start_time": "13:15",
                    "end_time": "14:00",
                    "time_display": "01:15 - 02:00 PM",
                    "subject_code": "LUNCH",
                    "subject_name": "Lunch Recess",
                    "type": "break",
                    "room": "Cafeteria / Lawn",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Lab Slot 2-4 PM
                {
                    "id": "tue-lab-a1",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning Lab (Exp 3: Logistic Classifier)",
                    "type": "lab",
                    "room": "Lab 405 (Turing AI Lab)",
                    "faculty": "Prof. S. Patil",
                    "batch": "A1",
                    "notes": "ROC-AUC curve calculations",
                },
                {
                    "id": "tue-lab-a2",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks Lab (Exp 3: Wireshark)",
                    "type": "lab",
                    "room": "Lab 407 (Cisco Network Lab)",
                    "faculty": "Prof. A. Mehta",
                    "batch": "A2",
                    "notes": "Protocol inspection",
                },
                {
                    "id": "tue-lab-a3",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "DBMS",
                    "subject_name": "DBMS Practical (Exp 4: Subqueries & Views)",
                    "type": "lab",
                    "room": "Lab 403 (Postgres Lab)",
                    "faculty": "Prof. R. Kadam",
                    "batch": "A3",
                    "notes": "Index optimization check",
                },
                {
                    "id": "tue-5",
                    "start_time": "16:00",
                    "end_time": "17:00",
                    "time_display": "04:00 - 05:00 PM",
                    "subject_code": "MINI-PROJ",
                    "subject_name": "AI&DS Mini Project Review",
                    "type": "tutorial",
                    "room": "Classroom 402",
                    "faculty": "Prof. S. Patil & Prof. R. Kadam",
                    "batch": "all",
                    "notes": "Phase 1 Problem Statement Sign-off",
                },
            ],
        },
        {
            "day": "Wednesday",
            "day_code": "wed",
            "slots": [
                {
                    "id": "wed-1",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "time_display": "09:00 - 10:00 AM",
                    "subject_code": "DBMS",
                    "subject_name": "Database Management Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. R. Kadam",
                    "batch": "all",
                    "notes": "Functional Dependencies & BCNF Decomposition",
                },
                {
                    "id": "wed-2",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "time_display": "10:00 - 11:00 AM",
                    "subject_code": "AM-IV",
                    "subject_name": "Applied Mathematics IV",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. K. Joshi",
                    "batch": "all",
                    "notes": "Taylor and Laurent Series Expansion",
                },
                {
                    "id": "wed-break-1",
                    "start_time": "11:00",
                    "end_time": "11:15",
                    "time_display": "11:00 - 11:15 AM",
                    "subject_code": "RECESS",
                    "subject_name": "Short Tea Break",
                    "type": "break",
                    "room": "Floor 4 Foyer",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "wed-3",
                    "start_time": "11:15",
                    "end_time": "12:15",
                    "time_display": "11:15 - 12:15 PM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "all",
                    "notes": "Deadlocks: Banker's Safety & Resource Request",
                },
                {
                    "id": "wed-4",
                    "start_time": "12:15",
                    "end_time": "13:15",
                    "time_display": "12:15 - 01:15 PM",
                    "subject_code": "WCD",
                    "subject_name": "Web Computing & Dev",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. V. Sharma",
                    "batch": "all",
                    "notes": "REST API Architecture & State Management",
                },
                {
                    "id": "wed-lunch",
                    "start_time": "13:15",
                    "end_time": "14:00",
                    "time_display": "01:15 - 02:00 PM",
                    "subject_code": "LUNCH",
                    "subject_name": "Lunch Recess",
                    "type": "break",
                    "room": "Cafeteria / Lawn",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Lab Slot 2-4 PM
                {
                    "id": "wed-lab-a1",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks Lab (Exp 4: Subnetting & CIDR)",
                    "type": "lab",
                    "room": "Lab 407 (Cisco Network Lab)",
                    "faculty": "Prof. A. Mehta",
                    "batch": "A1",
                    "notes": "Packet Tracer simulation",
                },
                {
                    "id": "wed-lab-a2",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "DBMS",
                    "subject_name": "DBMS Practical (Exp 5: PL/SQL Triggers)",
                    "type": "lab",
                    "room": "Lab 403 (Postgres Lab)",
                    "faculty": "Prof. R. Kadam",
                    "batch": "A2",
                    "notes": "Trigger execution logs verification",
                },
                {
                    "id": "wed-lab-a3",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "WCD",
                    "subject_name": "Web Dev Lab (Exp 3: React Hooks & Components)",
                    "type": "lab",
                    "room": "Lab 406 (Web Systems Lab)",
                    "faculty": "Prof. V. Sharma",
                    "batch": "A3",
                    "notes": "Component state tests",
                },
                {
                    "id": "wed-5",
                    "start_time": "16:00",
                    "end_time": "17:00",
                    "time_display": "04:00 - 05:00 PM",
                    "subject_code": "LIB",
                    "subject_name": "Library Research & Doubt Clearing",
                    "type": "tutorial",
                    "room": "Central Library (4th Floor)",
                    "faculty": "Self-Study",
                    "batch": "all",
                    "notes": "Access Margins Cram Mode and PYQ shelf",
                },
            ],
        },
        {
            "day": "Thursday",
            "day_code": "thu",
            "slots": [
                {
                    "id": "thu-1",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "time_display": "09:00 - 10:00 AM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. S. Patil",
                    "batch": "all",
                    "notes": "Decision Trees, Entropy & Information Gain",
                },
                {
                    "id": "thu-2",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "time_display": "10:00 - 11:00 AM",
                    "subject_code": "CN",
                    "subject_name": "Computer Networks",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. A. Mehta",
                    "batch": "all",
                    "notes": "Routing: Distance Vector vs Link State Protocol",
                },
                {
                    "id": "thu-break-1",
                    "start_time": "11:00",
                    "end_time": "11:15",
                    "time_display": "11:00 - 11:15 AM",
                    "subject_code": "RECESS",
                    "subject_name": "Short Tea Break",
                    "type": "break",
                    "room": "Floor 4 Foyer",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "thu-3",
                    "start_time": "11:15",
                    "end_time": "12:15",
                    "time_display": "11:15 - 12:15 PM",
                    "subject_code": "DBMS",
                    "subject_name": "Database Management Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. R. Kadam",
                    "batch": "all",
                    "notes": "Transactions & ACID: Conflict Serializability",
                },
                {
                    "id": "thu-4",
                    "start_time": "12:15",
                    "end_time": "13:15",
                    "time_display": "12:15 - 01:15 PM",
                    "subject_code": "AM-IV",
                    "subject_name": "Applied Mathematics IV",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. K. Joshi",
                    "batch": "all",
                    "notes": "Residue Theorem & Contour Integration",
                },
                {
                    "id": "thu-lunch",
                    "start_time": "13:15",
                    "end_time": "14:00",
                    "time_display": "01:15 - 02:00 PM",
                    "subject_code": "LUNCH",
                    "subject_name": "Lunch Recess",
                    "type": "break",
                    "room": "Cafeteria / Lawn",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Lab Slot 2-4 PM
                {
                    "id": "thu-lab-a1",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "WCD",
                    "subject_name": "Web Dev Lab (Exp 4: Next.js & Server Rendering)",
                    "type": "lab",
                    "room": "Lab 406 (Web Systems Lab)",
                    "faculty": "Prof. V. Sharma",
                    "batch": "A1",
                    "notes": "Tailwind / Vanilla CSS layout reviews",
                },
                {
                    "id": "thu-lab-a2",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems Lab (Exp 4: Semaphores & Pthreads)",
                    "type": "lab",
                    "room": "Lab 404 (OS Lab)",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "A2",
                    "notes": "Producer-Consumer problem implementation",
                },
                {
                    "id": "thu-lab-a3",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning Lab (Exp 4: Decision Tree Classifier)",
                    "type": "lab",
                    "room": "Lab 405 (Turing AI Lab)",
                    "faculty": "Prof. S. Patil",
                    "batch": "A3",
                    "notes": "Feature importance plots",
                },
                {
                    "id": "thu-5",
                    "start_time": "16:00",
                    "end_time": "17:00",
                    "time_display": "04:00 - 05:00 PM",
                    "subject_code": "MENTOR",
                    "subject_name": "Faculty Mentorship & Attendance Counseling",
                    "type": "tutorial",
                    "room": "Classroom 402",
                    "faculty": "Class Advisor (Prof. Patil)",
                    "batch": "all",
                    "notes": "Monthly attendance updates review",
                },
            ],
        },
        {
            "day": "Friday",
            "day_code": "fri",
            "slots": [
                {
                    "id": "fri-1",
                    "start_time": "09:00",
                    "end_time": "10:00",
                    "time_display": "09:00 - 10:00 AM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "all",
                    "notes": "Virtual Memory & Page Replacement: FIFO, LRU, Optimal",
                },
                {
                    "id": "fri-2",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "time_display": "10:00 - 11:00 AM",
                    "subject_code": "WCD",
                    "subject_name": "Web Computing & Dev",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. V. Sharma",
                    "batch": "all",
                    "notes": "Database Integration with Postgres & Supabase",
                },
                {
                    "id": "fri-break-1",
                    "start_time": "11:00",
                    "end_time": "11:15",
                    "time_display": "11:00 - 11:15 AM",
                    "subject_code": "RECESS",
                    "subject_name": "Short Tea Break",
                    "type": "break",
                    "room": "Floor 4 Foyer",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "fri-3",
                    "start_time": "11:15",
                    "end_time": "12:15",
                    "time_display": "11:15 - 12:15 PM",
                    "subject_code": "ML",
                    "subject_name": "Machine Learning",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. S. Patil",
                    "batch": "all",
                    "notes": "Ensemble Learning: Random Forest & AdaBoost",
                },
                {
                    "id": "fri-4",
                    "start_time": "12:15",
                    "end_time": "13:15",
                    "time_display": "12:15 - 01:15 PM",
                    "subject_code": "DBMS",
                    "subject_name": "Database Management Systems",
                    "type": "lecture",
                    "room": "Classroom 402",
                    "faculty": "Prof. R. Kadam",
                    "batch": "all",
                    "notes": "Concurrency Control Protocols: 2PL & Strict 2PL",
                },
                {
                    "id": "fri-lunch",
                    "start_time": "13:15",
                    "end_time": "14:00",
                    "time_display": "01:15 - 02:00 PM",
                    "subject_code": "LUNCH",
                    "subject_name": "Lunch Recess",
                    "type": "break",
                    "room": "Cafeteria / Lawn",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Lab Slot 2-4 PM
                {
                    "id": "fri-lab-a1",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems Lab (Exp 5: Memory Management)",
                    "type": "lab",
                    "room": "Lab 404 (OS Lab)",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "A1",
                    "notes": "Page fault count analysis",
                },
                {
                    "id": "fri-lab-a2",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "WCD",
                    "subject_name": "Web Dev Lab (Exp 4: Next.js SSR & API Routes)",
                    "type": "lab",
                    "room": "Lab 406 (Web Systems Lab)",
                    "faculty": "Prof. V. Sharma",
                    "batch": "A2",
                    "notes": "API performance benchmark",
                },
                {
                    "id": "fri-lab-a3",
                    "start_time": "14:00",
                    "end_time": "16:00",
                    "time_display": "02:00 - 04:00 PM",
                    "subject_code": "OS",
                    "subject_name": "Operating Systems Lab (Exp 5: Page Replacement)",
                    "type": "lab",
                    "room": "Lab 404 (OS Lab)",
                    "faculty": "Prof. P. Deshmukh",
                    "batch": "A3",
                    "notes": "Algorithm simulation report",
                },
                {
                    "id": "fri-5",
                    "start_time": "16:00",
                    "end_time": "17:00",
                    "time_display": "04:00 - 05:00 PM",
                    "subject_code": "WEEKEND",
                    "subject_name": "Weekly Review & Weekend Study Shelf Check-in",
                    "type": "tutorial",
                    "room": "Classroom 402",
                    "faculty": "CR & Mentor",
                    "batch": "all",
                    "notes": "Upcoming deadline submissions review",
                },
            ],
        },
    ]


@router.get("")
def get_timetable(
    batch: str = "all",
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)

    # Optional map of subject code -> subject_id
    subj_map: dict[str, str] = {}
    try:
        subj_res = supabase_admin.table("subjects").select("id, code, name").eq("class_id", class_id).execute()
        if subj_res and subj_res.data:
            for sb in subj_res.data:
                c = (sb.get("code") or "").upper().strip()
                if c:
                    subj_map[c] = sb["id"]
    except Exception:
        pass

    # Calculate IST time (UTC+5:30)
    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)

    # Current weekday in IST: 0 is Monday, 4 is Friday, 5 is Saturday, 6 is Sunday
    weekday_idx = now_ist.weekday()
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    current_day_name = day_names[weekday_idx] if weekday_idx < len(day_names) else "Monday"

    cur_time_str = now_ist.strftime("%H:%M")
    cur_time_formatted = now_ist.strftime("%I:%M %p")

    # Clean batch
    selected_batch = batch.upper().strip() if batch else "ALL"
    if selected_batch not in ("A1", "A2", "A3", "ALL"):
        selected_batch = "ALL"

    days_data = _get_base_schedule()

    current_slot: Optional[dict] = None
    next_slot: Optional[dict] = None
    next_slot_diff_mins = 99999

    processed_days = []

    for d in days_data:
        day_slots = []
        is_today = d["day"].lower() == current_day_name.lower()

        for s in d["slots"]:
            # Check batch filter
            slot_batch = s.get("batch", "all")
            if selected_batch != "ALL" and slot_batch not in ("all", selected_batch):
                continue

            slot_copy = dict(s)
            s_code = (s.get("subject_code") or "").upper().strip()
            if s_code in subj_map:
                slot_copy["subject_id"] = subj_map[s_code]

            s_start = s["start_time"]
            s_end = s["end_time"]

            is_live = False
            is_past = False

            if is_today:
                if s_start <= cur_time_str < s_end:
                    is_live = True
                    current_slot = slot_copy
                elif cur_time_str >= s_end:
                    is_past = True
                elif cur_time_str < s_start:
                    # Calculate minutes until start
                    try:
                        cur_h, cur_m = map(int, cur_time_str.split(":"))
                        s_h, s_m = map(int, s_start.split(":"))
                        diff_mins = (s_h * 60 + s_m) - (cur_h * 60 + cur_m)
                        if 0 < diff_mins < next_slot_diff_mins and s.get("type") != "break":
                            next_slot_diff_mins = diff_mins
                            next_slot = dict(slot_copy)
                            next_slot["minutes_until"] = diff_mins
                    except Exception:
                        pass

            slot_copy["is_live"] = is_live
            slot_copy["is_past"] = is_past
            day_slots.append(slot_copy)

        processed_days.append({
            "day": d["day"],
            "day_code": d["day_code"],
            "slots": day_slots,
        })

    return {
        "current_day": current_day_name,
        "current_time_ist": cur_time_formatted,
        "current_slot": current_slot,
        "next_slot": next_slot,
        "selected_batch": selected_batch,
        "days": processed_days,
        "announcements": _ANNOUNCEMENTS_STORE,
    }


@router.post("/announcements", status_code=201)
def post_timetable_announcement(
    body: AnnouncementIn,
    user: CurrentUser = Depends(get_current_user),
):
    _membership(user)
    if not _is_cr(user.user_id):
        raise HTTPException(403, "Only the Class Representative can post timetable schedule updates")

    p = supabase_admin.table("profiles").select("display_name").eq("id", user.user_id).maybe_single().execute()
    author_name = p.data["display_name"] if p and p.data else "Class Representative"

    ann = {
        "id": f"tt-ann-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}",
        "text": body.text.strip(),
        "posted_by": author_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _ANNOUNCEMENTS_STORE.insert(0, ann)
    return ann
