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
        "text": "W.E.F 21-09-2026: Official AI&DS Division A (Semester I) Timetable is now live. Class Incharge: Mr. Atul Chaturvedi.",
        "posted_by": "Mr. Atul Chaturvedi (Class Incharge)",
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


def _normalize_batch(batch: Optional[str]) -> str:
    if not batch:
        return "ALL"
    b = batch.strip().upper()
    if b in ("1", "B1", "BATCH 1", "A1"):
        return "Batch 1"
    if b in ("2", "B2", "BATCH 2", "A2"):
        return "Batch 2"
    if b in ("3", "B3", "BATCH 3", "A3"):
        return "Batch 3"
    return "ALL"


def _get_base_schedule() -> list[dict]:
    """
    Official Class Timetable for AI&DS A (Semester - I).
    W.E.F: 21-09-2026 to 17-12-2026
    Class Incharge: Mr. Atul Chaturvedi
    Rooms: 503, 505, 531, 512, 517, Drawing Hall, Main Workshop, Labs
    Batches: Batch 1, Batch 2, Batch 3
    """
    return [
        {
            "day": "Monday",
            "day_code": "mon",
            "slots": [
                {
                    "id": "mon-wmp-1",
                    "start_time": "08:30",
                    "end_time": "10:30",
                    "time_display": "08:30 - 10:30 AM",
                    "subject_code": "WMP-I",
                    "subject_name": "Workshop Practice - I",
                    "type": "lab",
                    "room": "Main Workshop",
                    "faculty": "Workshop Staff",
                    "batch": "all",
                    "notes": "Fitting, Carpentry & Sheet Metal practical skills (Safety gear mandatory)",
                },
                {
                    "id": "mon-maths-1",
                    "start_time": "10:30",
                    "end_time": "11:30",
                    "time_display": "10:30 - 11:30 AM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "all",
                    "notes": "Differential Calculus & Expansion of Functions",
                },
                {
                    "id": "mon-break-1",
                    "start_time": "11:30",
                    "end_time": "12:30",
                    "time_display": "11:30 - 12:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess & Lunch Break",
                    "type": "break",
                    "room": "Campus Cafeteria",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "mon-bee-1",
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "time_display": "12:30 - 01:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "all",
                    "notes": "DC Circuit Theorems & Mesh Analysis",
                },
                {
                    "id": "mon-phy-1",
                    "start_time": "13:30",
                    "end_time": "14:30",
                    "time_display": "01:30 - 02:30 PM",
                    "subject_code": "PHY",
                    "subject_name": "Physics",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "all",
                    "notes": "Interference in Thin Films & Laser Physics",
                },
                {
                    "id": "mon-nl-1",
                    "start_time": "14:30",
                    "end_time": "18:30",
                    "time_display": "02:30 - 06:30 PM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Continuous Evaluation & Practice Session",
                    "type": "tutorial",
                    "room": "Library / Self-Study Hall",
                    "faculty": "Department Mentors",
                    "batch": "all",
                    "notes": "Formative assessments, doubt-solving & collaborative learning",
                },
            ],
        },
        {
            "day": "Tuesday",
            "day_code": "tue",
            "slots": [
                {
                    "id": "tue-tut-b1",
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "time_display": "08:30 - 09:30 AM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I Tutorial",
                    "type": "tutorial",
                    "room": "Room 503",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "Batch 1",
                    "notes": "Tutorial Sheet 1: Matrices & Linear Systems",
                },
                {
                    "id": "tue-tut-b2",
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "time_display": "08:30 - 09:30 AM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I Tutorial",
                    "type": "tutorial",
                    "room": "Room 505",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "Batch 2",
                    "notes": "Tutorial Sheet 1: Matrices & Linear Systems",
                },
                {
                    "id": "tue-maths-1",
                    "start_time": "09:30",
                    "end_time": "10:30",
                    "time_display": "09:30 - 10:30 AM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "all",
                    "notes": "Eigenvalues, Eigenvectors & Cayley-Hamilton Theorem",
                },
                # Practical Batch Rotation 10:30 AM - 12:30 PM
                {
                    "id": "tue-lab-b1",
                    "start_time": "10:30",
                    "end_time": "12:30",
                    "time_display": "10:30 - 12:30 PM",
                    "subject_code": "PHY",
                    "subject_name": "Physics Practical",
                    "type": "lab",
                    "room": "Room 515 (Physics Lab)",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "Batch 1",
                    "notes": "Newton's Rings experiment & wedge-shaped film measurements",
                },
                {
                    "id": "tue-lab-b2",
                    "start_time": "10:30",
                    "end_time": "12:30",
                    "time_display": "10:30 - 12:30 PM",
                    "subject_code": "EGPC",
                    "subject_name": "English & Professional Communication Lab",
                    "type": "lab",
                    "room": "Room 507 (Language Lab)",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "Batch 2",
                    "notes": "Phonetics, accent neutralization & interactive speech drills",
                },
                {
                    "id": "tue-lab-b3",
                    "start_time": "10:30",
                    "end_time": "12:30",
                    "time_display": "10:30 - 12:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering Lab",
                    "type": "lab",
                    "room": "Room 122 (BEE Lab)",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "Batch 3",
                    "notes": "Thevenin & Norton theorem circuit verification",
                },
                {
                    "id": "tue-break-1",
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "time_display": "12:30 - 01:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess & Lunch Break",
                    "type": "break",
                    "room": "Campus Cafeteria",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "tue-phy-1",
                    "start_time": "13:30",
                    "end_time": "14:30",
                    "time_display": "01:30 - 02:30 PM",
                    "subject_code": "PHY",
                    "subject_name": "Physics",
                    "type": "lecture",
                    "room": "Room 505",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "all",
                    "notes": "Quantum Physics: de Broglie hypothesis & wave packets",
                },
                {
                    "id": "tue-bee-1",
                    "start_time": "14:30",
                    "end_time": "15:30",
                    "time_display": "02:30 - 03:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering",
                    "type": "lecture",
                    "room": "Room 505",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "all",
                    "notes": "Single Phase AC Circuits: Phasor representations",
                },
                {
                    "id": "tue-nl-1",
                    "start_time": "15:30",
                    "end_time": "18:30",
                    "time_display": "03:30 - 06:30 PM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Notional Learning & Self Study",
                    "type": "tutorial",
                    "room": "Library / Self-Study Hall",
                    "faculty": "Department Mentors",
                    "batch": "all",
                },
            ],
        },
        {
            "day": "Wednesday",
            "day_code": "wed",
            "slots": [
                {
                    "id": "wed-nl-morning",
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "time_display": "08:30 - 09:30 AM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Morning Self Learning & Review",
                    "type": "tutorial",
                    "room": "Library / Study Hall",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "wed-maths-1",
                    "start_time": "09:30",
                    "end_time": "10:30",
                    "time_display": "09:30 - 10:30 AM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "all",
                    "notes": "Successive Differentiation & Leibniz Theorem",
                },
                {
                    "id": "wed-egpc-1",
                    "start_time": "10:30",
                    "end_time": "11:30",
                    "time_display": "10:30 - 11:30 AM",
                    "subject_code": "EGPC",
                    "subject_name": "English for General & Professional Communication",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "all",
                    "notes": "Professional Correspondence & Workplace Writing",
                },
                {
                    "id": "wed-break-1",
                    "start_time": "11:30",
                    "end_time": "12:30",
                    "time_display": "11:30 - 12:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess & Lunch Break",
                    "type": "break",
                    "room": "Campus Cafeteria",
                    "faculty": "Department",
                    "batch": "all",
                },
                # Practical Batch Rotation 12:30 PM - 02:30 PM
                {
                    "id": "wed-lab-b1",
                    "start_time": "12:30",
                    "end_time": "14:30",
                    "time_display": "12:30 - 02:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering Lab",
                    "type": "lab",
                    "room": "Room 122 (BEE Lab)",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "Batch 1",
                    "notes": "RLC Series & Parallel resonance measurements",
                },
                {
                    "id": "wed-lab-b2",
                    "start_time": "12:30",
                    "end_time": "14:30",
                    "time_display": "12:30 - 02:30 PM",
                    "subject_code": "PHY",
                    "subject_name": "Physics Practical",
                    "type": "lab",
                    "room": "Room 515 (Physics Lab)",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "Batch 2",
                    "notes": "Spectrometer: determination of angle of prism",
                },
                {
                    "id": "wed-lab-b3",
                    "start_time": "12:30",
                    "end_time": "14:30",
                    "time_display": "12:30 - 02:30 PM",
                    "subject_code": "EGPC",
                    "subject_name": "English & Professional Communication Lab",
                    "type": "lab",
                    "room": "Room 507 (Language Lab)",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "Batch 3",
                    "notes": "Group discussion techniques & vocabulary exercises",
                },
                {
                    "id": "wed-egd-1",
                    "start_time": "14:30",
                    "end_time": "15:30",
                    "time_display": "02:30 - 03:30 PM",
                    "subject_code": "EGD",
                    "subject_name": "Engineering Graphics & Design",
                    "type": "lecture",
                    "room": "Room 512",
                    "faculty": "Dr. Prasad Kawade",
                    "batch": "all",
                    "notes": "Principles of Orthographic Projections & First Angle Projection",
                },
                {
                    "id": "wed-nl-afternoon",
                    "start_time": "15:30",
                    "end_time": "18:30",
                    "time_display": "03:30 - 06:30 PM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Collaborative Learning & Practice",
                    "type": "tutorial",
                    "room": "Library / Self-Study Hall",
                    "faculty": "Department Mentors",
                    "batch": "all",
                },
            ],
        },
        {
            "day": "Thursday",
            "day_code": "thu",
            "slots": [
                {
                    "id": "thu-egpc-1",
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "time_display": "08:30 - 09:30 AM",
                    "subject_code": "EGPC",
                    "subject_name": "English for General & Professional Communication",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "all",
                    "notes": "Grammar, Reading Comprehension & Business Communication",
                },
                {
                    "id": "thu-bee-1",
                    "start_time": "09:30",
                    "end_time": "10:30",
                    "time_display": "09:30 - 10:30 AM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "all",
                    "notes": "Single Phase Transformers & EMF Equation",
                },
                {
                    "id": "thu-acad-1",
                    "start_time": "10:30",
                    "end_time": "12:30",
                    "time_display": "10:30 - 12:30 PM",
                    "subject_code": "ACAD",
                    "subject_name": "Academic Mentorship & Guidance Session",
                    "type": "lecture",
                    "room": "Room 216",
                    "faculty": "Faculty Coordinator",
                    "batch": "all",
                    "notes": "Curriculum orientation, academic counseling & performance review",
                },
                {
                    "id": "thu-break-1",
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "time_display": "12:30 - 01:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess & Lunch Break",
                    "type": "break",
                    "room": "Campus Cafeteria",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "thu-egd-1",
                    "start_time": "13:30",
                    "end_time": "14:30",
                    "time_display": "01:30 - 02:30 PM",
                    "subject_code": "EGD",
                    "subject_name": "Engineering Graphics & Design",
                    "type": "lecture",
                    "room": "Room 517",
                    "faculty": "Dr. Prasad Kawade",
                    "batch": "all",
                    "notes": "Projections of Lines & Planes inclined to HP and VP",
                },
                # Practical Batch Rotation 02:30 PM - 04:30 PM
                {
                    "id": "thu-lab-b1",
                    "start_time": "14:30",
                    "end_time": "16:30",
                    "time_display": "02:30 - 04:30 PM",
                    "subject_code": "EGPC",
                    "subject_name": "English & Professional Communication Lab",
                    "type": "lab",
                    "room": "Room 314",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "Batch 1",
                    "notes": "Oral presentation, professional body language & mock dialogues",
                },
                {
                    "id": "thu-lab-b2",
                    "start_time": "14:30",
                    "end_time": "16:30",
                    "time_display": "02:30 - 04:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "Basic Electrical Engineering Lab",
                    "type": "lab",
                    "room": "Room 123 (BEE Lab)",
                    "faculty": "Mr. Rajesh Raj",
                    "batch": "Batch 2",
                    "notes": "Transformer open-circuit and short-circuit tests",
                },
                {
                    "id": "thu-lab-b3",
                    "start_time": "14:30",
                    "end_time": "16:30",
                    "time_display": "02:30 - 04:30 PM",
                    "subject_code": "PHY",
                    "subject_name": "Physics Practical",
                    "type": "lab",
                    "room": "Room 117",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "Batch 3",
                    "notes": "Semiconductor band gap and Hall effect measurement",
                },
                {
                    "id": "thu-nl-1",
                    "start_time": "16:30",
                    "end_time": "18:30",
                    "time_display": "04:30 - 06:30 PM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Collaborative Practice Session",
                    "type": "tutorial",
                    "room": "Library / Self-Study Hall",
                    "faculty": "Department Mentors",
                    "batch": "all",
                },
            ],
        },
        {
            "day": "Friday",
            "day_code": "fri",
            "slots": [
                {
                    "id": "fri-egd-p",
                    "start_time": "08:30",
                    "end_time": "10:30",
                    "time_display": "08:30 - 10:30 AM",
                    "subject_code": "EGD",
                    "subject_name": "Engineering Graphics Practical [EGD (P)]",
                    "type": "lab",
                    "room": "Drawing Hall",
                    "faculty": "Dr. Prasad Kawade",
                    "batch": "all",
                    "notes": "Drawing Sheets submission & CAD orthographic projections",
                },
                {
                    "id": "fri-phy-1",
                    "start_time": "10:30",
                    "end_time": "11:30",
                    "time_display": "10:30 - 11:30 AM",
                    "subject_code": "PHY",
                    "subject_name": "Physics",
                    "type": "lecture",
                    "room": "Room 503",
                    "faculty": "Mr. Atul Chaturvedi",
                    "batch": "all",
                    "notes": "Electromagnetic Induction & Maxwell's Equations",
                },
                {
                    "id": "fri-break-1",
                    "start_time": "11:30",
                    "end_time": "12:30",
                    "time_display": "11:30 - 12:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess & Lunch Break",
                    "type": "break",
                    "room": "Campus Cafeteria",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "fri-maths-1",
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "time_display": "12:30 - 01:30 PM",
                    "subject_code": "MATHS-I",
                    "subject_name": "Mathematics-I",
                    "type": "lecture",
                    "room": "Room 531",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "all",
                    "notes": "Partial Differentiation & Euler's Theorem for Homogeneous Functions",
                },
                {
                    "id": "fri-egpc-1",
                    "start_time": "13:30",
                    "end_time": "14:30",
                    "time_display": "01:30 - 02:30 PM",
                    "subject_code": "EGPC",
                    "subject_name": "English for General & Professional Communication",
                    "type": "lecture",
                    "room": "Room 531",
                    "faculty": "Ms. Jyoti Vanawe",
                    "batch": "all",
                    "notes": "Technical Report Writing & Formatting Standards",
                },
                {
                    "id": "fri-nl-1",
                    "start_time": "14:30",
                    "end_time": "18:30",
                    "time_display": "02:30 - 06:30 PM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Continuous Evaluation & Formative Assessments",
                    "type": "tutorial",
                    "room": "Library / Self-Study Hall",
                    "faculty": "Department Mentors",
                    "batch": "all",
                    "notes": "Weekly assignment submission and journal evaluations",
                },
            ],
        },
        {
            "day": "Saturday",
            "day_code": "sat",
            "slots": [
                {
                    "id": "sat-nl-1",
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "time_display": "08:30 - 09:30 AM",
                    "subject_code": "NL/CE/SL/CL/PS",
                    "subject_name": "Self-Directed Study Session",
                    "type": "tutorial",
                    "room": "Online",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "sat-aad-1",
                    "start_time": "09:30",
                    "end_time": "10:30",
                    "time_display": "09:30 - 10:30 AM",
                    "subject_code": "AAD-I",
                    "subject_name": "Attitude & Aptitude Development - I",
                    "type": "lecture",
                    "room": "Online",
                    "faculty": "Ms. Pooja Pote",
                    "batch": "all",
                    "notes": "Quantitative Aptitude, Speed Math & Verbal Logic Foundations",
                },
                {
                    "id": "sat-bee-egd",
                    "start_time": "10:30",
                    "end_time": "12:30",
                    "time_display": "10:30 - 12:30 PM",
                    "subject_code": "BEE",
                    "subject_name": "BEE / EGD Additional Online Lecture",
                    "type": "lecture",
                    "room": "Online",
                    "faculty": "Mr. Rajesh Raj / Dr. Prasad Kawade",
                    "batch": "all",
                    "notes": "Additional numerical problem solving & engineering drawing tutorials",
                },
                {
                    "id": "sat-break-1",
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "time_display": "12:30 - 01:30 PM",
                    "subject_code": "BREAK",
                    "subject_name": "Recess Break",
                    "type": "break",
                    "room": "Online",
                    "faculty": "Department",
                    "batch": "all",
                },
                {
                    "id": "sat-maths-phy",
                    "start_time": "13:30",
                    "end_time": "15:30",
                    "time_display": "01:30 - 03:30 PM",
                    "subject_code": "MATHS-I",
                    "subject_name": "MATHS-I / PHY Additional Online Lecture",
                    "type": "lecture",
                    "room": "Online",
                    "faculty": "Ms. Pooja Pote / Mr. Atul Chaturvedi",
                    "batch": "all",
                    "notes": "Extended problem sets, previous year paper discussions & doubt resolution",
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

    # Clean and normalize batch
    selected_batch = _normalize_batch(batch)

    days_data = _get_base_schedule()

    current_slot: Optional[dict] = None
    next_slot: Optional[dict] = None
    next_slot_diff_mins = 99999

    processed_days = []

    for d in days_data:
        day_slots = []
        is_today = d["day"].lower() == current_day_name.lower()

        for s in d["slots"]:
            # Check batch filter: "all" matches any student batch
            slot_batch = s.get("batch", "all")
            if selected_batch != "ALL" and slot_batch != "all" and slot_batch != selected_batch:
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
