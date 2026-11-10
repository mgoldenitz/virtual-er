# Progress log

A short record so a new session can continue where the last one stopped.

## Phase 1: clickable prototype with in-browser data (finished 2026-11-09, waiting for owner testing)

Done:
- Core loop: staff check in a desk visit, the patient screen shows it, staff press Call back, the patient taps "I'm on my way", staff mark arrived. Works across two tabs.
- Start page: emergency check, care-option links, THP wait-time link, and "Start a visit" from home. The start page also handles open, ended, expired and unreadable saved visits.
- Staff screen:
  - Expected arrivals (6-hour expiry) and code lookup.
  - Check-in with CTAS, checklist and language, plus declined and not eligible.
  - QR slip, the off-site list, Recently closed with Undo, and storage warnings.
- Patient screen: every status, a live region for status changes, seen_at recorded when the called screen is visible, and the expired and unavailable states.
- Dashboard: placeholder page only (built in Phase 4).
- 60 unit tests (`npm test`) at the end of Phase 1.

Reviews:
- Sol: five reviews done. Its review of the flow fixes was skipped (`handoffs/2026-11-09-sol-review-phase1-flow-fixes.md`).
- Grok's simpler-screens pass is done (`handoffs/2026-11-09-grok-simpler-screens-phase1.md`). No code changes; the owner agreed on 2026-11-09:
  1. Fold the care options into a closed section: skipped. SPEC wants them seen before travelling.
  2. Hide patient notes behind "More info": skipped. SPEC says the "place can change" line always shows and the demo must state its alert limits.
  3. Hide the check-in form until needed: skipped. It adds a tap to the most common action; revisit when QR scanning arrives.
  4. One menu for remove actions: already done ("Remove from list" in `components/staff/VisitRow.tsx`).
  5. One card for an open visit: already done (`components/start/StartVisit.tsx`).

Decisions kept on purpose:
- The patient heading "Checked in from home, not yet triaged" (SPEC wording; revisit in the Phase 3 wording pass).
- The staff button label "Check in".

