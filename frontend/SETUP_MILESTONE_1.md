# Margins — Milestone 1 Setup

## What this milestone gives you
- Supabase auth (email + password)
- Invite-code-gated signup, checked **server-side** (never trust a client check)
- `profiles` + `classes` + `class_memberships` tables with RLS
- A signup page styled in the sketchbook design system

## 1. Create a Supabase project
Go to supabase.com, create a project, then grab from Project Settings → API:
- Project URL
- `anon` public key
- `service_role` secret key (⚠️ never expose this to the browser)

## 2. Environment variables
Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. Run the migration
In Supabase Dashboard → SQL Editor, paste and run:
`supabase/migrations/001_milestone1_auth_profiles.sql`

This creates your one class row with invite code `DIVA2026` — **change this
before sharing with real classmates** (just update the row in the `classes`
table, or re-run with a different code).

## 4. Run locally
```
npm install
npm run dev
```
Visit `http://localhost:3000/signup`.

## 5. Sanity checks before moving to Milestone 2
- [ ] Sign up with a valid invite code → account + profile + membership created
- [ ] Sign up with a wrong invite code → rejected with "Invalid invite code"
- [ ] Check Supabase Table Editor: `profiles` and `class_memberships` rows exist
- [ ] In SQL editor, confirm RLS is *on* for all three tables (Table Editor shows a shield icon)
- [ ] Try querying `profiles` as a different (or anonymous) session — should not see rows outside your class

## What's NOT in this milestone (by design)
- Login page (quick add — same pattern as signup, just `signInWithPassword`)
- CR role assignment (for now, promote someone by hand: `update profiles set role = 'cr' where id = '...'`)
- Home/dashboard page, Notice Board, Resource Shelf, Doubt Board — Milestones 2-4

## Next: Milestone 2
Notice Board — `notices` table + RLS (CR-only create/edit/pin, member read-only) + the Notice Board UI from the mockup.
