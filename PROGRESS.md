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
- Sol: five reviews done. Its review of the flow fixes was skipped (`handoffs/archive/2026-11-09-sol-review-phase1-flow-fixes.md`).
- Grok's simpler-screens pass is done (`handoffs/archive/2026-11-09-grok-simpler-screens-phase1.md`). No code changes; the owner agreed on 2026-11-09:
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
- Reviewed before it ran: Gemini 3.1 Pro (instead of Argon) and Grok. Sol and Kimi were skipped. The handoff is `handoffs/archive/2026-11-10-sol-review-phase2-database-design.md`; the responses are in `handoffs/archive/2026-11-10-phase2-database-review-responses.md`.
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

- Visits moved from the browser to Supabase (2026-11-10, steps A to D of `handoffs/archive/2026-11-10-gemini-review-supabase-storage-plan.md`; Gemini's answers on the plan are in `...-plan-response.md`):
  - Database change `20261110090134_visit_version_and_database_times.sql`: a `version` number on each visit that goes up on every change, and the database sets every time itself.
  - Patient screen (`data/patientVisit.ts`): reads its visit through `get_patient_visit`; "seen" and "I'm on my way" go to `record_seen` and `confirm_on_my_way`. Rules: `lib/patientViewFromRow.ts`, `lib/failedRead.ts` (one failed read keeps the last view and retries after 5 seconds; two in a row show "We cannot load your visit right now").
  - Starting from home: the phone sends only site and language (`lib/startVisitRequest.ts`) to the server route `app/api/start-visit/route.ts`, which uses the secret key (`data/supabaseServer.ts`, server only) to call `start_home_visit`.
  - Staff screens: `data/visitCache.ts` holds the list in memory (everyone still in the line plus anything made or closed in the last 24 hours). `data/staffActions.ts` saves only the changed fields (`lib/changedFields.ts`), and only if the visit's `version` still matches; otherwise the screen says "The list just changed". Buttons show "Saving…" and ignore a second press. A red banner with "Try again" shows when the list could not be read.
  - Until live updates exist, both screens re-read every 15 seconds, when the tab comes back, and when the connection returns (`data/keepFresh.ts`, one timer per list, one read at a time). So a call-back can take up to 15 seconds to show on the phone.
  - The old browser storage is deleted (`visitStore`, `parseVisits`, `useStorageProblem`, `StorageWarning`, `patientViewFor`). The only thing still saved in the browser is the phone's own token (`data/savedToken.ts`). `startFromHome`, `markSeen` and `confirmOnMyWay` in `lib/visitActions.ts` stay as test helpers; in the app the database functions do those steps.
  - Reviews: the step A review was skipped by the owner. Steps A to C were reviewed by Gemini 3.6 Flash (High), because the owner had no Gemini 3.1 Pro credits left: `handoffs/archive/2026-11-10-gemini-review-steps-a-to-c-supabase-storage-response.md` (fixed: one timer per list, no empty saves, line order in `lib/queue.ts` compares the moments first, patient re-read 15 seconds instead of 30).
  - Checked in the browser (phone 390 x 844 and laptop): the whole loop through the database, run again after the last changes (start from home, find by code, check in, call back, seen, "I'm on my way", mark arrived, Undo); a new desk visit with its slip; two staff tabs pressing "Call back" on one patient (the second was refused); a blocked database on both screens (they recover by themselves); axe-core on the new staff states and the start page: no failures. 72 unit tests, type check and lint pass.
  - Fixed after the last full run: a tap on "I'm on my way" before the automatic "seen" call landed left `seen_at` empty. The tap now records "seen" first (`app/patient/page.tsx`).

- Live updates (2026-11-10): `data/changeSignal.ts` listens to the `change_signal` row over Supabase Realtime (one connection per tab; nothing about a visit travels over it). `data/keepFresh.ts` reads again on every signal, and once more if a signal came in during a read. The 15-second timer stays as a fallback. Checked with two phone sessions: phone A re-read its visit 0.5 seconds after phone B started a visit. The owner checked the staff screen on 2026-11-10 (start from home, check in, call back, arrived): each step showed on the other screen within about 2 seconds. Phone and laptop over the live link were checked later (see "Phase 2 goal met"). The Gemini review (`handoffs/archive/2026-11-10-gemini-review-live-updates.md`) was skipped by the owner. The test visits were deleted; the `visits` table is empty.

- Production build checked (2026-11-10, after the owner made a new secret key): it builds, and the secret key is in none of the browser files (by value or by name). Starting from home works with the new key.
- Per-device limit, decided by the owner on 2026-11-10: a Vercel firewall rule on `/api/start-visit`, 20 starts per 10 minutes per connection (so a class on one Wi-Fi can all start visits). The database's 10 starts per site per minute stays as the main brake. Nothing about the device is stored. A 429 answer from either one shows the start page's "busy" message (`data/patientVisit.ts`).

- Vercel (2026-11-10): the project is `virtual-er-izpf` (prj_9I2BWSDoNacI6gjVldBYA8CaAmo4). **Live link: https://virtual-er-izpf.vercel.app** (share only this one). The owner is deleting the empty `virtual-er` project. Vercel Authentication stays ON: it guards only the per-deployment and `-michael-e6bb` addresses; the live link opens for anyone. The start route writes failure reasons to Vercel's runtime logs (no token or key); Hobby keeps them for 1 hour. Vercel's own agent opened pull requests #1 (Web Analytics) and #2 (Speed Insights); the owner had them closed without merging and their branches deleted on 2026-11-10. Analytics on patient screens waits for the privacy review.
- Vercel settings (2026-11-10):
  - Environment variables: all three set. The owner re-entered `SUPABASE_SECRET_KEY` and redeployed; the live start route now answers "saved".
  - Function region: Montreal (yul1), set by the owner; the deploy confirms `regions: yul1`. (Montreal over Cleveland because the database is in Montreal.)
  - Firewall rule for `/api/start-visit`: approved by the owner (POST, 20 per 10 minutes per IP, fixed window, answer 429). The Vercel MCP may not change firewall settings (403) and the Vercel CLI is not installed, so the owner added it in the dashboard on 2026-11-10. Read back: active, path equals `/api/start-visit`, 20 per 600 seconds per IP, fixed window, answers 429 (no method condition; harmless, the route only accepts POST). A normal request still reaches the route. The limit itself was not triggered on purpose (that would make 20 test visits).
- THP links now go to https://www.thp.ca/emergency/A/visit.html (owner, 2026-11-10; SPEC updated).

- **Phase 2 goal met (2026-11-10):** the owner ran the loop on https://virtual-er-izpf.vercel.app with the laptop signed in as staff and the phone as the patient (two visits, sites A and B: start from home, check in, call back, "I'm on my way", removed). Each step showed on the other screen within about 2 seconds. Test visits deleted; the `visits` table is empty. Playwright could not run the staff half (it cannot sign in without the owner's password), so the owner's own run counts as the phone and laptop test.

- /security-review (2026-11-10), run over all Phase 2 changes (`git diff 01a3e40..HEAD`), not only the last save point: no high-confidence findings. Checked grants and row-level security, `is_staff()` (reads `app_metadata`), the security definer functions, filter building, the start route, the sign-in check (`getClaims`), the secret key and token handling, and XSS. Only the already-accepted items came close (staff can read tokens; staff status changes are checked in the database only from Phase 3).
- Phase 2 handoffs:
  - Gemini 3.1 Pro (High) security and architecture review: done (`handoffs/archive/2026-11-10-gemini-review-phase2-security-architecture.md`, answer and checks in `...-response.md`). No access-control problems. Done from it: security headers on every page (`next.config.ts`: frame-ancestors 'none', X-Frame-Options DENY, nosniff, Referrer-Policy), checked locally and live. Kept as accepted trade-offs: the signal's time is public; the average gap is rounded to minutes; the one-row signal (Broadcast later).
  - GPT-6 Astra (High) security review: **skipped by the owner (2026-11-10).** File: `handoffs/archive/2026-11-10-astra-security-review-phase2.md`. Gemini's review of the same file (below) stands in for it.
  - Closing checks (2026-11-10, evening): 80 unit tests, type check and lint pass. `supabase/checks/permissions.sql` matches the expected list exactly; no table is missing row-level security. Security advisor: only the expected warnings (anon and signed-in users can run the three token functions and `rls_auto_enable`), plus one not seen before: "Leaked password protection is disabled" (Supabase Auth can refuse passwords that appear in known leaks; it is a setting under Authentication in the Supabase dashboard and may need a paid plan). Only the owner's staff account uses passwords; the owner's choice, not blocking.
  - Supabase MCP switched to read-only in `.mcp.json` (`read_only=true`) at the closing save point, as approved. It takes effect when Claude Code restarts.
  - Extra (2026-11-10): the owner gave the Astra file to Gemini 3.1 Pro (High). Nothing to change in any of the five areas; every claim checked against the code (`handoffs/archive/2026-11-10-gemini-review-astra-security-handoff-phase2-response.md`). It does not cover the keep-alive job. This does not count as the Astra review.

- Desk slip (2026-11-10, owner's request): the QR code and written link always use https://virtual-er-izpf.vercel.app (`lib/slipOrigin.ts`, with tests), whatever address the staff screen is open on; on localhost they keep the local address for testing. Live and in Montreal. Not yet seen on a real slip (needs the owner signed in).

## Where to pick up (updated 2026-11-10, night: Phase 2 closed, the owner restarts Claude Code)

Links (share only these two):
- **Live app: https://virtual-er-izpf.vercel.app**. Vercel project `virtual-er-izpf` (prj_9I2BWSDoNacI6gjVldBYA8CaAmo4), production branch `main`, functions in Montreal (yul1). Every push to `main` deploys here.
- **Phase 1 backup: https://virtual-er-phase1.vercel.app**. Vercel project `virtual-er-phase1` (prj_5FXPPlqjefU1BQpKafmHFOw3wPg4), production branch `phase1-backup`. It now builds only its production branch, so pushes to `main` make nothing there. Never merge `phase1-backup` and `main` into each other.

State:
- **Phase 2 is closed** (closing save point `803fb2b`, 2026-11-10). Its goal is met: laptop (staff) and phone (patient) update each other within about 2 seconds on the live link.
- Every Phase 2 handoff is done or skipped: Gemini's security and architecture review (done), GPT-6 Astra (skipped by the owner; Gemini reviewed the same file instead, nothing to change).
- Closing checks passed: 80 unit tests, type check, lint, `supabase/checks/permissions.sql` (exact match), security advisor (only expected warnings, plus leaked password protection, see below).
- **The Supabase MCP is now read-only** (`.mcp.json`, `read_only=true`, SPEC rule). It can read tables and logs but cannot change the database. Phase 3 database changes therefore go as migration files in `supabase/migrations/`; Claude shows the SQL, and the owner runs it in the Supabase dashboard's SQL Editor (or a later agreed route). Never switch read-only off without the owner asking.
- The last save points (`c6f7d41` to the one with this note) are on this laptop only, **not pushed to GitHub yet**. They change notes and `.mcp.json`, not the app. Ask the owner before pushing (a push to `main` redeploys the live link).
- The untracked `.codex/` folder is the owner's; leave it.
- The `visits` table is empty; every test visit was deleted.

Waiting on the owner (none of these block Phase 3):
1. After 12:00 UTC on 2026-11-11: confirm in Vercel (virtual-er-izpf > Settings > Cron Jobs) that `/api/keep-alive` is listed with `0 12 * * *` and shows its first run. The MCP cannot list cron jobs.
2. Optional: turn on leaked password protection (Supabase dashboard > Authentication, password settings). It refuses passwords found in known leaks. Only the owner's staff sign-in uses a password. It may need a paid plan (not checked).

Start of Phase 3 (next steps, in order):
1. Save point, then `npm update`, then `npm audit` (the minimatch warnings, see Phase 1 notes). Run tests, type check and lint after.
2. Model handoff: GPT-6.1 Terra (Medium) writes the patient-facing wording and the survey question. Later in the phase: DeepSeek V4.1-Flash (Low) drafts translations; a fluent human reviewer approves them, safety messages first (remind the owner to find one); Kimi K3.1 Pro (Thinking Max) reviews equity and accessibility (Gemini 3.1 Pro, High, if Kimi is not working); Gemini 3.1 Pro (High) reviews workflow and screen consistency.
3. Phase 3 database work already decided: `confirm_on_my_way` fills `seen_at` itself when empty; the allowed-step checks move into the database; the pause switch (see "Carry into later steps").

Phase 2 items (both done 2026-11-10):
1. **Keep-alive job: built and live.** `vercel.json` runs `/api/keep-alive` daily at 12:00 UTC (Hobby: any time in that hour). The route (`app/api/keep-alive/route.ts`) accepts only Vercel's call carrying `CRON_SECRET` (`lib/cronAuth.ts`, with tests) and reads the change signal's time with the publishable key (`data/keepAliveRead.ts`); no visit data. `CRON_SECRET` is in `.env.local` and in Vercel (Production). Checked live: refused without the secret (401), "ok" with it (200). Supabase pauses Free projects after 7 days of low activity; its Terms, Acceptable Use Policy and pausing docs do not forbid this (the pausing docs suggest "making API calls to your project"). Caveat: the last third of the Terms was read as a summary, not word for word.
2. **Phase 1 backup link: live.** The branch is `f51eaac` (end of Phase 1, all data in the browser, no Supabase) plus one save point `9b789d0` (THP link fix, approved by the owner). Checked: start, patient, staff and dashboard pages load; `/login` and `/api/keep-alive` give 404; footer, 911 line and the www.thp.ca link are there. The empty `virtual-er` project is deleted.

Not checked yet:
- The start route's "paused" and "busy" answers on purpose (they need database changes or 20 test visits, so they need the owner's approval).
- A real desk slip on the live site showing the live link (needs the owner signed in).

Carry into later steps:
- While off-site waiting is paused, the start page still shows "Start a visit" and gives the pause message after the tap. Hiding the button first needs a patient-safe way to read the pause; do it with the pause switch in Phase 3.
- Phase 3, database: have `confirm_on_my_way` fill `seen_at` itself when it is empty, and move the allowed-step checks into the database (already decided above).
- The single `change_signal` row is fine at demo size; Supabase Realtime Broadcast could replace it later (Gemini, twice).
- Analytics (Vercel Web Analytics, Speed Insights) only after a privacy review; pull requests #1 and #2 were closed for that reason.

Working notes for a new session:
- The owner usually has this project's dev server running on port 3000. A second `next dev` in the same folder refuses to start, so use the one on 3000.
- Vercel: team `team_YrtMKwQ7fPtnSdNJHMrFEJlI`, project `prj_9I2BWSDoNacI6gjVldBYA8CaAmo4`. The Vercel MCP can read projects, deployments, logs and the firewall, but may not change firewall settings (403); the Vercel CLI is not installed. If the MCP says "not authorized" for the team, call `authorize_team_access` and give the owner the link. Runtime logs on Hobby go back only 1 hour.
- Test visits made through the app must be deleted afterwards with `delete from public.visits where code in (...)` through the Supabase MCP: show the SQL, wait for "approved", and the owner must confirm Supabase's own prompt within 2 minutes or it expires and has to be sent again.
- Playwright cannot sign in as staff (it needs the owner's password), so the staff half of any check is done by the owner. In Playwright, wait for the staff list to load before choosing the site, and use `main:visible` (Next.js keeps the previous page hidden in the document).
- The Vercel MCP cannot set a project's production branch, cannot list cron jobs, and its create-project tool may reuse a project already linked to the same repository; leave those steps to the owner in the dashboard. Environment variable changes on Vercel need a redeploy; push after the owner adds one, so no separate redeploy is needed.
- Secrets live only in `.env.local` (git ignores it) and in Vercel's settings: the Supabase URL, publishable key, secret key, and `CRON_SECRET`. Never print them; test with them by reading the file inside a command.
- Long shell commands with quotes inside a heredoc fail in this setup; write a script file in the scratchpad folder and run that.

## Phase 3: safety and equity (in progress)

Started 2026-11-10 (evening).
- Step 1 done: `npm update` then `npm audit`: the same 7 moderate minimatch warnings (code checker only; still not fixed upstream). 80 tests, type check and lint pass. Save point `bf69bf6`.
- The owner does not use GPT-6.1 Terra: its steps (wording, README, presentation) go to Gemini 3.1 Pro, High, or Gemini 3.6 Flash, High, when there are no 3.1 Pro credits (CLAUDE.md and `ai_model_workflow_virtual_er.md` updated).
- Step 2 done: Gemini wrote the wording (`handoffs/archive/2026-11-10-gemini-patient-wording-phase3.md`; answer and Claude's corrections in `...-response.md`). The owner approved it with the corrections, chose the heading "Started from home, not yet triaged" (SPEC updated), and asked for a "You are offline" banner (not built yet).
- All patient text now lives in one file: `lib/text/en.ts` (English), picked by `textFor(language)` in `lib/text/index.ts` (falls back to English). Tests in `lib/text/text.test.ts` check SPEC's fixed sentences word for word. The start page, patient screen, screen-reader announcements, 911 line, footer and the slip's link line read from it. "Unable to reach" and "removed" now have separate messages. The file also holds the text for features not built yet (still here, second alert, return now, sound, text size, language switch, survey, offline), so it can be translated in one batch. 85 tests, type check and lint pass; start page and "no visit" screen checked at phone size (no test visit made: the database link is read-only and the Supabase MCP did not connect this session).
- Still English only: the footer (it sits outside the visit, so it waits for the language switch) and the staff-side words on the slip.
- Gemini reviewed the text file (`handoffs/archive/2026-11-10-gemini-review-patient-text-file.md`, answer and check at the bottom). Fixed: the slip's "Visit code" label comes from the text file; the two sentences with numbers are now plain text with {braces} filled by `fill()` in `lib/text/index.ts`, so `en.ts` holds no code. To do with the language switch: the patient screen shows English (including the 911 line) until the visit loads, because the language comes from the visit; the phone should remember the chosen language.
- Handoffs: finished ones are in `handoffs/archive/`; one file per review, with the answer added at the bottom (CLAUDE.md rule, 2026-11-10).
- Gemini only from 2026-11-10 (owner): every handoff and review goes to Gemini 3.1 Pro, High (3.6 Flash, High, for the synthetic visits and when there are no Pro credits; 3.1 Pro, Medium, to challenge assumptions). Each review in a new chat. CLAUDE.md and `ai_model_workflow_virtual_er.md` updated.
- Languages (owner, 2026-11-10): English, French (`fr`, Canadian), Urdu (`ur`), Arabic (`ar`, Modern Standard) and Mandarin (`zh`, Simplified Chinese). SPEC updated. Urdu and Arabic are right-to-left: the screens must flip (`dir="rtl"`) and be checked in Playwright. Each language needs a fluent human reviewer (remind the owner).
- Waiting on the owner: the translation handoff `handoffs/2026-11-10-gemini-translations-phase3.md` (Gemini 3.1 Pro, High, new chat). The answer goes at the bottom of that file.