To do in Phase 3 (from Grok's pass):
- Shorten the patient screen's "not yet triaged" text (three paragraphs now) in the wording pass, keeping the SPEC sentence about the line starting at triage.
- Put the "Review: unable to reach" confirmation inside each card's "Remove from list" section.

Notes:
- Another copy of this project, in OneDrive\Desktop\Career\virtual-er, may be running on port 3000. Run this one with `npx next dev -p 3100`.
- `npm audit` shows 7 moderate warnings, all from one old `minimatch` inside `typescript-eslint` (code checker only, not in the app). No fix exists yet: `typescript-eslint` 8.72.2 accepts only `minimatch` 10.x, and the fix is in 11.0.1. Decided on 2026-11-09 to wait instead of forcing the newer version. **At the start of each phase, run `npm update` and then `npm audit` to see if the warnings are gone.**

## Phase 2: Supabase, realtime, staff login, row-level security, Vercel (in progress)

Started 2026-11-09 by the owner. The minimatch check at the start: still not fixed upstream.

Done:
- Supabase project `virtual-er` in ca-central-1. `.mcp.json` is locked to it with only the docs, database, debugging and development tools.
- The database setup ran on 2026-11-10 (`supabase/migrations/`): the `visits`, `site_settings` and `change_signal` tables with row-level security, plus the patient functions (`get_patient_visit`, `record_seen`, `confirm_on_my_way`) and `start_home_visit` (server only).
- Reviewed before it ran: Gemini 3.1 Pro (instead of Argon) and Grok. Sol and Kimi were skipped. The handoff is `handoffs/2026-11-10-sol-review-phase2-database-design.md`; the responses are in `handoffs/2026-11-10-phase2-database-review-responses.md`.
- `supabase/checks/permissions.sql` matched its expected list, no table is missing row-level security, and the security advisor showed only the expected warnings. A test as `anon` was refused on `visits`. **Run the check and the advisor after every database change.**

Decided:
- The database checking allowed steps (for example, "Call back only while waiting") waits until Phase 3, when the remaining steps are added. Raise it in GPT-6 Astra's review.
- Staff can read tokens because "Show QR again" needs them. Raise it in Astra's review.

- The Supabase library is installed (`@supabase/supabase-js` 2.119.0, `@supabase/ssr` 0.12.7). The keys are in `.env.local` (not in git); `.env.example` lists the names.
- One staff account exists (created by the owner, marked `role: staff` on 2026-11-10). Public sign-up and anonymous sign-ins are off.
- Staff login screen (`/login`): `/staff` and `/dashboard` need a signed-in staff account (`proxy.ts`). The owner signed in and out successfully on 2026-11-10.
- New look (2026-11-10): patient screens use the "clean" style (white boxes on light grey); staff screens use the "glass" style (frosted panels, Plus Jakarta Sans). Colours are tokens in `app/globals.css`. Input and select borders were darkened to pass the WCAG 3:1 rule. The review was skipped.
- Accessibility check (2026-11-10): axe-core (WCAG 2.2 AA rules) on every screen at phone and laptop size, including `/staff` and `/dashboard` signed in: no failures. Text axe could not judge on the glass panels was measured from the screen pixels; the lowest was 8.2:1. Run it again after any change to colours or layout.
- Model handoffs changed (2026-11-10): GPT-6.1 Sol and Gemini 4 Argon are not available. Gemini 3.1 Pro (High) does their reviews; Kimi K3.1 Pro runs at Thinking Max (CLAUDE.md and `ai_model_workflow_virtual_er.md`).
- Fixed: a hydration warning on `<body>` caused by the Grammarly browser extension (`app/layout.tsx`).

- Visits moved from the browser to Supabase (2026-11-10, steps A to D of `handoffs/2026-11-10-gemini-review-supabase-storage-plan.md`; Gemini's answers on the plan are in `...-plan-response.md`):
  - Database change `20261110090134_visit_version_and_database_times.sql`: a `version` number on each visit that goes up on every change, and the database sets every time itself.
  - Patient screen (`data/patientVisit.ts`): reads its visit through `get_patient_visit`; "seen" and "I'm on my way" go to `record_seen` and `confirm_on_my_way`. Rules: `lib/patientViewFromRow.ts`, `lib/failedRead.ts` (one failed read keeps the last view and retries after 5 seconds; two in a row show "We cannot load your visit right now").
  - Starting from home: the phone sends only site and language (`lib/startVisitRequest.ts`) to the server route `app/api/start-visit/route.ts`, which uses the secret key (`data/supabaseServer.ts`, server only) to call `start_home_visit`.
  - Staff screens: `data/visitCache.ts` holds the list in memory (everyone still in the line plus anything made or closed in the last 24 hours). `data/staffActions.ts` saves only the changed fields (`lib/changedFields.ts`), and only if the visit's `version` still matches; otherwise the screen says "The list just changed". Buttons show "Saving…" and ignore a second press. A red banner with "Try again" shows when the list could not be read.
  - Until live updates exist, both screens re-read every 15 seconds, when the tab comes back, and when the connection returns (`data/keepFresh.ts`, one timer per list, one read at a time). So a call-back can take up to 15 seconds to show on the phone.
  - The old browser storage is deleted (`visitStore`, `parseVisits`, `useStorageProblem`, `StorageWarning`, `patientViewFor`). The only thing still saved in the browser is the phone's own token (`data/savedToken.ts`). `startFromHome`, `markSeen` and `confirmOnMyWay` in `lib/visitActions.ts` stay as test helpers; in the app the database functions do those steps.
  - Reviews: the step A review was skipped by the owner. Steps A to C were reviewed by Gemini 3.6 Flash (High), because the owner had no Gemini 3.1 Pro credits left: `handoffs/2026-11-10-gemini-review-steps-a-to-c-supabase-storage-response.md` (fixed: one timer per list, no empty saves, line order in `lib/queue.ts` compares the moments first, patient re-read 15 seconds instead of 30).
  - Checked in the browser (phone 390 x 844 and laptop): the whole loop through the database, run again after the last changes (start from home, find by code, check in, call back, seen, "I'm on my way", mark arrived, Undo); a new desk visit with its slip; two staff tabs pressing "Call back" on one patient (the second was refused); a blocked database on both screens (they recover by themselves); axe-core on the new staff states and the start page: no failures. 72 unit tests, type check and lint pass.
  - Fixed after the last full run: a tap on "I'm on my way" before the automatic "seen" call landed left `seen_at` empty. The tap now records "seen" first (`app/patient/page.tsx`).

- Live updates (2026-11-10): `data/changeSignal.ts` listens to the `change_signal` row over Supabase Realtime (one connection per tab; nothing about a visit travels over it). `data/keepFresh.ts` reads again on every signal, and once more if a signal came in during a read. The 15-second timer stays as a fallback. Checked with two phone sessions: phone A re-read its visit 0.5 seconds after phone B started a visit. The owner checked the staff screen on 2026-11-10 (start from home, check in, call back, arrived): each step showed on the other screen within about 2 seconds. Still to check: phone and laptop over the vercel.app link. The Gemini review (`handoffs/2026-11-10-gemini-review-live-updates.md`) was skipped by the owner. The test visits were deleted; the `visits` table is empty.

- Production build checked (2026-11-10, after the owner made a new secret key): it builds, and the secret key is in none of the browser files (by value or by name). Starting from home works with the new key.
- Per-device limit, decided by the owner on 2026-11-10: a Vercel firewall rule on `/api/start-visit`, 20 starts per 10 minutes per connection (so a class on one Wi-Fi can all start visits). The database's 10 starts per site per minute stays as the main brake. Nothing about the device is stored. A 429 answer from either one shows the start page's "busy" message (`data/patientVisit.ts`).

- Vercel (2026-11-10): the owner imported the repo. The live project is `virtual-er-izpf` (prj_9I2BWSDoNacI6gjVldBYA8CaAmo4); the public address is https://virtual-er-izpf.vercel.app. An empty, never-deployed project `virtual-er` also exists; the owner decides whether to delete it. Vercel Authentication stays ON: it guards only the per-deployment and `-michael-e6bb` addresses, and the short public address opens for anyone. Functions already run in Montreal (yul1). Vercel's own agent made two branches on GitHub (`vercel/install-and-configure-vercel-w-zl11b9` Web Analytics, `vercel/vercel-speed-insights-qarya0` Speed Insights); not merged, waiting on the owner. The start route writes failure reasons to Vercel's runtime logs (no token or key). Found: Vercel's `SUPABASE_SECRET_KEY` was refused by Supabase ("Invalid API key"); the owner re-enters it and redeploys. Still to do: the firewall rule (20 starts per 10 minutes, shown to the owner first) and the phone and laptop test.
- THP links now go to https://www.thp.ca/emergency/A/visit.html (owner, 2026-11-10; SPEC updated).

## Where to pick up (written 2026-11-10)

State: everything above is saved in Git (last save point: "Patient screen: record 'seen' before 'I'm on my way'", plus this log). The `visits` table is empty; every test visit was deleted.

Waiting on the owner:
- Nothing right now. The Gemini review of the review fixes and step D (`handoffs/2026-11-10-gemini-review-storage-fixes-and-step-d.md`) was skipped by the owner on 2026-11-10.

Not checked yet:
- The start route's "paused" and "busy" answers (they need database changes, so they need the owner's approval).
- A production build (`npm run build`), which also proves the secret key never reaches the browser bundle. Do it before the Vercel step.

Carry into later steps:
- While off-site waiting is paused, the start page still shows "Start a visit" and gives the pause message after the tap. Hiding the button first needs a patient-safe way to read the pause; do it with the pause switch in Phase 3.
- Phase 3, database: have `confirm_on_my_way` fill `seen_at` itself when it is empty, and move the allowed-step checks into the database (already decided above).
- The single `change_signal` row is fine at demo size; Supabase Realtime Broadcast could replace it in the live-updates step (from Gemini's answer on the plan).

Working notes for a new session:
- The owner usually has this project's dev server running on port 3000. A second `next dev` in the same folder refuses to start, so use the one on 3000.
- Browser tests that make visits go through the app itself. Removing them afterwards is a `delete from public.visits where code in (...)` through the Supabase MCP: show the SQL, wait for "approved", and the owner must confirm Supabase's own prompt within 2 minutes or it expires and has to be sent again.
- In Playwright, wait for the staff list to load before choosing the site, and use `main:visible` (Next.js keeps the previous page hidden in the document).
- Long shell commands with quotes inside a heredoc fail in this setup; write a script file in the scratchpad folder and run that.

Next steps:
1. Done: live updates (see above).
2. Deploy to Vercel, with a per-device limit on starting from home (the start route stays local until then).
3. Playwright laptop and phone test (about 2 seconds). Then Gemini 3.1 Pro (High) reviews security and architecture, and GPT-6 Astra (High) does the security review. Run /security-review at the end of the phase.
