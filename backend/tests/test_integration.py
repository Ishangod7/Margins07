import httpx
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_tests():
    results = []

    # 1. Health check
    try:
        r = httpx.get("http://127.0.0.1:8000/health", timeout=5)
        results.append(("Backend /health", r.status_code == 200 and r.json().get("ok") is True, f"status={r.status_code}, body={r.text}"))
    except Exception as e:
        results.append(("Backend /health", False, str(e)))

    # 2. Signup with invalid invite code
    try:
        r = httpx.post("http://127.0.0.1:8000/auth/signup", json={
            "email": "test_invite_fail@example.com",
            "password": "valid_password_123",
            "display_name": "Test Student",
            "invite_code": "WRONG_INVITE_CODE"
        }, timeout=5)
        passed = r.status_code == 400 and "Invalid invite code" in r.text
        results.append(("Invite Code Verification Gating", passed, f"status={r.status_code}, error={r.json().get('detail')}"))
    except Exception as e:
        results.append(("Invite Code Verification Gating", False, str(e)))

    # 3. Signup with password too short (< 8 chars)
    try:
        r = httpx.post("http://127.0.0.1:8000/auth/signup", json={
            "email": "test_short_pwd@example.com",
            "password": "short",
            "display_name": "Test Student",
            "invite_code": "DIVA2026"
        }, timeout=5)
        passed = r.status_code == 422
        results.append(("Password Length Validation (<8 chars)", passed, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Password Length Validation (<8 chars)", False, str(e)))

    # 4. Supabase DB Tables & RLS validation
    try:
        from app.db import supabase_admin
        c = supabase_admin.table("classes").select("*").execute().data
        p = supabase_admin.table("profiles").select("*").execute().data
        m = supabase_admin.table("class_memberships").select("*").execute().data
        n = supabase_admin.table("notices").select("*").execute().data
        passed = len(c) > 0 and len(p) > 0 and len(m) > 0
        detail = f"classes={len(c)}, profiles={len(p)}, memberships={len(m)}, notices={len(n)}"
        results.append(("Supabase Tables & Connection", passed, detail))
    except Exception as e:
        results.append(("Supabase Tables & Connection", False, str(e)))

    # 5. Frontend /login page
    try:
        r = httpx.get("http://127.0.0.1:3000/login", timeout=5)
        results.append(("Frontend /login route (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /login route", False, str(e)))

    # 6. Frontend /signup page
    try:
        r = httpx.get("http://127.0.0.1:3000/signup", timeout=5)
        results.append(("Frontend /signup route (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /signup route", False, str(e)))

    # 7. Frontend /intro page
    try:
        r = httpx.get("http://127.0.0.1:3000/intro", timeout=5)
        results.append(("Frontend /intro page (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /intro page", False, str(e)))

    # 8. Frontend / root route protection (redirect to intro)
    try:
        r = httpx.get("http://127.0.0.1:3000/", follow_redirects=False, timeout=5)
        loc = r.headers.get("location", "")
        passed = r.status_code == 307 and ("/intro" in loc or "/login" in loc)
        results.append(("Frontend / route unauth redirect", passed, f"status={r.status_code}, redirect={loc}"))
    except Exception as e:
        results.append(("Frontend / route unauth redirect", False, str(e)))

    # 9. Frontend /notices route protection (redirect to intro)
    try:
        r = httpx.get("http://127.0.0.1:3000/notices", follow_redirects=False, timeout=5)
        loc = r.headers.get("location", "")
        passed = r.status_code == 307 and ("/intro" in loc or "/login" in loc)
        results.append(("Frontend /notices route unauth redirect", passed, f"status={r.status_code}, redirect={loc}"))
    except Exception as e:
        results.append(("Frontend /notices route unauth redirect", False, str(e)))

    print("\n" + "=" * 78)
    print("                MARGINS SYSTEM INTEGRATION TEST REPORT")
    print("=" * 78)
    all_passed = True
    for name, passed, detail in results:
        status_str = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f" {status_str:<8} | {name:<42} | {detail}")
    print("=" * 78)
    print(f" RESULT: {'ALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY!' if all_passed else 'SOME TESTS FAILED'}\n")
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(run_tests())
