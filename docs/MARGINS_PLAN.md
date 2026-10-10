# Margins — Full Detailed Plan

Private class web app for **AI&DS Division A, TCET Mumbai** (~63 students).
Solo build by Ishan, phase by phase. Unofficial and student-run.
Design source: `frontend/design-reference/tcet-student-hub.html` (hand-drawn sketchbook look).

**Contents**
1. Vision, scope and non-goals
2. Users and roles
3. Architecture and trust model
4. Data model (all tables)
5. API surface (all endpoints)
6. Frontend map (routes and components)
7. Design system
8. Phase 0 to Phase 8 (detailed)
9. Security and privacy plan
10. Performance plan
11. Testing plan
12. Deployment, environments and backups
13. Launch plan for the class
14. Post-launch and v2 ideas
15. Risks, open decisions, timeline

---

## 1. Vision, scope and non-goals

**Vision:** one calm, fast place for a class. Notices don't get buried, notes don't get lost, doubts get answered.

**Why not WhatsApp:** announcements drown in chat, files expire or are impossible to find, the same doubt is asked five times, and there is no search.

**v1 scope (core):**
- Notice Board: CR posts, everyone reads.
- Resource Shelf: notes, PYQs and links, by subject, searchable.
- Doubt Board: ask, answer, vote, mark solved.
- Profiles and Settings with privacy controls.
- Notifications and global search.

**Non-goals for v1 (on purpose):**
- No direct messages and no group chat.
- No leaderboards or ranking of students.
- No attendance or marks tracking.
- No official college data and no TCET login.
- No public pages. Everything is behind login.
- No ads, no tracking of students.

**Success looks like (after 4 weeks live):**
- At least 80% of the class has signed up.
- The CR posts notices here first.
- At least 30 resources and 20 doubts exist.
- Median page load under 2 seconds on a mid-range phone.
- No privacy incident.

---

## 2. Users and roles

| Role | Who | Can do |
|---|---|---|
| Visitor | Not logged in | See only login and signup |
| Member | Verified Div A student | Read notices; upload and download resources; ask, answer, vote on doubts; edit own profile; save items; report content |
| CR | Class representative (1–2 people) | Everything a member can, plus post, edit, pin and delete notices; hide or restore reported content; rotate the invite code; see the member list |
| Admin (Ishan) | Developer | Direct database access; promotes CRs; no special UI in v1 |

**Rules**
- One class per user in v1.
- Joining needs the invite code. The CR can rotate it.
- A member can leave or delete their account at any time.
- CR role is granted manually with SQL in v1, with a UI later.

---

## 3. Architecture and trust model

```
Browser (Next.js: UI only)
   │ 1. Supabase Auth: sign in, session cookie
   │ 2. Authorization: Bearer <access token>
   ▼
FastAPI  ← trust boundary: verifies JWT, checks class + role on every route
   │ service-role key (server only)
   ▼
Supabase Postgres + Storage (private bucket)
```

**Responsibilities**
- **Frontend:** render UI, hold the login session, call the API. It never talks to the database tables directly.
- **Backend:** all authorization and validation, signed URL creation, business rules, rate limits.
- **Supabase:** auth, data, file storage, backups. RLS stays enabled as a second safety net.

**Why this split**
- One place for security checks.
- Easy to add rules like duplicate detection and notification fan-out.
- The service-role key never reaches the browser.

**Cost of this split**
- Service-role bypasses RLS, so a single missing check can leak data. Mitigation: shared helpers and a test for every router (see section 9).
- Two deployments to run.
- One extra network hop. Mitigation: deploy the backend in the same region as Supabase (Mumbai/Singapore).

**Stack**
- Frontend: Next.js 16 App Router, TypeScript, CSS Modules, `@supabase/ssr`.
- Backend: FastAPI 0.115, Pydantic 2, PyJWT (HS256, audience `authenticated`), supabase-py.
- DB: Supabase Postgres, idempotent SQL migrations in `frontend/supabase/migrations/`.
- Storage: private bucket `resources`, signed URLs.

**Auth flow**
1. Signup: `POST /auth/signup` validates the invite code, creates the auth user with `email_confirm: true`, creates the profile and membership. On any failure it deletes the auth user.
2. Client signs in with Supabase and gets a session.
3. Server components read the session cookie, and client components read it from the browser client.
4. Every API call carries the access token. The backend verifies the signature, expiry and audience.
5. Expired token (401): the frontend signs out and redirects to `/login` with a "session expired" message.

---

## 4. Data model

Conventions: `uuid` primary keys with `gen_random_uuid()`; `created_at` and `updated_at` as `timestamptz`; soft delete with `deleted_at` where content moderation matters; every content table carries `class_id`.

### 4.1 Already built
**classes**: id, name, invite_code (unique), created_at. Seed: `DIVA2026`.
**profiles**: id (= auth user id), display_name, role (`member`|`cr`), created_at, updated_at.
**class_memberships**: id, user_id, class_id, status (`active`|`removed`), joined_at. Unique (user_id, class_id).
**notices**: id, class_id, title, content, category, is_pinned, attachment_path, created_by, published_at, expires_at, created_at.

