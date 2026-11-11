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

## Where to pick up (updated 2026-11-11: Phase 3 in progress, the owner clears the chat before the no-response steps)

Links (share only these two):
- **Live app: https://virtual-er-izpf.vercel.app**. Vercel project `virtual-er-izpf` (prj_9I2BWSDoNacI6gjVldBYA8CaAmo4), production branch `main`, functions in Montreal (yul1). Every push to `main` deploys here. Last push: `0a6d46d` plus this note's save point.
- **Phase 1 backup: https://virtual-er-phase1.vercel.app**. Vercel project `virtual-er-phase1` (prj_5FXPPlqjefU1BQpKafmHFOw3wPg4), production branch `phase1-backup`. Pushes to `main` make nothing there. Never merge `phase1-backup` and `main` into each other.

State on 2026-11-11:
- **Phase 2 is closed** (`803fb2b`). **Phase 3 is in progress**; details in the Phase 3 section below.
- Phase 3 done so far: package update; patient wording (Gemini) with the owner's corrections; all patient text in `lib/text/` (one file per language); five languages (English, French, Urdu, Arabic, Mandarin) with draft notices and a language switch (phone remembers the choice, desk QR link carries the language, Urdu and Arabic right to left); "I'm still here" (database change run, tested, reviewed). Every one of these is pushed and live.
- 119 unit tests, type check and lint pass. axe-core (WCAG 2.2 AA rules): no failures on the start page in all five languages and the patient screen in Urdu and Arabic.
- The `visits` table is empty (test visits deleted by the owner on 2026-11-11).
- No review is open: `handoffs/` holds only `archive/`.
- The untracked `.codex/` folder is the owner's; leave it.

**Next: the no-response steps after a call-back** (SPEC, /staff section). What is already in place, and the plan:
- Fields already in the `visits` table: `called_at`, `seen_at`, `confirmed_at`, `phone_attempts`, `last_phone_result` (answered or no_answer), `followup_paused_until`, `review_flagged_at`. The patient's phone already reads `calledAt` (`get_patient_visit`), so the patient-side steps may need no database change. Check whether the staff-side steps do (for example a database check on which steps are allowed).
- Steps (all times are settings in `lib/demoTimes.ts`, placeholders a clinical lead would set; shorten them for testing):
  - 0 minutes: the called screen alerts (already built; sound and vibration not built yet).
  - 10 minutes without "I'm on my way": second alert on the patient screen (text ready: `secondAlert`, announcement `announce.secondAlert`); staff flag "Phone this patient" (SPEC wording, kept on purpose: "Call" clashes with "Call back", "Text" needs phone numbers the demo does not store). Staff record each simulated call: "Phoned, answered" or "Phoned, no answer". "Answered" saves `last_phone_result`, clears the phone flag and pauses the steps until `followup_paused_until` (setting, default 10 minutes); afterwards the steps continue from the time since `called_at`, they do not restart. An answered visit that still does not arrive is flagged "Contacted, not yet arrived", never "Review: unable to reach".
  - 20 minutes: staff flag "Phone a second time"; the patient screen shows `returnNow.lead` + `returnNow.text` ("Please return now. Staff will review your visit if you do not respond.", SPEC sentence).
  - 30 minutes with no answered call: "Review: unable to reach"; the visit stays in the line until a nurse confirms. On confirmation: status unable_to_reach, closed_at set, leaves the active line. Not recorded as left without being seen.
  - Reopen an unable_to_reach visit: clears closed_at, status needs_reassessment (back to triage).
  - Also "Confirmed but not arrived": a set time after `confirmed_at` (setting, default 30 minutes) flag "On the way, not arrived"; never remove automatically.
- Put the rule in `lib/` as small functions with tests (like `lib/stillHere.ts`), staff flags in `components/staff/VisitRow.tsx` (split the file before it passes 300 lines), patient messages in the called screen (`components/patient/PatientStatus.tsx`).
- After it works and passes its tests: save point, then a Gemini 3.1 Pro (High) review handoff in a new chat (CLAUDE.md).

