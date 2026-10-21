import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/revision", tags=["revision"])

_MEMBERSHIP_CACHE: dict[str, tuple[float, str]] = {}
_CUSTOM_REVISION: dict[str, list[dict]] = {}


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


def _get_curated_cram_data() -> list[dict]:
    """
    High-yield exam formula sheets, solved top PYQs, and cheat sheets for TCET AI&DS Sem 4.
    """
    return [
        # DBMS
        {
            "id": "cram-dbms-1",
            "subject_code": "DBMS",
            "subject_name": "Database Management Systems",
            "category": "formula",
            "title": "Relational Algebra Operators & Equivalences",
            "summary": "Selection, Projection, Cartesian Product, Set Difference, and Natural Join symbols with SQL translation.",
            "content": "Selection: σ_condition(R)\nProjection: π_attributes(R)\nNatural Join: R ⋈ S = π_attrs(σ_equality(R × S))\nTheta Join: R ⋈_θ S = σ_θ(R × S)\nDivision: R ÷ S (Finds tuples in R associated with ALL tuples in S)",
            "marks": "5 Marks",
            "exam_frequency": "Asked every semester (May 2024, Dec 2024)",
            "high_yield": True,
            "author_name": "Class Representative",
        },
        {
            "id": "cram-dbms-2",
            "subject_code": "DBMS",
            "subject_name": "Database Management Systems",
            "category": "pyq",
            "title": "Explain 1NF, 2NF, 3NF, and BCNF with a Working Example",
            "summary": "Standard 10-mark question. Functional dependencies and lossless decomposition rules.",
            "content": "1NF: Atomic attributes, no repeating groups.\n2NF: In 1NF and NO partial dependency (every non-prime attribute is fully functionally dependent on candidate key).\n3NF: In 2NF and NO transitive dependency (if X -> Y, then X is superkey or Y is prime attribute).\nBCNF: In 3NF and for every X -> Y, X MUST be a superkey.",
            "marks": "10 Marks",
            "exam_frequency": "Repeated 4 times in Mumbai Univ papers",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },
        {
            "id": "cram-dbms-3",
            "subject_code": "DBMS",
            "subject_name": "Database Management Systems",
            "category": "one_pager",
            "title": "ACID Properties & Serializability Quick Reference",
            "summary": "Atomicity, Consistency, Isolation, Durability + Conflict Serializability Precedence Graph testing.",
            "content": "Precedence Graph (Testing Conflict Serializability):\n1. Node for each transaction Ti.\n2. Directed edge Ti -> Tj if Ti reads/writes an item before Tj writes it, or Ti writes before Tj reads/writes.\n3. If NO cycles in graph => Schedule is Conflict Serializable!",
            "marks": "5 Marks",
            "exam_frequency": "Compulsory Q1 short note",
            "high_yield": True,
            "author_name": "Classmate Notes",
        },

        # MACHINE LEARNING
        {
            "id": "cram-ml-1",
            "subject_code": "ML",
            "subject_name": "Machine Learning",
            "category": "formula",
            "title": "Model Evaluation Metrics: Precision, Recall, F1 & Confusion Matrix",
            "summary": "Essential formulas for classification performance testing.",
            "content": "Accuracy = (TP + TN) / (TP + TN + FP + FN)\nPrecision = TP / (TP + FP)  [How many selected items are relevant?]\nRecall (Sensitivity) = TP / (TP + FN)  [How many relevant items are selected?]\nF1-Score = 2 * (Precision * Recall) / (Precision + Recall)\nSpecificity = TN / (TN + FP)",
            "marks": "5 Marks",
            "exam_frequency": "Always asked in IA-1 and End-Sem",
            "high_yield": True,
            "author_name": "AI&DS Peer",
        },
        {
            "id": "cram-ml-2",
            "subject_code": "ML",
            "subject_name": "Machine Learning",
            "category": "pyq",
            "title": "Derive Gradient Descent Update Rule for Linear Regression",
            "summary": "Step-by-step derivation of Mean Squared Error (MSE) loss and parameter updates.",
            "content": "Cost Function: J(w, b) = (1/2m) * Σ (h_w(x^(i)) - y^(i))^2\nPartial Derivative w.r.t w: ∂J/∂w = (1/m) * Σ (h_w(x^(i)) - y^(i)) * x^(i)\nUpdate Rule: w := w - α * ∂J/∂w\nPartial Derivative w.r.t b: ∂J/∂b = (1/m) * Σ (h_w(x^(i)) - y^(i))\nUpdate Rule: b := b - α * ∂J/∂b",
            "marks": "10 Marks",
            "exam_frequency": "Frequent 10-marker in Module 2",
            "high_yield": True,
            "author_name": "ML Study Circle",
        },
        {
            "id": "cram-ml-3",
            "subject_code": "ML",
            "subject_name": "Machine Learning",
            "category": "one_pager",
            "title": "Decision Trees: Entropy, Information Gain & Gini Impurity",
            "summary": "ID3 and CART splitting criteria cheat sheet.",
            "content": "Entropy(S) = - Σ p_i * log2(p_i)\nInformation Gain(S, A) = Entropy(S) - Σ (|S_v| / |S|) * Entropy(S_v)\nGini Impurity = 1 - Σ (p_i)^2\nRule: Attribute with HIGHEST Information Gain (or lowest Gini index) is chosen as the split node.",
            "marks": "10 Marks",
            "exam_frequency": "Tested every exam season",
            "high_yield": True,
            "author_name": "Class Representative",
        },

        # COMPUTER NETWORKS
        {
            "id": "cram-cn-1",
            "subject_code": "CN",
            "subject_name": "Computer Networks",
            "category": "formula",
            "title": "Network Performance Formulas: Latency, Bandwidth-Delay Product & Sliding Window",
            "summary": "Transmission delay, propagation delay, and channel utilization calculations.",
            "content": "Transmission Delay (Tt) = Data Size (L) / Bandwidth (B)\nPropagation Delay (Tp) = Distance (d) / Propagation Speed (v)\nTotal Latency = Tt + Tp + Tq + Tproc\nEfficiency (Stop-and-Wait) = 1 / (1 + 2a), where a = Tp / Tt\nEfficiency (Go-Back-N with window size N) = N / (1 + 2a)",
            "marks": "5 Marks",
            "exam_frequency": "Numerical Q2/Q3 guaranteed",
            "high_yield": True,
            "author_name": "Network Lab CR",
        },
        {
            "id": "cram-cn-2",
            "subject_code": "CN",
            "subject_name": "Computer Networks",
            "category": "pyq",
            "title": "Compare IPv4 vs IPv6 Header Formats and Explain Subnetting",
            "summary": "Header fields breakdown, CIDR notation, and subnet calculation steps.",
            "content": "IPv4 Header: 20-60 bytes, 32-bit address, checksum included, fragmentation handled by routers.\nIPv6 Header: 40 bytes fixed, 128-bit address, no checksum, fragmentation only by sender.\nSubnetting Rule: Total subnets = 2^(borrowed bits), Valid hosts per subnet = 2^(host bits) - 2 (subtract Network ID and Broadcast).",
            "marks": "10 Marks",
            "exam_frequency": "High probability question in Module 3",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },

        # OPERATING SYSTEMS
        {
            "id": "cram-os-1",
            "subject_code": "OS",
            "subject_name": "Operating Systems",
            "category": "formula",
            "title": "CPU Scheduling & Turnaround Time Formulas",
            "summary": "Turnaround time, waiting time, and response time definitions.",
            "content": "Turnaround Time (TAT) = Completion Time (CT) - Arrival Time (AT)\nWaiting Time (WT) = Turnaround Time (TAT) - Burst Time (BT)\nResponse Time (RT) = First CPU Allocation Time - Arrival Time\nAverage Waiting Time = (Σ WT) / Total Processes",
            "marks": "5 Marks",
            "exam_frequency": "Numerical problem in every paper",
            "high_yield": True,
            "author_name": "OS Faculty Notes",
        },
        {
            "id": "cram-os-2",
            "subject_code": "OS",
            "subject_name": "Operating Systems",
            "category": "pyq",
            "title": "Banker's Algorithm for Deadlock Avoidance with Safety Algorithm",
            "summary": "Allocation matrix, Max matrix, Need matrix calculation and safe sequence derivation.",
            "content": "Need Matrix Formula: Need[i][j] = Max[i][j] - Allocation[i][j]\nSafety Algorithm:\n1. Work = Available, Finish[i] = false for all i.\n2. Find process i such that Finish[i] == false and Need[i] <= Work.\n3. Work = Work + Allocation[i], Finish[i] = true. Repeat step 2.\n4. If all Finish[i] == true => State is SAFE!",
            "marks": "10 Marks",
            "exam_frequency": "Repeated 10-marker in Module 4",
            "high_yield": True,
            "author_name": "Class Representative",
        },

        # APPLIED MATHEMATICS IV
        {
            "id": "cram-am4-1",
            "subject_code": "AM-IV",
            "subject_name": "Applied Mathematics IV",
            "category": "formula",
            "title": "Probability Distributions: Binomial, Poisson & Normal Distribution",
            "summary": "Key formulas, mean, variance, and standard deviation.",
            "content": "Binomial: P(X=r) = nCr * p^r * q^(n-r) | Mean = np, Var = npq\nPoisson: P(X=r) = (e^(-λ) * λ^r) / r! | Mean = λ, Var = λ\nNormal Distribution: Z = (X - μ) / σ (Standard Normal Variable)",
            "marks": "5 Marks",
            "exam_frequency": "Always appears in Module 1 & 2",
            "high_yield": True,
            "author_name": "Maths Circle",
        },

        # WEB & CLOUD DEVELOPMENT
        {
            "id": "cram-wcd-1",
            "subject_code": "WCD",
            "subject_name": "Web & Cloud Development",
            "category": "one_pager",
            "title": "REST API Principles & HTTP Status Codes Cheat Sheet",
            "summary": "Statelessness, idempotency, and status codes (200, 201, 204, 400, 401, 403, 404, 500).",
            "content": "GET: Safe & Idempotent (Read data)\nPOST: Neither Safe nor Idempotent (Create new resource)\nPUT: Idempotent (Full update/replacement)\nPATCH: Not necessarily Idempotent (Partial modification)\nDELETE: Idempotent (Remove resource)\nStatus Codes:\n200 OK | 201 Created | 204 No Content\n400 Bad Request | 401 Unauthorized | 403 Forbidden | 404 Not Found\n500 Internal Server Error",
            "marks": "5 Marks",
            "exam_frequency": "Compulsory short note in Module 1",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },
    ]