### 4.2 Notice additions (Phase 1)
- `notices.updated_at`, `notices.edited_by`, `notices.deleted_at`.
- Index `(class_id, is_pinned desc, published_at desc)`.
- Categories (check constraint): Academic, Deadline, Exam, Assignment, General, Important.
- `notice_reads` (notice_id, user_id, read_at) for unread dots. Unique (notice_id, user_id).

### 4.3 Resources (Phase 2)
**subjects**: id, class_id, name, code, semester, sort_order. Unique (class_id, name).
**resources**: id, class_id, subject_id, title, description, kind (`file`|`link`), storage_path, original_filename, mime_type, size_bytes, url, unit (text, optional), tags (text[]), uploaded_by, save_count (denormalized), download_count, created_at, updated_at, deleted_at, hidden_at.
- Check: `kind='file'` requires storage_path; `kind='link'` requires url starting with `https://`.
- Index `(class_id, subject_id, created_at desc)`; GIN full-text index on `title || description || tags`.
**resource_saves**: user_id, resource_id, created_at. Primary key (user_id, resource_id).
**resource_requests**: id, class_id, subject_id, title, details, requested_by, status (`open`|`fulfilled`), fulfilled_by_resource_id, created_at.

### 4.4 Doubts (Phase 3)
**doubts**: id, class_id, subject_id, title, body, tags (text[]), asked_by, status (`open`|`answered`|`solved`), accepted_answer_id, answer_count, follow_count, created_at, updated_at, deleted_at, hidden_at.
**answers**: id, doubt_id, class_id, body, answered_by, helpful_count, is_accepted, created_at, updated_at, deleted_at, hidden_at.
**answer_votes**: answer_id, user_id, created_at. Primary key (answer_id, user_id). Users cannot vote on their own answer (enforced in the API).
**doubt_follows**: doubt_id, user_id, created_at. Primary key (doubt_id, user_id).

### 4.5 Profiles and privacy (Phase 4)
**profiles** adds: bio, skills (text[]), interests (text[]), can_help_with (text[]), learning (text[]), avatar_path, onboarding_done, guidelines_accepted_at.
**profile_privacy**: user_id, show_bio, show_skills, show_interests, show_contributions, show_in_directory (all default `true` except those marked optional). Display name is always visible to classmates.
**saved_items**: user_id, item_type (`resource`|`doubt`|`notice`), item_id, created_at. Primary key (user_id, item_type, item_id). (Replaces the separate `resource_saves` if we unify; decide in Phase 5.)

### 4.6 Notifications (Phase 5)
**notifications**: id, user_id, type (`notice`|`answer`|`accepted`|`mention`|`request_fulfilled`), title, body, link, actor_id, read_at, created_at. Index `(user_id, read_at, created_at desc)`.

### 4.7 Moderation (Phase 6)
**reports**: id, class_id, reporter_id, target_type (`doubt`|`answer`|`resource`), target_id, reason (`spam`|`wrong`|`offensive`|`copyright`|`other`), details, status (`open`|`actioned`|`dismissed`), handled_by, handled_at, created_at.
**moderation_log**: id, class_id, actor_id, action (`hide`|`restore`|`delete`|`rotate_code`), target_type, target_id, note, created_at.

### 4.8 Misc
**invite_code_history**: class_id, old_code_hash, rotated_by, rotated_at.
**audit_events** (optional): user_id, event, ip_hash, created_at, for login and signup failures only. Kept 30 days.

---

## 5. API surface

All routes except `/health` and `/auth/signup` need a valid Bearer token. Every route resolves the caller's class first (`_membership`). CR routes call `_require_cr`. Errors use `{ "detail": "<plain-language message>" }`.

### 5.1 Built
- `GET /health`
- `POST /auth/signup`
- `GET /me`
- `GET /notices`, `POST /notices`, `PATCH /notices/{id}/pin`, `DELETE /notices/{id}`

### 5.2 Notices (Phase 1)
- `GET /notices?category=&q=&limit=&cursor=` (hides expired and deleted)
- `GET /notices/{id}` (and marks it read)
- `PATCH /notices/{id}` (CR edit)
- `POST /notices/{id}/read`
- `GET /notices/unread-count`
- Attachment: `POST /notices/upload-url` (CR), signed download on read.

### 5.3 Subjects and resources (Phase 2)
- `GET /subjects` (with resource counts)
- `POST /subjects` (CR)
- `GET /resources?subject=&kind=&q=&sort=recent|popular&limit=&cursor=`
- `POST /resources/upload-url` (returns signed upload URL + path)
- `POST /resources` (finalize metadata after upload, or create a link resource)
- `GET /resources/{id}`
- `GET /resources/{id}/download` (returns a 60-second signed URL, increments the counter)
- `PATCH /resources/{id}` (owner or CR)
- `DELETE /resources/{id}` (owner or CR)
- `POST /resources/{id}/save`, `DELETE /resources/{id}/save`
- `GET /resources/check-duplicate?title=&filename=&size=`
- `GET /resource-requests`, `POST /resource-requests`, `POST /resource-requests/{id}/fulfill`