Rest of Phase 3 after that (SPEC Phase 3 list):
- "Call everyone back" with a confirmation step.
- "Pause off-site waiting" per site with confirmation (and a second confirmation to turn it off); the start route already refuses while paused. Needs a patient-safe way to read the pause so the start page can hide "Start a visit" (text ready: `pausedHeading`, `start.paused`).
- Offline banner (owner asked; text `offline`), text size control (text `textSize`), sound and vibration on the called screen (text `sound`; must say it only works while the page is open and the phone unlocked).
- 24-hour deletion with the `daily_stats` table (SPEC hard rule 4).
- Database decisions already made: `confirm_on_my_way` fills `seen_at` itself when empty; move the allowed-step checks into the database.
- Closing Phase 3: WCAG 2.2 AA check (axe-core at phone and laptop size, 200% text), /security-review over all Phase 3 changes, Gemini 3.1 Pro (High, new chats) reviews equity and accessibility, then workflow and screen consistency; the fluent reviewers approve each language (set `approved: true` in `lib/text/languages.ts`); list any open handoff before the closing save point.

Waiting on the owner (none block the no-response steps):
1. Fluent reviewers for French, Urdu, Arabic and Mandarin, safety messages first (notes for them at the top of `handoffs/archive/2026-11-10-gemini-translations-phase3.md`).
2. Confirm in Vercel (virtual-er-izpf > Settings > Cron Jobs) that `/api/keep-alive` ran (daily at 12:00 UTC). The MCP cannot list cron jobs.
3. Optional: leaked password protection (Supabase dashboard > Authentication).

Not checked yet:
- The start route's "paused" and "busy" answers on purpose (need database changes or 20 test visits; ask the owner).
- A real desk slip on the live site showing the live link and its QR code (needs the owner signed in).
- A patient screen with a real visit open in a language other than English.

Carry into later steps:
- The single `change_signal` row is fine at demo size; Supabase Realtime Broadcast could replace it later.
- Analytics (Vercel Web Analytics, Speed Insights) only after a privacy review.
- A Nastaliq font for Urdu: ask the Urdu reviewer.
- Phase 4 list (below): realistic simulated wait range from demo data.

