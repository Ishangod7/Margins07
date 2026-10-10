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

    # 4. Supabase DB Tables & Resource Shelf validation
    try:
        from app.db import supabase_admin
        c = supabase_admin.table("classes").select("*").execute().data or []
        p = supabase_admin.table("profiles").select("*").execute().data or []
        m = supabase_admin.table("class_memberships").select("*").execute().data or []
        n = supabase_admin.table("notices").select("*").execute().data or []
        subs = supabase_admin.table("subjects").select("*").execute().data or []
        res = supabase_admin.table("resources").select("*").execute().data or []
        saves = supabase_admin.table("resource_saves").select("*").execute().data or []
        passed = len(c) > 0 and len(p) > 0 and len(m) > 0 and len(subs) >= 7
        detail = f"classes={len(c)}, profiles={len(p)}, subjects={len(subs)}, resources={len(res)}, saves={len(saves)}"
        results.append(("Supabase Tables & Resource Schema", passed, detail))
    except Exception as e:
        results.append(("Supabase Tables & Resource Schema", False, str(e)))

    # 5. Backend /resources unauthenticated guard
    try:
        r = httpx.get("http://127.0.0.1:8000/resources", timeout=5)
        passed = r.status_code in (401, 403)
        results.append(("Backend /resources auth guard", passed, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Backend /resources auth guard", False, str(e)))

    # 6. Backend /resources/upload-url auth guard
    try:
        r = httpx.post("http://127.0.0.1:8000/resources/upload-url", json={"file_name": "test.pdf", "file_size": 100}, timeout=5)
        passed = r.status_code in (401, 403)
        results.append(("Backend /upload-url auth guard", passed, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Backend /upload-url auth guard", False, str(e)))

    # 7. Frontend /login page
    try:
        r = httpx.get("http://127.0.0.1:3000/login", timeout=5)
        results.append(("Frontend /login route (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /login route", False, str(e)))

    # 8. Frontend /signup page
    try:
        r = httpx.get("http://127.0.0.1:3000/signup", timeout=5)
        results.append(("Frontend /signup route (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /signup route", False, str(e)))

    # 9. Frontend /intro page
    try:
        r = httpx.get("http://127.0.0.1:3000/intro", timeout=5)
        results.append(("Frontend /intro page (200 OK)", r.status_code == 200, f"status={r.status_code}"))
    except Exception as e:
        results.append(("Frontend /intro page", False, str(e)))

    # 10. Frontend / root route protection (redirect to intro)
    try:
        r = httpx.get("http://127.0.0.1:3000/", follow_redirects=False, timeout=5)
        loc = r.headers.get("location", "")
        passed = r.status_code == 307 and ("/intro" in loc or "/login" in loc)
        results.append(("Frontend / route unauth redirect", passed, f"status={r.status_code}, redirect={loc}"))
    except Exception as e:
        results.append(("Frontend / route unauth redirect", False, str(e)))

    # 11. Frontend /notices route protection (redirect to intro)
    try:
        r = httpx.get("http://127.0.0.1:3000/notices", follow_redirects=False, timeout=5)
        loc = r.headers.get("location", "")
        passed = r.status_code == 307 and ("/intro" in loc or "/login" in loc)
        results.append(("Frontend /notices route unauth redirect", passed, f"status={r.status_code}, redirect={loc}"))
    except Exception as e:
        results.append(("Frontend /notices route unauth redirect", False, str(e)))

    # 12. Frontend /resources route protection (redirect to intro)
    try:
        r = httpx.get("http://127.0.0.1:3000/resources", follow_redirects=False, timeout=5)
        loc = r.headers.get("location", "")
        passed = r.status_code == 307 and ("/intro" in loc or "/login" in loc)
        results.append(("Frontend /resources route unauth redirect", passed, f"status={r.status_code}, redirect={loc}"))
    except Exception as e:
        results.append(("Frontend /resources route unauth redirect", False, str(e)))

    print("\n" + "=" * 80)
    print("                MARGINS SYSTEM INTEGRATION TEST REPORT")
    print("=" * 80)
    all_passed = True
    for name, passed, detail in results:
        status_str = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f" {status_str:<8} | {name:<42} | {detail}")
    print("=" * 80)
    total_count = len(results)
    passed_count = sum(1 for _, p, _ in results if p)
    print(f" RESULT: {passed_count}/{total_count} TESTS PASSED SUCCESSFULLY!\n")
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(run_tests())