### 5.4 Doubts (Phase 3)
- `GET /doubts?subject=&status=&q=&mine=&limit=&cursor=`
- `POST /doubts`
- `GET /doubts/{id}` (with answers, caller's vote state)
- `PATCH /doubts/{id}`, `DELETE /doubts/{id}` (owner or CR)
- `POST /doubts/{id}/answers`
- `PATCH /answers/{id}`, `DELETE /answers/{id}` (owner or CR)
- `POST /answers/{id}/accept` (asker only)
- `POST /answers/{id}/vote`, `DELETE /answers/{id}/vote`
- `POST /doubts/{id}/follow`, `DELETE /doubts/{id}/follow`

### 5.5 People and settings (Phase 4)
- `GET /people?q=&skill=`
- `GET /people/{id}` (filtered by that user's privacy settings)
- `PATCH /me/profile`
- `GET /me/privacy`, `PATCH /me/privacy`
- `POST /me/avatar-upload-url`
- `GET /me/export` (JSON of everything the user created)
- `DELETE /me` (requires password re-entry)

### 5.6 Personal area (Phase 5)
- `GET /me/activity`
- `GET /me/saved`
- `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`
- `GET /search?q=` (notices, resources, doubts, people)

### 5.7 Moderation and CR tools (Phase 6)
- `POST /reports`
- `GET /mod/reports` (CR)
- `POST /mod/reports/{id}/action` (hide, restore, dismiss)
- `GET /mod/members` (CR)
- `POST /mod/members/{id}/remove`
- `POST /mod/invite-code/rotate`

### 5.8 Conventions
- Pagination: cursor-based on `(created_at, id)`, default limit 20, max 50.
- Validation: Pydantic models with length limits on every text field.
- Rate limits (Phase 6): per-user, e.g. 20 writes/minute, 5 uploads/minute.
- IDs in paths are validated as UUIDs.
- Never return other users' emails.

---

## 6. Frontend map

### 6.1 Routes
| Route | Purpose | Phase |
|---|---|---|
| `/login`, `/signup` | Auth | Done |
| `/forgot-password`, `/reset-password` | Password reset | 1 |
| `/` | Home dashboard | Done |
| `/notices`, `/notices/[id]` | Notice board, detail | Done, 1 |
| `/resources`, `/resources/[id]`, `/resources/new`, `/resources/requests` | Shelf | 2 |
| `/doubts`, `/doubts/[id]`, `/doubts/new` | Doubt board | 3 |
| `/people`, `/people/[id]` | Directory, profile | 4 |
| `/settings/[tab]` | profile, privacy, security, data | 4 |
| `/activity`, `/saved`, `/notifications` | Personal area | 5 |
| `/mod` | CR moderation | 6 |
| `/welcome`, `/guidelines` | Onboarding | 6 |

### 6.2 Shared components
`AppShell`, `Topbar`, `Sidebar`, `BottomNav`, `Card`, `Button`, `Input`, `Select`, `Textarea`, `Tag`, `FilterPills`, `SearchBar`, `Avatar` (initials fallback), `Modal`, `ConfirmDialog`, `Toast`, `Skeleton`, `EmptyState`, `ErrorState`, `Pagination` or `LoadMore`, `FileDropzone`, `UploadProgress`, `StatusBadge`, `VoteButton`, `SaveButton`, `NotificationBell`, `SearchOverlay`.

### 6.3 Data access rules
- Server components fetch the first page with the session token (fast first paint).
- Client components handle mutations, then `router.refresh()` or update local state.
- One API client (`lib/api.ts`) with a typed error class. A 401 anywhere leads to login.
- No direct Supabase table queries from the frontend.

---

## 7. Design system

**Look:** warm paper background, ink outlines, offset shadows, slight rotations, hand-drawn accents.
**Fonts:** Caveat (titles and notes), Patrick Hand (labels and buttons), DM Sans (body).
**Tokens (in `globals.css`):** `--ink --ink-soft --paper --blue --blue-light --yellow --red --green`, spacing scale, radius set, shadow set, z-index scale.
**Primitives:** `.card .btn .input .select .textarea .eyebrow`.
**Motion:** small hover-lift, tap press, 150–200ms ease. Everything is disabled under `prefers-reduced-motion`.
**Performance guard:** limit rotated and shadowed elements per viewport, because low-end Android phones struggle with them. Use `will-change` sparingly.
**Layout breakpoints:** 0–680 mobile (bottom nav), 681–1000 tablet (collapsed sidebar), 1001+ desktop (full sidebar).
**Copy voice:** plain, friendly, short. Errors say what happened and what to do next.
**Dark mode:** not in v1. Revisit after launch.


---

## 8. Phases in detail

Time estimates assume about 2 hours on weekdays and longer on weekends, alongside college. Treat them as rough.

---

### Phase 0 — Verify the split end to end (1 day)

**Goal:** prove the new FastAPI + Next.js setup works with real Supabase before building more.

**Tasks**
1. Unzip the project, create `backend/.env` and `frontend/.env.local`.
2. Run both migrations (safe to re-run).
3. Start both servers; check `/health`.
4. Sign up with `DIVA2026`; confirm the profile and membership rows exist.
5. Promote yourself to CR with SQL; log out and in.
6. Post, pin, unpin and delete a notice. Check Home updates.
7. Test failure paths: wrong invite code, duplicate email, short password, expired or garbage token, API server stopped.
8. Initialize git; add `.gitignore` for `.env*`, `node_modules`, `.next`, `__pycache__`, `.venv`; push to a **private** GitHub repo.

**Common failures to expect**
- CORS: `ALLOWED_ORIGINS` must contain `http://localhost:3000`.
- Wrong JWT secret: all calls return 401 "Invalid token".
- Using the anon key where the service-role key belongs: "Invalid API key" or RLS errors.
- `NEXT_PUBLIC_API_URL` missing: signup says "Couldn't reach the server".

**Done when:** a brand new account can sign up, the CR can post a notice, a member sees it, and the code is on GitHub.

---

### Phase 1 — Shared UI foundation and notice polish (4–5 days)

**Goal:** every later page reuses the same loading, error, empty and feedback patterns, so nothing is retrofitted.

**1.1 Reusable states**
- `Skeleton` variants: card, row, hero, grid item. Add `loading.tsx` to each route.
- `ErrorState` with a "try again" button and a friendly message. Add `error.tsx` to each route.
- `EmptyState` with an icon, a line of copy and an optional action. Copy differs for CR and member.
- `Toast` provider: success, error, info. Auto-dismiss 4s, stackable, `aria-live="polite"`.
- `ConfirmDialog` for destructive actions (replaces `confirm()`).
- Button `loading` prop: disables and shows "posting…" so double-submit is impossible.

**1.2 Navigation unification**
- Home keeps its cover-page look; every inner page uses `AppShell`.
- Active state on sidebar and bottom nav.
- Back affordance on detail pages.
- Tablet layout for 681–1000px.
- Make sure the bottom nav never covers the composers or footers.

**1.3 Auth gaps**
- `/forgot-password` sends a Supabase reset email; `/reset-password` sets the new password.
- Cross-links between login and signup.
- Inline validation before submit (email format, password length, show a strength hint).
- Warmer invite-code error: "That code didn't work. Ask your CR for the current one."
- Session-expired handling: API 401 leads to `/login?expired=1` with a banner.
- Logout confirms and clears the session.
- Decide on email verification (see open decisions).

**1.4 Notice board polish**
- `GET /notices/{id}` and detail page `/notices/[id]`; the Home hero links to it.
- Edit notice (CR): inline form, `updated_at` shown as "edited".
- Delete uses `ConfirmDialog`.
- Category filter (server-side), with a filtered-empty state different from the all-empty state.
- Hide expired notices; show "expires in 2d" on cards with `expires_at`.
- Long content truncated to about 220 characters with "read more".
- Composer: inline validation, success toast, character counter, optional expiry date.
- Attachment upload for notices (PDF or image, 10 MB) through a signed upload URL.
- Unread dot per notice using `notice_reads`; unread count in the nav.
- Home filter pills actually filter.

**1.5 Accessibility basics**
- Real `<label>` on every input.
- `aria-label` on icon-only buttons and nav items.
- Visible focus ring everywhere.
- Skip-to-content link.
- Check contrast of ink on yellow, cream and blue-light.
- Respect `prefers-reduced-motion`.

**1.6 Tests added**
- Backend: tests for `_membership` and `_require_cr` (non-member gets 403, member on a CR route gets 403).
- Frontend: smoke test that each route renders its skeleton, empty and error states.

**Done when:** every page has loading, error and empty states; every action gives feedback; notices can be edited and viewed in detail.

---

### Phase 2 — Resource Shelf (7–9 days)

**Goal:** a searchable, organized shelf of notes, PYQs and links, with private files.

**2.1 Database migration `003_resources.sql`**
- Tables: `subjects`, `resources`, `resource_saves`, `resource_requests`.
- Seed subjects for the current semester (CR can add more).
- Full-text index and the `kind` check constraints.
- RLS: members of the class can read; writes go through the API.
- Storage bucket `resources`, **private**, with no public policies.

**2.2 Backend router `resources.py`**
- `upload-url`: validate the extension, MIME type and size limit (20 MB). Return a signed upload URL and a storage path like `{class_id}/{user_id}/{uuid}-{safe_filename}`.
- Finalize: confirm the object exists in Storage, then insert the row. Reject paths that don't start with the caller's own prefix.
- Link resources: must be `https://`; reject `javascript:`, `data:` and IP-literal hosts; strip tracking params.
- Download: membership check, then a **60-second** signed URL; increment `download_count`.
- Delete: owner or CR; soft delete the row and remove the object in a background step.
- Duplicate check: same normalized title in the same subject, or same filename and size.
- Search: Postgres full-text on title, description and tags, with a trigram fallback for typos.
- Sort: recent or popular (`save_count + download_count`).
- Cursor pagination.

**2.3 Frontend**
- `/resources`: search bar, subject pills with counts, type filter (PDF, link, doc, image), sort, grid of cards, "load more".
- Card: file-type badge and icon, title, 2-line description, uploader, saves, subject.
- `/resources/new`: dropzone, progress bar, subject and unit pickers, description, tags. Link variant on a second tab. Duplicate warning with "use existing" or "upload anyway".
- `/resources/[id]`: description, uploader, preview for PDFs and images where possible, Download button (fetches a fresh signed URL on click), save toggle, report, delete (owner or CR).
- Save toggle with optimistic update and a small star animation.
- `/resources/requests`: post "I'm looking for…", fulfil with an existing resource, status chip.
- States: no resources at all, none in this subject, no search results, upload failed with retry, expired signed link (re-fetch automatically), file too large, wrong type.

**2.4 Edge cases**
- Upload interrupted: the orphan object is cleaned up by a nightly job that deletes unreferenced files older than 24h.
- Filename with unicode or spaces: sanitize for the storage path, keep the original for display.
- Same file uploaded twice: the duplicate check catches it.
- Uploader deletes their account: resources stay but show "former member" (decision in section 15).
- Copyright: a Report reason and CR takedown.

**2.5 Tests**
- Non-member cannot get a signed URL.
- A user cannot finalize a path outside their own prefix.
- Oversized and disallowed types are rejected.
- Link validation rejects bad schemes.

**Done when:** a student uploads a PDF, a classmate finds it by search, downloads it through a signed link, and saves it.

---

### Phase 3 — Doubt Board (7–9 days)

**Goal:** help each other without noise. Doubts get answered, good answers rise, solved doubts are findable later.

**3.1 Database migration `004_doubts.sql`**
- Tables: `doubts`, `answers`, `answer_votes`, `doubt_follows`.
- Counters (`answer_count`, `helpful_count`, `follow_count`) kept correct by the API inside one transaction, or by triggers. Prefer triggers so counts can't drift.
- Full-text index on doubt title and body.

**3.2 Backend router `doubts.py`**
- Create doubt: title (10–150 chars), body (max 5000), subject required, up to 5 tags.
- Status machine: `open` → `answered` (first answer) → `solved` (asker accepts). Deleting the accepted answer returns it to `answered`.
- Accept: only the asker; only one accepted answer per doubt; the previous one is unaccepted.
- Vote: one per user per answer; no self-vote; toggle with POST and DELETE; counter via trigger.
- Detail returns answers sorted accepted first, then helpful count, then oldest.
- Follow toggle; followers get notifications in Phase 5.
- List filters: subject, status, mine, search; sorted by activity.
- Edit window: the author can edit; show "edited". CR can hide.

**3.3 Frontend**
- `/doubts`: filter pills (all, per subject, open, solved), search, doubt cards with a status badge, answer count and asker.
- `/doubts/new`: subject picker, title, body, tags, a "similar doubts" suggestion while typing the title (debounced search).
- `/doubts/[id]`: question, follow button, answers thread, answer composer, vote button with count, accept button visible only to the asker, report menu.
- Markdown-lite in bodies (bold, code, lists) rendered safely. Never raw HTML.
- Code blocks with a copy button, since this is an AI&DS class.
- Empty states: no doubts, none in this filter, no answers yet ("be the first to help").
- Optimistic vote with rollback on error.

**3.4 Edge cases**
- Double-click on vote or accept: the API is idempotent.
- Asker deletes an accepted answer, the doubt goes back to `answered`.
- Very long code pastes: size limit and a friendly message.
- Stale page: the vote count refreshes after the action.

**3.5 Tests**
- Only the asker can accept.
- Self-vote is rejected; duplicate vote doesn't double count.
- Status transitions are correct.
- A non-member gets 403 on every route.

**Done when:** a doubt is asked, answered by two people, voted on, marked solved, and later found through search.

---

### Phase 4 — Profiles, People, Settings and Privacy (7 days)

**Goal:** each student controls what classmates see.

**4.1 Database migration `005_profiles_privacy.sql`**: new profile columns, `profile_privacy`, avatar bucket (private, signed URLs) or initials-only for v1.

**4.2 Backend**
- `PATCH /me/profile`: validate lengths and tag counts.
- `GET/PATCH /me/privacy`.
- `GET /people` and `GET /people/{id}` apply privacy filters on the server. Hidden fields are omitted, not blanked.
- Contribution stats (resources shared, answers given, accepted answers) shown only if `show_contributions`. No ranking and no leaderboard.
- `GET /me/export`: JSON with the profile, doubts, answers, resources metadata and saved items.
- `DELETE /me`: requires the password; removes the auth user, profile and membership. Content is **anonymized** (shown as "former member") unless the user chooses to delete it too.

**4.3 Frontend**
- `/people`: search by name, skill or interest; skill chips; directory cards.
- `/people/[id]`: profile with only the visible fields; "can help with" chips; recent contributions if visible.
- `/settings/profile`: name, bio, skills, interests, can-help-with, currently learning, avatar.
- `/settings/privacy`: toggles with plain-language explanations and a live preview ("this is what classmates see").
- `/settings/security`: change password, sign out everywhere.
- `/settings/data`: export my data; delete my account with a typed confirmation.
- "What classmates never see" block: email, password, login times, saved items, activity.

**Done when:** a student edits their profile, hides their bio, and a classmate's view of them reflects it immediately.

---

### Phase 5 — Personal area, notifications and search (7 days)

**5.1 Activity** (`/activity`): my doubts, answers, resources; private; filter by type.
**5.2 Saved** (`/saved`): unified across resources, doubts and notices; remove with one tap.
**5.3 Notifications**
- Created by the API on: new notice (all members), answer on my doubt, my answer accepted, mention, resource request fulfilled.
- Bell with an unread count in the topbar; dropdown with the 5 latest; `/notifications` for the full list; mark one or all as read.
- Fan-out for a new notice: insert one row per member in a single batched insert (63 rows is trivial).
- Poll every 60 seconds and refetch on window focus. Realtime can come later.
- Per-type on/off preferences in Settings.
**5.4 Global search**: `⌘K` or `/` opens `SearchOverlay`; results grouped by notices, resources, doubts, people; keyboard navigation; recent searches stored locally.
**5.5 Mentions**: `@name` autocomplete in answer and doubt composers; creates a mention notification.
**5.6 Toasts and modals** from the prototype are finished and reused.

**Done when:** answering a doubt notifies the asker, the bell updates, and search finds items across all sections.

---

### Phase 6 — Moderation, onboarding and launch hardening (7–8 days)

**6.1 Moderation**
- Report menu (•••) on doubts, answers and resources, with reason and details.
- `/mod` queue for the CR: report, target preview, actions (hide, restore, delete, dismiss), with a note.
- Hidden content disappears for members but stays in the database. Everything is logged in `moderation_log`.
- CR member list with remove-member and rotate-invite-code.
- Two CRs can each act, and the log shows who did what.

**6.2 Onboarding**
- First-login `/welcome`: three short cards (what Margins is, privacy promise, how to post), then community guidelines with an "I agree" checkbox.
- Optional "complete your profile" nudge, skippable.
- Role-aware empty states.

**6.3 Hardening**
- Rate limiting on writes, uploads and signup (per user and per IP).
- Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`).
- Input length limits reviewed on every model.
- Error logging with request IDs; no stack traces in responses.
- Nightly job to clean orphan uploads.

**6.4 PWA and devices**
- Manifest, icons, theme color; "add to home screen" prompt.
- Test on a low-end Android phone and on iPhone Safari.
- Offline page: "You're offline. Reconnect to see the latest."

**6.5 Final passes**
- Full accessibility audit (keyboard only, screen reader spot-check, contrast).
- Copy pass for one consistent voice and specific, helpful errors.
- Remove the rotation and shadows from long lists if scroll is janky on weak phones.

**Done when:** the CR can handle a reported item, a new student gets the welcome flow, and the app passes the launch checklist in section 13.

---

### Phase 7 — Deploy and pilot (3–4 days)

1. Create the production Supabase project in the closest region; run all migrations; create the private bucket; turn on daily backups.
2. Deploy the backend (Render, Railway or Fly) with the env vars; set `ALLOWED_ORIGINS` to the real domain only.
3. Deploy the frontend on Vercel with `NEXT_PUBLIC_API_URL` pointing at the backend.
4. Custom domain or a clean `*.vercel.app` URL; HTTPS only.
5. Set a new real invite code (not `DIVA2026`) and make the CR(s) CR.
6. Pilot with 5–8 friendly classmates for a week; collect feedback in a Doubt or a form.
7. Fix the top issues, then open to the whole division.

---

### Phase 8 — Iterate with real use (ongoing)

Weekly rhythm: read feedback on Sunday, fix the top three issues, ship small. See section 14 for ideas.

---

## 9. Security and privacy plan

**Data classes**
| Class | Examples | Rule |
|---|---|---|
| Secret | service-role key, JWT secret, passwords | Backend env only; never logged, never in git |
| Private | email, saved items, activity, login times | Only the owner; never in any other user's response |
| Class-shared | notices, resources, doubts, answers | Active members of the same class only |
| Optional-profile | bio, skills, interests | Shown according to the owner's toggles |
| Public | none | Nothing is public |

**Checklist**
- [ ] Every route resolves class membership; CR routes also check the role.
- [ ] Every query that returns rows filters by `class_id`.
- [ ] Object-level checks: edit or delete only if owner or CR; load the row, then compare `class_id` and owner.
- [ ] Signed URLs are short-lived (60s) and created per click.
- [ ] Storage bucket is private, with no public policies.
- [ ] Upload paths are namespaced by class and user; the finalize step rejects foreign prefixes.
- [ ] File type allowlist and size limits, checked on the server.
- [ ] Link resources are `https://` only.
- [ ] User text is rendered as text or sanitized markdown. No raw HTML.
- [ ] CORS lists only the real frontend origins.
- [ ] Rate limits on signup, login-related routes, writes and uploads.
- [ ] Invite code compared case-insensitively, rotatable, and rotation logged.
- [ ] No emails or internal IDs leak in public-ish responses.
- [ ] Account deletion works and anonymizes content.
- [ ] `.env` files are in `.gitignore`; secrets rotated if ever exposed.
- [ ] Dependencies pinned; run `pip-audit` and `npm audit` before launch.
- [ ] Logs hold no passwords, tokens or file contents.

**Privacy promises shown in the app**
1. Only Div A members can see anything.
2. Teachers and the college have no access and no admin view.
3. We don't track attendance, marks or location.
4. You choose what your profile shows.
5. You can export or delete your data any time.

**Threats and answers**
| Threat | Answer |
|---|---|
| Someone outside the class joins | Invite code, rotation, CR member removal |
| Code leaks to another division | Rotate the code; remove unknown members |
| Member scrapes everything | Rate limits, pagination caps |
| Malicious file | Allowlist, size cap, no inline execution, download only through signed URL |
| XSS through doubts | Sanitized markdown-lite, CSP |
| Stolen token | Short token life, sign out everywhere |
| Missing authz check | Shared helpers, per-router tests, code review checklist |
| Abuse or harassment | Reports, CR hide, member removal, guidelines |

---

## 10. Performance plan

**Targets (mid-range Android, 4G):** first content under 2s, interactions under 200ms, list pages under 100KB of JSON.

**Tactics**
- Deploy backend and database in the same region, near Mumbai.
- Fetch in parallel (`Promise.all`); never chain queries that don't depend on each other.
- Reduce the number of calls per page: Home uses a single `/home` summary endpoint once the data grows.
- Cursor pagination everywhere; no unbounded lists.
- Index every filter and sort column (see section 4).
- Skeletons for perceived speed; `loading.tsx` per route.
- Fonts: `display=swap`, preconnect, only the weights used.
- Images: avatars are small and lazy-loaded; no large hero images.
- CSS: cap the number of rotated and shadowed elements; avoid heavy filters.
- Cache: signed URLs not cached; static assets cached by Vercel; avoid caching private API responses on shared caches.
- Backend: reuse one Supabase client; keep handlers sync-light; consider async client if latency shows up.
- Keep the backend awake (uptime ping) if the host sleeps.
- Measure with Lighthouse (mobile), plus real-device checks. Review after each phase.

---

## 11. Testing plan

**Backend (pytest + FastAPI TestClient, test Supabase project or mocks)**
- Auth: missing, malformed, expired and wrong-audience tokens give 401.
- Membership and role helpers for every router (member, non-member, CR).
- Each endpoint: happy path, validation failure, wrong-owner, wrong-class.
- Business rules: status machine, one vote per user, accept by asker only, duplicate detection, signed URL expiry.
- Privacy filter: hidden fields are absent in `/people/{id}`.

**Frontend**
- `npm run build` and `tsc` before every release.
- Component tests for the states (skeleton, empty, error, toast).
- A few Playwright flows: signup, login, post notice (CR), upload resource, ask and answer a doubt, accept, delete account.
- Accessibility checks with axe on key pages.

**Manual before launch**
- Keyboard-only walkthrough.
- Phone checks: low-end Android, iPhone Safari, slow 3G throttle.
- Two-account test for every permission (member vs CR, owner vs other).
- Copy and tone read-through.

**Rule:** a phase is not done until its tests pass and the build is green.

---

## 12. Deployment, environments and backups

**Environments**
| Env | Frontend | Backend | Supabase |
|---|---|---|---|
| local | `localhost:3000` | `localhost:8000` | dev project |
| production | Vercel | Render, Railway or Fly | prod project |

Keep dev and prod projects **separate**, with different keys and invite codes.

**Config**
- Backend env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`.
- Frontend env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.

**Migrations:** numbered, idempotent SQL files in `supabase/migrations/`. Apply to dev first, then prod. Never edit an applied migration; add a new one.

**CI (GitHub Actions)**
- Backend: install, lint, pytest.
- Frontend: install, lint, `tsc`, `npm run build`.
- Block merges on failure.

**Backups**
- Turn on Supabase daily backups.
- Monthly manual export of the database and the storage bucket.
- Test one restore before launch.

**Monitoring**
- Backend error logs with request IDs.
- Uptime ping on `/health`.
- A weekly glance at Supabase usage against the free-tier limits (storage, bandwidth, database size).

**Cost:** aim for free tiers. The watch items are Supabase storage and bandwidth, and backend host sleeping. Reassess if uploads grow.

---

## 13. Launch plan for the class

**Pre-launch checklist**
- [ ] All Phase 6 items done and the security checklist green.
- [ ] Production invite code set; CR(s) promoted.
- [ ] Community guidelines and the privacy promise read and approved by the CR.
- [ ] Backups on; restore tested.
- [ ] Seed content: current subjects, a few real resources, a welcome notice from the CR.
- [ ] Short walkthrough (a 1-minute screen recording or three screenshots).

**Rollout**
1. **Day 1–7 pilot:** 5–8 classmates plus the CR. Fix the blockers.
2. **Day 8:** the CR announces in the WhatsApp group with the link, the invite code and the one-line reason to join ("all notices and notes in one place").
3. **Week 2:** the CR posts every notice on Margins first, then drops a link in WhatsApp.
4. **Week 3–4:** add one habit at a time, such as "upload your notes here", then "ask doubts here".
5. Keep WhatsApp for chat; Margins is for things you need to find later.

**Adoption levers**
- The CR actually uses it for notices. That is the key factor.
- Pinned exam and deadline notices.
- A shelf that is useful on day one (PYQs).
- Quick wins like a "solved" doubt that helps a few people.

**Success checks at 4 weeks:** see section 1. If signup is under 50%, ask why; usually it is friction or the CR not using it.

---

## 14. Post-launch and v2 ideas

Ordered by value, not commitments.
- Events and deadlines calendar with reminders (Home "upcoming stuff").
- Timetable view.
- Web push notifications.
- AI helper: summarize a notice, find the right resource, suggest similar doubts (scoped carefully for privacy and cost).
- Study groups and project-team finder using skills.
- Resource collections and a "study pack" before exams.
- Weekly digest email.
- Dark mode.
- Support for other divisions or batches (multi-class), with per-class invite codes. The schema already carries `class_id`.
- Admin UI for role changes.
- Realtime updates for notifications and doubts.
- Export a subject's resources as a zip.

---

## 15. Risks, open decisions and timeline

**Risks**
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Missing authz check leaks data | Medium | High | Shared helpers, per-router tests, review checklist |
| Low adoption | Medium | High | CR uses it first, seed content, pilot |
| Burnout or exams interrupt | High | Medium | Small phases, each shippable on its own |
| Free-tier limits hit | Low | Medium | Monitor usage, size limits, cleanup job |
| Backend sleeps and feels slow | Medium | Medium | Uptime ping or a no-sleep host |
| Copyright takedown of notes | Low | Medium | Report flow, CR hides quickly |
| Scope creep | High | Medium | Non-goals list; finish phase before starting the next |
| Sandbox or laptop loss | Medium | High | Git repo on GitHub from Phase 0 |

**Open decisions**
1. Email verification on or off at launch? (Off is simpler and the invite code already gates entry; on prevents typos and fake emails.)
2. Who besides the CR gets moderation rights?
3. Events on Home in v1 or in v2?
4. AI card in v1 or cut? (Recommend cutting it from v1.)
5. When a member deletes their account: anonymize content (recommended) or delete everything?
6. Avatars: initials only in v1, or uploads?
7. Unify `resource_saves` into `saved_items` now or later?

**Timeline (part-time, rough)**
| Phase | Duration | Cumulative |
|---|---|---|
| 0 Verify and push to git | 1 day | Day 1 |
| 1 UI foundation and notice polish | 4–5 days | ~Day 6 |
| 2 Resource Shelf | 7–9 days | ~Day 15 |
| 3 Doubt Board | 7–9 days | ~Day 24 |
| 4 Profiles and Settings | 7 days | ~Day 31 |
| 5 Activity, notifications, search | 7 days | ~Day 38 |
| 6 Moderation, onboarding, hardening | 7–8 days | ~Day 46 |
| 7 Deploy and pilot | 3–4 days | ~Day 50 |

About **7 weeks** to a class-ready launch. Phases 2 and 3 alone give a usable app. If time is tight, you can launch after Phase 3 with a small private pilot, then add the rest.

**Minimum viable launch (fast path):** Phase 0, Phase 1 (states, notice polish), Phase 2, Phase 3, plus the security checklist and a basic profile. Everything else follows after real feedback.

---

## Appendix A — Definition of done (every feature)

- [ ] Migration written and idempotent.
- [ ] API route with validation, membership check and object-level authz.
- [ ] Frontend page with loading, empty, error and success states.
- [ ] Works on mobile, tablet and desktop.
- [ ] Keyboard and screen-reader basics pass.
- [ ] Tests written and passing; `npm run build` green.
- [ ] Copy reviewed for tone and clarity.
- [ ] No secrets or personal data in logs or git.

## Appendix B — Suggested repo layout

```
margins/
  backend/
    app/
      main.py  config.py  db.py  auth.py
      deps.py            # shared _membership, _require_cr
      routers/ auth_routes.py me.py notices.py resources.py doubts.py
               people.py notifications.py search.py mod.py
      services/ storage.py notifications.py moderation.py
    tests/
    requirements.txt  .env.example
  frontend/
    app/ (routes from section 6)
    components/ (shared components from section 6.2)
    lib/ api.ts session.ts supabase/
    supabase/migrations/ 001 … 006
    design-reference/
  docs/ MARGINS_PLAN.md  SETUP.md  SECURITY_CHECKLIST.md
  .github/workflows/ ci.yml
```

## Appendix C — Immediate next actions

1. Run Phase 0 and fix what breaks.
2. Push to a private GitHub repo.
3. Start Phase 1: `Skeleton`, `ErrorState`, `EmptyState`, `Toast`, `ConfirmDialog`.
4. Move to Phase 2 (Resource Shelf) with the migration first.