Working notes for a new session:
- Models: Gemini only (CLAUDE.md). Handoffs: one file per review in `handoffs/`, the answer goes at the bottom with Claude's check, then the file moves to `handoffs/archive/`.
- **Database changes**: the Supabase MCP is read-only (SPEC rule; never switch it off without the owner asking) and did not connect in the 2026-11-10/11 session. Write each change as a file in `supabase/migrations/`, explain it, and the owner runs it in the Supabase dashboard's SQL Editor (they open the .sql file in VS Code or SQL Server Management Studio only to copy it; SSMS cannot run it). Then the owner runs `supabase/checks/permissions.sql` (both queries; the editor shows only the last result, so run them separately) and pastes the result. Update the expected list in that file with every new function.
- **Deleting test visits**: the owner runs `select code, site, source, status, created_at from public.visits order by created_at;` then `delete from public.visits where code in (...);` in the SQL Editor.
- **Testing with short times**: set `lib/demoTimes.ts` to 1 minute locally (not committed), start a visit from home in Playwright, the owner checks it in on http://localhost:3000/staff (Playwright cannot sign in as staff), then put the times back with `git checkout -- lib/demoTimes.ts`. The owner can also watch the patient tab themselves (Show QR again, then "Demo: open the patient screen in a new tab").
- **Dev server**: the owner usually runs it on port 3000. In the 2026-11-11 session Claude Code stopped the one Claude started because the computer was low on memory; ask before starting it (`npx next dev -p 3000`).
- In Playwright, use `main:visible` (Next.js keeps the previous page hidden) and the browser may reset to a blank page between steps; the saved visit is in `localStorage` key `vwr.patientToken`, the language in `vwr.language`.
- axe-core is in `node_modules/axe-core/axe.min.js`; load it with Playwright's `page.addScriptTag({ path })` and run `axe.run` with the WCAG 2.2 AA tags.
- Vercel: team `team_YrtMKwQ7fPtnSdNJHMrFEJlI`. The MCP can read deployments and logs but may not change firewall settings or list cron jobs; the Vercel CLI is not installed. Ask the owner before every push (a push to `main` redeploys the live link).
- Secrets live only in `.env.local` (git ignores it) and in Vercel's settings. Never print them; test with them by reading the file inside a command.
- Long scripts inside a shell heredoc fail in this setup (quotes and backslashes get mangled); write the script to a file in the scratchpad folder with the Write tool and run it with `python -I`. Python's console here is not UTF-8: call `sys.stdout.reconfigure(encoding="utf-8")` before printing Urdu, Arabic or Chinese.
- `npm audit` shows 7 moderate warnings from `minimatch` inside the code checker (not in the app); check again at the start of each phase.

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
- Translations drafted by Gemini 3.1 Pro (2026-11-11): `lib/text/fr.ts`, `ur.ts`, `ar.ts`, `zh.ts`, marked DRAFT (answer and Claude's check in `handoffs/archive/2026-11-10-gemini-translations-phase3.md`). The type check proves the same sentences as English; `lib/text/translations.test.ts` checks fill-in words, 911/811 and paragraph counts. Fixed: French "ConnexionSanté" back to "Health811". Notes for the fluent reviewers are in the handoff file. Shown live with the draft notice (owner's choice, 2026-11-11).
- Language switch (2026-11-11): `lib/text/languages.ts` (the five languages, direction, approved flag; only English approved; `patientLanguage`: the phone's choice, else the visit's language, else English), `data/savedLanguage.ts` (phone remembers the choice), `components/LanguageSwitch.tsx` (menu with each language in its own script, draft notice), `components/start/StartPageBody.tsx` (start page now follows the language; the start box no longer has its own menu, the visit takes the chosen language). Patient screen: menu at the top, `lang` and `dir` on the page, so Urdu and Arabic flip right to left; even "Loading…" and the 911 line use the phone's choice (Gemini's earlier point). Staff check-in offers all five (English names beside, "draft until checked"). The start route accepts all five codes. Checked at phone size: every language has the right direction, no sideways scroll, the 911 line, and the draft notice except English; axe-core (WCAG 2.2 AA rules): no failures on the start page in all five and the patient screen in Urdu and Arabic. 116 tests, type check and lint pass. When a reviewer approves a language, set its `approved` to true in `lib/text/languages.ts`.
- Still English: the footer (it is in the shared page frame, outside the patient screen) and staff screens. Possible later: a Nastaliq font for Urdu (it shows in the phone's default Arabic-script font now); ask the Urdu reviewer.
- Still needed (owner): one fluent reviewer each for French, Urdu, Arabic and Mandarin, safety messages first.
- "I'm still here" (built 2026-11-11, database change not run yet): `supabase/migrations/20261111050000_still_here.sql` adds `record_still_here` (tap recorded only while waiting) and makes `get_patient_visit` also return the visit's own `triaged_at`. Rule: `lib/stillHere.ts` (due 30 minutes after triage or the last tap, missed 10 minutes later; times in `lib/demoTimes.ts`), with tests. Patient prompt: `components/patient/StillHerePrompt.tsx` (polite screen-reader announcement, thank-you for 5 minutes). Staff row: last tap time and a red "Missed" flag. `supabase/checks/permissions.sql` expects the new function. 92 tests, type check and lint pass. Before the change runs, the app works as before (no prompt). Database change run by the owner on 2026-11-11: both functions answer; `permissions.sql` matched exactly; no table without row-level security. Tested with the times at 1 minute (owner, on localhost): prompt, staff flag, tap clears the flag. Times put back to 30 and 10. Test visits deleted by the owner in the SQL Editor; the `visits` table is empty. Gemini review done (`handoffs/archive/2026-11-11-gemini-review-still-here.md`): fixed a stale "last tap" time on reopened visits (`lastTapThisWait`); accepted limit: a phone with a wrong clock shows its prompt early or late (the staff flag uses the staff laptop's clock, so staff are still told). Kept "Phone this patient" for the no-response step (SPEC wording; "Call" clashes with "Call back"; "Text" needs phone numbers the demo does not store).
- Pushed to GitHub on 2026-11-11 (owner approved): 23 save points up to `90fbd4e` (wording, "I'm still here", five languages with draft notices). Vercel deployment `dpl_3Qo2yaci8Sswv64nJ2khprJcooxP` READY in Montreal (yul1). Checked on the live link at phone size: start page in English, Arabic right to left with the draft notice and the 911 line; no console errors (two harmless warnings: the staff font and style are preloaded but not used on the start page). 
- Gemini review of the language switch (2026-11-11, `handoffs/archive/2026-11-11-gemini-review-language-switch.md`). Fixed: the desk QR link carries the visit's language (`&l=xx`) so a scanned slip opens in that language even before the visit loads; menus show "اردو (Urdu)" style labels; visit code and site wrapped in `<bdi>` inside right-to-left text. Not accepted: "visit's language first" (the patient's own menu would stop working) and the claimed hydration error (none; React handles it); accepted limit: a brief English flash on the start page for a phone set to another language. 119 tests pass. Pushed (`0a6d46d`) and checked on the live link at phone size: a link ending `#t=<made-up token>&l=ar` opened the patient screen in Arabic, right to left, with the 911 line; the phone remembered Arabic; the token left the address bar; the menu shows "اردو (Urdu)" style names.