class RevisionCreateIn(BaseModel):
    subject_code: str = "GEN"
    category: str = "formula"
    title: str = Field(min_length=3, max_length=150)
    summary: str = Field(min_length=3, max_length=300)
    content: str = Field(min_length=5, max_length=5000)
    marks: str = "5 Marks"
    exam_frequency: str = "Mid-Sem Review"
    high_yield: bool = True


@router.get("")
def list_revision_shelf(user: CurrentUser = Depends(get_current_user)):
    """
    Returns Fast-Revision 'Cram Mode' items for TCET AI&DS:
    - Curated high-yield formula sheets
    - Frequently repeated PYQ solutions
    - 1-pager summary cheatsheets
    - Additional exam materials uploaded by peers to resources shelf
    """
    class_id = _membership(user)

    items = [dict(c) for c in _get_curated_cram_data()]

    # Fetch any uploaded PYQs or exam notes from the resources table
    try:
        res = (
            supabase_admin.table("resources")
            .select("id, title, description, kind, unit, tags, external_url, file_name, created_at, subjects(code, name)")
            .eq("class_id", class_id)
            .in_("kind", ["pyq", "notes"])
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for r in (res.data or []):
            subj = r.get("subjects") or {}
            code = subj.get("code") or "GEN"
            name = subj.get("name") or "Coursework"
            items.append({
                "id": f"res-{r['id']}",
                "subject_code": code,
                "subject_name": name,
                "category": "pyq" if r.get("kind") == "pyq" else "one_pager",
                "title": r.get("title", "Exam Resource"),
                "summary": r.get("description") or f"Uploaded exam revision file for {code}.",
                "content": f"Available for direct download from Study Shelf: {r.get('file_name') or r.get('title')}",
                "marks": "Resource File",
                "exam_frequency": "Class Shared Material",
                "high_yield": True,
                "author_name": "Classmate",
                "resource_link": f"/resources?subject_id={code}",
            })
    except Exception:
        pass

    # Add custom revision items created this session
    custom_list = _CUSTOM_REVISION.get(user.user_id, [])
    for c in custom_list:
        items.append(c)

    # Compute stats
    formula_count = sum(1 for i in items if i.get("category") == "formula")
    pyq_count = sum(1 for i in items if i.get("category") == "pyq")
    one_pager_count = sum(1 for i in items if i.get("category") == "one_pager")
    high_yield_count = sum(1 for i in items if i.get("high_yield"))

    return {
        "items": items,
        "stats": {
            "total_items": len(items),
            "formula_count": formula_count,
            "pyq_count": pyq_count,
            "one_pager_count": one_pager_count,
            "high_yield_count": high_yield_count,
        },
    }


@router.post("", status_code=201)
def create_revision_item(body: RevisionCreateIn, user: CurrentUser = Depends(get_current_user)):
    """
    Creates a new high-yield revision card (formula, PYQ solution, or cheat sheet).
    """
    p = supabase_admin.table("profiles").select("display_name").eq("id", user.user_id).maybe_single().execute()
    author_name = (p.data.get("display_name") if p and p.data else None) or "Student"

    item = {
        "id": f"cram-custom-{int(time.time()*1000)}",
        "subject_code": body.subject_code.upper().strip(),
        "subject_name": f"{body.subject_code.upper().strip()} Revision",
        "category": body.category,
        "title": body.title.strip(),
        "summary": body.summary.strip(),
        "content": body.content.strip(),
        "marks": body.marks,
        "exam_frequency": body.exam_frequency,
        "high_yield": body.high_yield,
        "author_name": author_name,
    }

    if user.user_id not in _CUSTOM_REVISION:
        _CUSTOM_REVISION[user.user_id] = []
    _CUSTOM_REVISION[user.user_id].append(item)

    return item
