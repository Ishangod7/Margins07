# Margins — Complete UI/UX Checklist

Legend: ✅ built · 🟡 stubbed/partial · 🔴 not started

---

## 1. NAVIGATION & SHELL

- 🔴 **Unify nav pattern** — Home uses its own topbar (mockup-style); Notices uses the sidebar/bottom-nav `AppShell`. Pick one system and apply everywhere. Recommendation: keep the topbar+hero style for Home only (it's a "dashboard cover page"), use `AppShell` for every inner page (Notices, Resources, Doubts, People, Settings).
- 🔴 Active-state indicator consistency (sidebar has it, topbar circle-buttons don't)
- 🔴 Notification bell icon + unread dot in topbar/sidebar (currently the circle-btn `♧` is a placeholder, not wired to anything)
- 🔴 Breadcrumb or "back" affordance on detail pages (Notice detail, Resource detail, Doubt detail all need a way back that isn't just the browser back button)
- 🔴 Search bar wired to anything — the `⌕` circle button and mockup search bars are all decorative right now
- 🔴 Mobile: confirm bottom-nav doesn't overlap content on pages with fixed footers/composers (Notice composer's `<details>` toggle could collide with bottom-nav on small screens)
- 🔴 Tablet breakpoint specifically — current CSS jumps from desktop (1000px+) straight to mobile (680px); the 680–1000px range needs its own check, not just "mobile layout stretched"

## 2. AUTH FLOWS

- ✅ Signup (invite code, email, password, display name)
- ✅ Login
- ✅ Password show/hide toggle
- 🔴 **Forgot password** — no UI, no route. Real students *will* forget passwords; this can't stay unbuilt long.
- 🔴 **Email verification screen** — currently bypassed (`email_confirm: true`); before real launch decide if you want verification on, and if so build the "check your email" holding screen + resend button
- 🔴 Invite-code error — currently a plain red text line; spec wants something warmer ("Check with your CR for the current code" rather than a bare error)
- 🔴 Signup form validation feedback *before* submit (password too short, invalid email format) — right now you only find out after hitting the server
- 🔴 "Already have an account? Log in" / "New here? Sign up" cross-links between the two pages — currently dead ends into each other
- 🔴 Session-expired handling — what does a student see if their session dies mid-use? Right now: probably a confusing RLS-denied error, not a clean "please log in again"
- 🔴 Logout button/flow — doesn't exist in the UI anywhere yet

## 3. HOME / DASHBOARD

- ✅ Hero (pinned notice, live)
- ✅ Notice feed preview (live, top 4)
- ✅ Date/weekday (live)
- 🟡 Filter pills — rendered but not functional (clicking "exams" does nothing)
- 🔴 Events sticky note — fully static placeholder, no data model exists yet for events at all
- 🔴 AI card — button says "coming soon," disabled; needs its own scoped decision (build vs. cut for v1)
- 🔴 Personalized greeting edge case: what if `display_name` is empty/null? Currently falls back to "there" — fine, but worth confirming profile creation always sets it
- 🔴 Home loading state — first paint while Supabase queries run has no skeleton, just blank space where hero/feed will appear
- 🔴 Home error state — if the Supabase queries fail (network blip), there's currently no fallback UI, page just renders with empty data silently

## 4. NOTICE BOARD

- ✅ List view, live data
- ✅ CR composer (title/category/content)
- ✅ Pin/unpin, delete
- 🔴 **Edit existing notice** — spec calls for it, currently only delete+repost works
- 🔴 Notice detail page — right now notices only exist as list items, no dedicated `/notices/[id]` page (needed for the Home hero's "read full notice" link to actually go somewhere specific rather than just the list)
- 🔴 Attachment upload — `attachment_path` field exists in schema, zero UI for it
- 🔴 `expires_at` — field exists, nothing hides expired notices from the feed
- 🔴 Composer success feedback — after posting, the `<details>` just closes on page reload; no toast confirming "✓ Notice posted"
- 🔴 Composer validation — empty title/content blocked by `required`, but no inline error styling, just browser default tooltip
- 🔴 Delete confirmation — currently one click deletes immediately, no "are you sure?" step (real risk: a CR fat-fingers delete on an important notice)
- 🔴 Long-content truncation — a very long notice body currently renders in full on the card; needs a "read more" pattern for the list view, saving full text for detail page
- 🔴 Category filter *actually filtering* the list (client-side or server-side)
- 🔴 Empty category state — what a filtered-but-empty result looks like vs. the all-notices-empty state

## 5. RESOURCE SHELF (only a static mockup exists — nothing wired)

- 🔴 Grid view wired to a real `resources` table + Storage bucket
- 🔴 Upload flow: file picker → validation (size/MIME type) → upload progress → success
- 🔴 Upload flow: external link variant (no file, just a URL + validation that it's a safe `https://` link)
- 🔴 Subject/unit tagging UI on upload
- 🔴 Resource detail page (preview if possible, description, uploader, download button using a signed URL)
- 🔴 Download flow itself — signed URL generation, expiry handling, what happens if the link is stale
- 🔴 Search across title/subject/description
- 🔴 Filter by subject/type/recent/popular
- 🔴 Save/bookmark toggle (⭐/☆)
- 🔴 Duplicate-resource detection UI ("similar resource already exists — use existing or upload anyway")
- 🔴 Resource Request board (students post what they're looking for)
- 🔴 Empty states: no resources at all / no resources in this subject / no search results
- 🔴 File type icon system (PDF vs. link vs. doc vs. image — needs a consistent visual language, not just text labels)
- 🔴 Large file handling — what the UI shows while a big PDF uploads (progress bar, not just a spinner)

## 6. DOUBT BOARD (only a static mockup exists — nothing wired)

- 🔴 List view wired to real `doubts` table
- 🔴 Filter by subject / open vs. solved
- 🔴 Ask Doubt form (title, subject picker, body, tags)
- 🔴 Doubt detail page: full question + all answers threaded
- 🔴 Answer composer
- 🔴 Accept-answer interaction (only the asker can do this — needs a visible affordance only they see)
- 🔴 Helpful-vote button (▲ with count) — needs the unique-vote-per-user logic from the spec, not just a naive counter
- 🔴 Status badge logic: open → answered → solved, and what triggers each transition
- 🔴 Follow-doubt toggle
- 🔴 @mention autocomplete in the answer composer
- 🔴 Empty states: no doubts at all / no doubts in this subject / no answers yet on this doubt

## 7. PEOPLE / PROFILES (nothing started)

- 🔴 People directory list + search by skill/interest
- 🔴 Public profile page (display name, bio, skills, contribution stats — respecting each student's visibility toggles)
- 🔴 Profile edit form (bio, skills, interests, can-help-with, currently-learning, avatar)
- 🔴 Avatar upload or initials-fallback rendering
- 🔴 "Uploaded by X" / "Answered by X" links from content back to profiles

## 8. PERSONAL AREA (nothing started)

- 🔴 My Activity page (my doubts, my answers, my resources — private)
- 🔴 Saved items page (unified across resources/doubts/notices)
- 🔴 Notifications page (list) + notification bell dropdown (preview)
- 🔴 Notification types to actually implement: new notice, answer to my doubt, accepted answer, mention, resource request fulfilled

## 9. SETTINGS (currently one "coming soon" stub)

- 🔴 Profile tab (edit display name, bio, skills, etc.)
- 🔴 Privacy tab (the ON/OFF visibility toggles from the original spec — display name always on, everything else optional)
- 🔴 Security tab (change password, active sessions, sign out everywhere)
- 🔴 Data tab (download my data export, delete account — with a real confirmation flow)
- 🔴 "What classmates never see" trust-building copy block (spec section 20) — cheap to add, high trust value

## 10. MODERATION (can genuinely wait, but flagging so it's not forgotten)

- 🔴 Report button (•••  menu) on doubts/answers/resources
- 🔴 Report reason picker
- 🔴 CR moderation queue screen
- 🔴 Hide/remove/restore content actions

## 11. CROSS-CUTTING STATES (needed on every page — currently mostly missing)

- 🔴 **Loading skeletons** — right now every page either flashes blank or shows nothing while Supabase queries resolve
- 🔴 **Error states with retry** — currently raw error text (Notices) or silent failure (Home)
- 🔴 **Unauthorized state** ("you don't have access") — not yet triggered/designed anywhere
- 🔴 **Toast/success feedback** — no confirmation pattern exists yet anywhere in the app after an action succeeds
- 🔴 **Empty states** — partially done (Notices has one), missing everywhere else
- 🔴 **Offline state** — not handled at all
- 🔴 **Uploading/saving/deleting in-progress states** — buttons don't show a loading spinner or get disabled during submission, so double-submit is currently possible (e.g., double-click delete)

## 12. ONBOARDING

- 🔴 First-login welcome screen ("Welcome to Margins — here's what you can do")
- 🔴 Role-aware empty-state copy (CR sees "create your first notice," member sees "browse resources or ask a doubt")
- 🔴 Community guidelines shown at first login (spec section 92 — cheap, sets tone early)
- 🔴 Optional "complete your profile" nudge, skippable

## 13. ACCESSIBILITY (not yet audited)

- 🔴 Keyboard navigation through the whole app (forms, nav, buttons) — untested
- 🔴 Focus-visible states — password toggle has one, nothing else does yet
- 🔴 Color contrast check on the sketchbook palette (the pale yellows/creams against dark ink text should be fine, but hasn't been formally checked against WCAG AA)
- 🔴 `alt` text for any future meaningful images/icons
- 🔴 `aria-label`s beyond the password toggle (nav icons are emoji with no screen-reader label)
- 🔴 Reduced-motion preference respected (hover-lift/rotate animations should degrade gracefully)
- 🔴 Form labels — inputs currently rely on `placeholder` only, which disappears on focus and isn't a substitute for a real `<label>`

## 14. RESPONSIVE / DEVICE

- 🔴 Tablet-specific layout pass (see nav section above)
- 🔴 Test on an actual low-end Android device — the CSS uses lots of `box-shadow`/`transform: rotate()` per card, which can get janky on weaker phones at scroll
- 🔴 PWA "add to home screen" manifest — not set up

## 15. MICRO-INTERACTIONS & POLISH

- 🔴 Hover-lift/press feedback exists on buttons in the mockup CSS but isn't applied consistently across the real wired pages yet
- 🔴 Vote-tap animation (spec section 27) — not relevant until Doubt Board exists, but worth remembering
- 🔴 Save-toggle star animation — same, waits on Resources/Saved

## 16. CONTENT / COPY

- 🔴 Consistent voice pass — some copy is casual ("hey, student!") and some is plain functional ("Couldn't load resources") — worth a single copy pass once more pages exist, per spec section 35's "plain language" rule
- 🔴 Error copy specificity — "Something went wrong" style messages should become specific and actionable per spec section 25

---

## Suggested build order (revised)

1. Nav unification (#1) — fast, fixes the most visible inconsistency
2. Loading/error/toast/empty state *pattern* (#11) — build once as reusable components, apply to every page from here on so you're not retrofitting later
3. Resource Shelf wiring (#5) — your next core feature
4. Doubt Board wiring (#6) — your last core feature
5. Settings: Profile + Privacy tabs (#9) — needed before real students join
6. Auth gaps: forgot password, logout, session-expired (#2) — needed before real launch
7. Onboarding (#12) — cheap, do right before first real launch to your batch
8. Accessibility pass (#13) — do a real audit once the core pages exist, not before
9. People/Profiles, Personal Area, Moderation (#7, #8, #10) — genuinely fine post-launch