## Phase 4: to do (list started 2026-11-11)

- **Realistic simulated wait range from demo data (owner, 2026-11-11; no code changed yet).** Goal: a patient checked in behind the demo visits sees about 2 to 3 hours, near the owner's figure of Ontario Health's July 2026 average of 2.7 hours to first doctor at Credit Valley (not checked by Claude; a different measure from "time until called back", so it is only a realism target). That number goes in this note only, never in the app (SPEC rule 8); the estimate stays simulated and tied to place in line, with no time-of-day logic.
  - How the range works now (`lib/queue.ts`, numbers from `get_patient_visit`): place = 1 + patients waiting off-site at the same site triaged earlier. Minutes per place = average gap between the site's last 6 call-backs (whole minutes, at least 1), or 15 with fewer than 2 call-backs. Middle = place x minutes per place; shown as 80% rounded down to 5 (at least 5) to 125% rounded up to 5 (at least low + 5). With 15: place 1 = 10 to 20, place 3 = 35 to 60, place 10 = 120 to 190 minutes.
  - Plan: demo mode puts about 9 visits waiting off-site per site (triaged over the last few hours), so a new real patient is place 10, plus about 6 called-back visits spaced unevenly around 15 minutes apart (for example 12, 18, 14, 16, 15), so the average gap is 15. Middle 150 shows "120 to 190 minutes". The other 3 to 5 demo visits fill on the way, arrived, declined, not eligible and started from home (15 to 20 total, as SPEC asks).
  - Move the 15-minute default ("minutes per place until there is call-back history") from `lib/queue.ts` into `lib/demoTimes.ts`, labelled simulated. Alternative with fewer fake visits: 5 waiting ahead (place 6) at 25 minutes also gives a middle of 150.
  - Decided (owner, 2026-11-11): place in line stays off-site only. It counts only visits with status waiting (off-site) at the same site; patients waiting inside the hospital (declined, not eligible), called-back visits and untriaged visits from home never add places. So the demo's waiting-room realism comes from the off-site demo visits and the minutes per place, not from counting on-site patients.
  - Caution: demo visits count in every patient's place in line (`get_patient_visit` does not separate `is_demo`), which is what this needs; "Clear demo data" must remove them before real testing.
  - Check with a unit test (the 9-ahead, 15-minute case gives 120 to 190) and in Playwright after demo mode is built. Gemini 3.6 Flash, High, writes the synthetic visits and expected dashboard numbers (CLAUDE.md); include this expected wait range in its handoff.
