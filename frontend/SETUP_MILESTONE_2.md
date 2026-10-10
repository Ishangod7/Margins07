# Margins — Milestone 2: Notice Board

## New in this milestone
- `notices` table + RLS (only `role = 'cr'` can create/edit/pin/delete; all
  active class members can read)
- `/notices` — the live Notice Board page (server component, real data)
- `/login` — was missing from Milestone 1, added now
- Server actions in `lib/actions/notices.ts`: `createNotice`, `togglePin`, `deleteNotice`

## 1. Run the new migration
Supabase Dashboard → SQL Editor → run:
`supabase/migrations/002_milestone2_notices.sql`

## 2. Promote yourself to CR (manual for now)
In SQL Editor:
```sql
update public.profiles set role = 'cr' where id = 'YOUR_USER_UUID';
```
Find your UUID in Supabase → Authentication → Users.

## 3. Test it
```
npm install
npm run dev
```
- Sign up / log in
- Visit `/notices`
- As CR: expand "+ new notice", post one, pin it, delete it
- As a non-CR account: confirm the composer and pin/delete buttons don't
  appear, AND confirm that even if you tried to hit the server action
  directly, RLS would reject it (the UI hiding buttons is not the real
  security boundary — the database policy is)

## Sanity checks
- [ ] Pinned notices sort to the top
- [ ] Non-CR account cannot create/pin/delete (test via UI, and ideally via
      a raw `supabase.from('notices').insert(...)` call in the browser console
      logged in as a member — it should be rejected by RLS)
- [ ] Notices are scoped to your class — a second class (if you ever add one)
      shouldn't see them

## What's NOT here yet
- Attachments (`attachment_path` field exists in the schema, upload UI doesn't yet)
- `expires_at` auto-hiding of old notices
- Editing an existing notice (delete + repost works for now)

## Next: Milestone 3 — Resource Shelf
`resources` table + private Storage bucket + signed-URL download flow — this
is the trickiest piece per the original spec, budget real time for it.
