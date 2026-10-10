# Margins — split project

```
margins/
  backend/    FastAPI (verifies Supabase JWT, service-role DB access, all authz)
  frontend/   Next.js (UI only; calls the API with the Supabase access token)
  frontend/supabase/migrations/   run 001 then 002 in the Supabase SQL editor
```

## Run it
**Backend**
```
cd backend
pip install -r requirements.txt
cp .env.example .env     # fill SUPABASE_URL, SERVICE_ROLE_KEY, JWT_SECRET
uvicorn app.main:app --reload --port 8000
```
JWT secret: Supabase → Project Settings → API → JWT Secret. Never put the service-role key in the frontend.

**Frontend**
```
cd frontend
npm install
cp .env.local.example .env.local   # URL, anon key, NEXT_PUBLIC_API_URL
npm run dev
```

## Status
Done: signup (invite code), login, Home, Notice Board (CR post/pin/delete) — all via the API.
Next: port remaining screens of design-reference/tcet-student-hub.html (Resources, Doubts, People, Settings, Activity, Saved, Notifications), each with its own FastAPI router.
Make someone a CR: `update profiles set role='cr' where id='<uuid>';`
