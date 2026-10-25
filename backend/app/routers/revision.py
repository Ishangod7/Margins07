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
    High-yield exam formula sheets, solved top PYQs, and cheat sheets for TCET AI&DS Sem 1.
    """
    return [
        # MATHEMATICS-I
        {
            "id": "cram-maths1-1",
            "subject_code": "MATHS-I",
            "subject_name": "Applied Mathematics-I",
            "category": "formula",
            "title": "Matrices, Eigenvalues & Cayley-Hamilton Theorem",
            "summary": "Characteristic equations, Cayley-Hamilton for A^(-1) and higher powers, and quadratic form diagonalization.",
            "content": "Characteristic Equation: |A - λI| = 0\nSum of Eigenvalues = Trace(A)\nProduct of Eigenvalues = det(A)\nCayley-Hamilton Theorem: Every square matrix satisfies its own characteristic equation: c_n*A^n + ... + c_1*A + c_0*I = 0.\nInverse via Cayley-Hamilton: A^(-1) = -(1/c_0) * (c_n*A^(n-1) + ... + c_1*I)\nRank of Matrix: Number of non-zero rows in Echelon form.",
            "marks": "5 Marks",
            "exam_frequency": "Guaranteed in Module 1 (Compulsory Q1)",
            "high_yield": True,
            "author_name": "Class Representative",
        },
        {
            "id": "cram-maths1-2",
            "subject_code": "MATHS-I",
            "subject_name": "Applied Mathematics-I",
            "category": "pyq",
            "title": "Euler's Theorem on Homogeneous Functions & Successive Differentiation",
            "summary": "Standard 10-mark question for partial differentiation and Leibniz rule.",
            "content": "Euler's Theorem: If u = f(x, y) is homogeneous of degree n:\nx * (∂u/∂x) + y * (∂u/∂y) = n * u\nx^2 * (∂^2u/∂x^2) + 2xy * (∂^2u/∂x∂y) + y^2 * (∂^2u/∂y^2) = n(n - 1) * u\nLeibniz Rule for nth derivative of product: (uv)_n = Σ (nCr * u_(n-r) * v_r).",
            "marks": "10 Marks",
            "exam_frequency": "Repeated in every semester paper",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },
        {
            "id": "cram-maths1-3",
            "subject_code": "MATHS-I",
            "subject_name": "Applied Mathematics-I",
            "category": "one_pager",
            "title": "Taylor's & Maclaurin's Multivariable Expansion Quick Reference",
            "summary": "Formula sheet for multivariable series expansion and maxima/minima test.",
            "content": "Maclaurin Series in 2 variables:\nf(x, y) = f(0,0) + [x*fx(0,0) + y*fy(0,0)] + (1/2!)*[x^2*fxx + 2xy*fxy + y^2*fyy] + ...\nMaxima/Minima Condition: r = fxx, s = fxy, t = fyy\n1. rt - s^2 > 0 and r < 0 => Local Maximum\n2. rt - s^2 > 0 and r > 0 => Local Minimum\n3. rt - s^2 < 0 => Saddle Point\n4. rt - s^2 = 0 => Test inconclusive.",
            "marks": "8 Marks",
            "exam_frequency": "High yield for IA-1 and End-Sem",
            "high_yield": True,
            "author_name": "Maths Circle",
        },

        # PHYSICS
        {
            "id": "cram-phy-1",
            "subject_code": "PHY",
            "subject_name": "Engineering Physics-I",
            "category": "formula",
            "title": "Interference, Thin Films & Newton's Rings Formulas",
            "summary": "Path difference, conditions for maxima/minima, and diameter calculations.",
            "content": "Path Difference in Thin Film: Δ = 2μt*cos(r) ± λ/2 (Stokes phase shift)\nBright Fringes (Reflected): 2μt*cos(r) = (2n + 1)*λ/2\nDark Fringes (Reflected): 2μt*cos(r) = n*λ\nNewton's Rings by Reflection:\nDark Ring Diameter: D_n^2 = 4n*λ*R\nBright Ring Diameter: D_n^2 = 2(2n + 1)*λ*R\nWavelength Determination: λ = (D_(n+p)^2 - D_n^2) / (4*p*R)\nRefractive Index of Liquid: μ = (D_(n+p)^2 - D_n^2)_air / (D_(n+p)^2 - D_n^2)_liquid.",
            "marks": "5 Marks",
            "exam_frequency": "Always tested in Physics numerical section",
            "high_yield": True,
            "author_name": "Physics Lab CR",
        },
        {
            "id": "cram-phy-2",
            "subject_code": "PHY",
            "subject_name": "Engineering Physics-I",
            "category": "pyq",
            "title": "Derive 1D Time-Independent Schrodinger Equation & Particle in a Box",
            "summary": "De Broglie hypothesis, wave function normalization, and quantized energy eigenvalues.",
            "content": "De Broglie Wavelength: λ = h / p = h / sqrt(2mE)\nTime-Independent Schrodinger Equation (1D):\n(d^2ψ/dx^2) + (2m/ħ^2) * (E - V(x))*ψ = 0\nParticle in Infinite 1D Potential Box (0 <= x <= L):\nBoundary Conditions: ψ(0) = 0 and ψ(L) = 0\nNormalized Wavefunction: ψ_n(x) = sqrt(2/L) * sin(n*π*x / L)\nEnergy Eigenvalues: E_n = (n^2 * h^2) / (8m * L^2), n = 1, 2, 3...",
            "marks": "10 Marks",
            "exam_frequency": "Repeated 10-marker in Quantum module",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },
        {
            "id": "cram-phy-3",
            "subject_code": "PHY",
            "subject_name": "Engineering Physics-I",
            "category": "one_pager",
            "title": "Lasers & Optical Fibres Cheat Sheet",
            "summary": "Einstein coefficients, population inversion, acceptance angle, and numerical aperture.",
            "content": "Einstein Relation: B_12 = B_21, A_21 / B_21 = (8π h ν^3) / c^3\nThree-level vs Four-level laser: Four-level achieves population inversion with lower threshold pumping.\nOptical Fibre Parameters:\nNumerical Aperture (NA) = sqrt(n_core^2 - n_cladding^2)\nAcceptance Angle (θ_a) = arcsin(NA)\nFractional Index Change: Δ = (n_core - n_cladding) / n_core\nV-Number: V = (2π * a / λ) * NA (Single mode condition: V < 2.405).",
            "marks": "8 Marks",
            "exam_frequency": "Standard Question in Module 4",
            "high_yield": True,
            "author_name": "Classmate Notes",
        },

        # BASIC ELECTRICAL ENGINEERING
        {
            "id": "cram-bee-1",
            "subject_code": "BEE",
            "subject_name": "Basic Electrical Engineering",
            "category": "formula",
            "title": "AC R-L-C Series Resonance & Power Factor Formulas",
            "summary": "Impedance, resonant frequency, quality factor, and real vs reactive power.",
            "content": "Impedance: Z = R + j(X_L - X_C) = sqrt(R^2 + (ωL - 1/ωC)^2)\nResonant Frequency: f_r = 1 / (2π * sqrt(LC))\nAt Resonance: Z_min = R, current I_max = V / R, power factor cos(φ) = 1 (unity)\nQuality Factor (Q): Q = (1/R) * sqrt(L/C) = ω_r * L / R = f_r / Bandwidth\nBandwidth: BW = f_2 - f_1 = R / (2πL)\nPower in AC: Active P = V*I*cos(φ) [Watts], Reactive Q = V*I*sin(φ) [VAR], Apparent S = V*I [VA].",
            "marks": "5 Marks",
            "exam_frequency": "Always asked in AC fundamentals",
            "high_yield": True,
            "author_name": "BEE Faculty Notes",
        },
        {
            "id": "cram-bee-2",
            "subject_code": "BEE",
            "subject_name": "Basic Electrical Engineering",
            "category": "pyq",
            "title": "Thevenin's & Norton's Theorem Analysis with Dependent/Independent Sources",
            "summary": "Step-by-step V_th, I_n, and R_th extraction with maximum power transfer verification.",
            "content": "Thevenin's Theorem Steps:\n1. Remove load resistor R_L to find Open Circuit Voltage V_th.\n2. Deactivate independent sources (voltage -> short, current -> open) to calculate R_th.\n3. Load Current: I_L = V_th / (R_th + R_L)\nMaximum Power Transfer Theorem: Occurs when R_L = R_th. P_max = V_th^2 / (4 * R_th)\nNorton's Equivalent: I_N = V_th / R_th in parallel with R_th.",
            "marks": "10 Marks",
            "exam_frequency": "Compulsory numerical in DC network theorems",
            "high_yield": True,
            "author_name": "CR Study Desk",
        },
        {
            "id": "cram-bee-3",
            "subject_code": "BEE",
            "subject_name": "Basic Electrical Engineering",
            "category": "one_pager",
            "title": "Single Phase Transformer EMF Equation & Losses Reference",
            "summary": "Turns ratio, iron losses, copper losses, and efficiency derivation.",
            "content": "EMF Equation: E1 = 4.44 * f * N1 * Φ_m, E2 = 4.44 * f * N2 * Φ_m\nTransformation Ratio: K = V2 / V1 = E2 / E1 = N2 / N1 = I1 / I2\nLosses:\n1. Core/Iron Loss (P_i): Hysteresis + Eddy current (constant at all loads, measured by OC test).\n2. Copper Loss (P_cu): I^2 * R (varies with load square, measured by SC test).\nCondition for Maximum Efficiency: Copper Loss = Iron Loss (P_cu = P_i).",
            "marks": "8 Marks",
            "exam_frequency": "Frequent 8-marker in Module 3",
            "high_yield": True,
            "author_name": "Class Representative",
        },

        # ENGINEERING GRAPHICS & DESIGN
        {
            "id": "cram-egd-1",
            "subject_code": "EGD",
            "subject_name": "Engineering Graphics & Design",
            "category": "one_pager",
            "title": "First Angle vs Third Angle Projections & Reference Planes",
            "summary": "Object positions, quadrant rules, observer alignment, and projection symbol standard.",
            "content": "First Angle Projection (Standard in India/Bureau of Indian Standards):\n- Object placed in Quadrant 1 (Above HP, in front of VP).\n- Plan (Top View) drawn BELOW the reference line xy.\n- Elevation (Front View) drawn ABOVE the reference line xy.\n- Left Side View drawn on the RIGHT of the front view.\nThird Angle Projection (Standard in USA):\n- Object in Quadrant 3 (Below HP, behind VP).\n- Top view ABOVE xy, Front view BELOW xy.",
            "marks": "5 Marks",
            "exam_frequency": "Viva and Q1 conceptual compulsory",
            "high_yield": True,
            "author_name": "Drawing Hall Staff",
        },
        {
            "id": "cram-egd-2",
            "subject_code": "EGD",
            "subject_name": "Engineering Graphics & Design",
            "category": "pyq",
            "title": "Projections of Straight Lines Inclined to Both HP and VP",
            "summary": "Apparent lengths, true lengths, apparent inclinations (alpha, beta), and true angles (theta, phi).",
            "content": "Line AB inclined to both planes:\n1. True Length (TL) makes true angle θ with HP in Front View when top view is parallel to xy.\n2. True Length (TL) makes true angle φ with VP in Top View when front view is parallel to xy.\n3. Apparent lengths: Front view length a'b' and top view length ab.\nKey Rule: Locus of point b' (front view) and locus of point b (top view) are always parallel to xy reference line.",
            "marks": "12 Marks",
            "exam_frequency": "Guaranteed 12/15-marker drawing sheet problem",
            "high_yield": True,
            "author_name": "Dr. Prasad Kawade Desk",
        },

        # ENGLISH FOR GENERAL & PROFESSIONAL COMMUNICATION
        {
            "id": "cram-egpc-1",
            "subject_code": "EGPC",
            "subject_name": "English for General & Professional Communication",
            "category": "one_pager",
            "title": "Seven Cs of Effective Technical Communication & Business Correspondence",
            "summary": "Clear, Concise, Concrete, Correct, Coherent, Complete, and Courteous communication guidelines.",
            "content": "The 7 Cs of Communication:\n1. Clarity: Purpose must be unambiguous.\n2. Conciseness: Avoid redundant jargon, stick to the point.\n3. Concreteness: Use specific facts and figures.\n4. Correctness: Grammatical precision and verified information.\n5. Coherence: Logical flow and transition between paragraphs.\n6. Completeness: Convey all necessary details so recipient can take action.\n7. Courtesy: Polite, respectful, and audience-centered tone.\nFormal Email Format: Subject line (descriptive) -> Salutation -> Purpose -> Key details (bullet points) -> Call to action -> Sign-off with credentials.",
            "marks": "5 Marks",
            "exam_frequency": "Module 1 theory question",
            "high_yield": True,
            "author_name": "Communication Cell",
        },

        # ATTITUDE & APTITUDE DEVELOPMENT - I
        {
            "id": "cram-aad1-1",
            "subject_code": "AAD-I",
            "subject_name": "Attitude & Aptitude Development - I",
            "category": "formula",
            "title": "Quantitative Aptitude Speed Shortcuts: Percentages, Ratios & Work-Time",
            "summary": "Speed-math tricks, successive percentage changes, and reciprocal fractions table.",
            "content": "Reciprocal Fractions to Memorize:\n1/2 = 50% | 1/3 = 33.33% | 1/4 = 25% | 1/5 = 20% | 1/6 = 16.67% | 1/7 = 14.28% | 1/8 = 12.5% | 1/9 = 11.11%\nSuccessive Percentage Change: Net % = a + b + (a*b / 100)\nTime & Work: If A completes in x days and B in y days, together they take (x*y) / (x + y) days.\nRelative Speed: In same direction = S1 - S2; In opposite direction = S1 + S2.",
            "marks": "5 Marks",
            "exam_frequency": "Aptitude Assessment Module",
            "high_yield": True,
            "author_name": "Ms. Pooja Pote Desk",
        },

        # WORKSHOP PRACTICE - I
        {
            "id": "cram-wmp1-1",
            "subject_code": "WMP-I",
            "subject_name": "Workshop / Manufacturing Practices - I",
            "category": "one_pager",
            "title": "Workshop Safety Protocols, Carpentry & Fitting Joints Quick Reference",
            "summary": "Personal protective equipment (PPE), marking tools, hack sawing, and lap/mortise joint rules.",
            "content": "Safety Principles:\n1. Mandatory leather apron, safety goggles, and closed safety shoes in main workshop.\n2. Never touch revolving chucks or swarf with bare hands.\nFitting Operations: Marking with scriber & dot punch -> Clamping in bench vice -> Hacksawing (cutting on forward stroke) -> Flat & smooth filing.\nCarpentry Joints: Mortise & Tenon, Halving Joint, Bridle Joint, Dovetail Joint.\nSheet Metal Tools: Snips (straight & curved), Mallet (wooden/nylon to avoid denting), Stakes (anvil, beak iron).",
            "marks": "Oral/Viva",
            "exam_frequency": "Workshop Viva and Journal Evaluation",
            "high_yield": True,
            "author_name": "Main Workshop Staff",
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
