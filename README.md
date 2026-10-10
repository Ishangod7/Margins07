# Margins ✎ 📌

> **A student-first campus hub designed for TCET Mumbai AI&DS Division A.**  
> Replacing cluttered WhatsApp groups and scattered Google Drives with a centralized study-desk and sketchbook dashboard.

---

## 🏛️ Architecture & Trust Boundary

Margins follows a strict split architecture designed for security, separation of concerns, and clean authorization:

```
┌─────────────────────────────────┐
│     Next.js 16 Frontend UI      │  (Port 3000)
│   (Paper / Sketchbook Theme)    │  - Pure UI & layout rendering
│                                 │  - Next.js App Router (React 19)
└────────────────┬────────────────┘
                 │ Authorization: Bearer <access_token>
                 ▼
┌─────────────────────────────────┐
│     FastAPI Python Backend      │  (Port 8000)
│   (Central Trust Boundary)      │  - Verifies Supabase JWT (HS256)
│                                 │  - Enforces class membership (_membership)
│                                 │  - Enforces CR permissions (_require_cr)
│                                 │  - Holds private SERVICE_ROLE_KEY
└────────────────┬────────────────┘
                 │ Service-role admin connection
                 ▼
┌─────────────────────────────────┐
│       Supabase Platform         │  - PostgreSQL with RLS secondary defense
│  (Auth, Database, Storage)      │  - Supabase GoTrue Auth
│                                 │  - Private storage buckets & signed URLs
└─────────────────────────────────┘
```

---

## 🔒 Security & Protecting Secret Keys

> [!CAUTION]
> **NEVER commit `.env` or `.env.local` files to Git!**  
> Secrets must remain local and are protected by [.gitignore](file:///.gitignore).

### Key Responsibilities:

| Key | Where it lives | Exposed to Browser? | Purpose |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend & Backend | **Yes** (Public) | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | **Yes** (Public) | Safe client-side key for auth sessions |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | **Yes** (Public) | Points to FastAPI (`http://localhost:8000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | ❌ **NEVER** | Admin key with full DB bypass. **Server only!** |
| `SUPABASE_JWT_SECRET` | `backend/.env` | ❌ **NEVER** | HMAC-SHA256 secret to verify bearer tokens locally |

---

## 📂 Project Structure

```
margins/
├── backend/                  # FastAPI Python application
│   ├── app/
│   │   ├── main.py           # App entry, CORS, and router registration
│   │   ├── auth.py           # JWT decoder & token validation
│   │   ├── config.py         # Environment loader
│   │   ├── db.py             # Supabase service-role admin client
│   │   └── routers/          # Route modules
│   │       ├── auth_routes.py# Invite-code gated signup
│   │       ├── me.py         # Current user profile & membership
│   │       └── notices.py    # Notice feed, CR composer, pin & delete
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Template for backend secrets
│
├── frontend/                 # Next.js 16 Web application
│   ├── app/                  # App Router pages
│   │   ├── (auth)/           # Login & Signup flows
│   │   ├── notices/          # Live Notice Board
│   │   ├── resources/        # Resource Shelf (Milestone 3)
│   │   ├── doubts/           # Doubt Board (Milestone 4)
│   │   ├── people/           # Class directory (Milestone 5)
│   │   └── settings/         # Profile & privacy settings
│   ├── components/           # UI components (AppShell, NoticeTools)
│   ├── design-reference/     # Full HTML/CSS sketchbook prototype mocks
│   ├── lib/                  # API client & session cookie helpers
│   ├── supabase/migrations/  # Idempotent PostgreSQL schemas & RLS
│   └── .env.local.example    # Template for frontend variables
│
├── docs/                     # Product specs & architecture docs
│   └── MARGINS_PLAN.md       # Master 15-section project roadmap
├── .gitignore                # Protects secrets, node_modules, and virtualenvs
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** v18+ (tested on v24)
- **Python** 3.11+
- **Supabase Account** with an active project

---

### 2. Database Migrations
In your Supabase project's **SQL Editor**, run the migrations located in `frontend/supabase/migrations/`:
1. `001_milestone1_auth_profiles.sql` (Creates classes, profiles, memberships, and default invite code `DIVA2026`)
2. `002_milestone2_notices.sql` (Creates notices table and policies)

---

### 3. Backend Setup (FastAPI)

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create `.env` from template:
   ```bash
   cp .env.example .env
   ```
   Fill in your values:
   ```ini
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ALLOWED_ORIGINS=http://localhost:3000
   ```
   *(Find JWT Secret in: Supabase → Project Settings → API → JWT Secret)*
5. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * Interactive API docs: `http://localhost:8000/docs`
   * Health check: `http://localhost:8000/health`

---

### 4. Frontend Setup (Next.js)

1. Open a terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` from template:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your values:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
5. Visit **`http://localhost:3000`** in your browser.

---

## 👑 Promoting a User to Class Representative (CR)

By default, newly registered users have the `member` role. To promote a user to `cr` so they can post, pin, and delete notices:

Run in the **Supabase SQL Editor**:
```sql
UPDATE public.profiles 
SET role = 'cr' 
WHERE id = '<USER_UUID>';
```
*(Find your user UUID in Supabase Dashboard → Authentication → Users)*

---

## 🗺️ Roadmap & Current Status

* **Milestone 1 — Auth & Profiles**: ✅ Complete (Invite-code registration, login, profile initialization).
* **Milestone 2 — Notice Board**: ✅ Complete (Notice feed, CR composer, pin/unpin, delete).
* **Milestone 3 — Resource Shelf**: 🟡 Up Next (Subject categorization, private Supabase Storage bucket, signed download URLs).
* **Milestone 4 — Doubt Board**: ⏳ In Queue (Q&A feed, threaded answers, upvoting, solution acceptance).
* **Milestone 5 — People & Directory**: ⏳ In Queue (Classmate search, skills, privacy visibility toggles).
* **Milestone 6 — Personal Area**: ⏳ In Queue (Unified saved items, activity feed, notifications).

---

## 📄 License & Attribution
Created for students of **TCET Mumbai (AI&DS Division A)**.  
Built with FastAPI, Next.js, and Supabase.
