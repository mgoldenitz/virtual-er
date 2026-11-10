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
- 60 unit tests (`npm test`).

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

Next steps:
1. Replace `data/` browser storage with Supabase calls. Plan: `handoffs/2026-11-10-gemini-review-supabase-storage-plan.md`; Gemini 3.1 Pro's answers and what was done about them: `...-plan-response.md`. Done so far: the database change `20261110090134_visit_version_and_database_times.sql` (a version number on each visit, and the database sets every time), run on 2026-11-10 after approval; checks passed. Changed from the plan: staff saves use `version`, not `status`; the staff list loads only the line plus the last 24 hours. Next: steps B to D of the plan.
   - Step A done (2026-11-10): the patient screen reads its visit from the database (`get_patient_visit`), every 30 seconds and when the tab comes back, and "seen" and "I'm on my way" go to `record_seen` and `confirm_on_my_way`. New rules: `lib/patientViewFromRow.ts`, `lib/failedRead.ts` (one failed read keeps the last view and retries after 5 seconds; two in a row show "We cannot load your visit right now"). Checked in the browser with no visit and with the database blocked. **Not yet checked with a real visit**: the database has none, and the test rows need the owner's approval. Gemini review: `handoffs/2026-11-10-gemini-review-step-a-patient-reads-database.md` (not done yet).
   - **Until steps B and C are done the app is half moved:** starting from home and every staff action still save to the browser, while the patient screen reads the database, so a visit made in the app does not show on the patient screen.
   - `lib/patientView.ts` `patientViewFor` is now used only by its test (the type `PatientView` is still used). Remove it in step D.
2. Live updates through `change_signal`.
3. Deploy to Vercel, with a per-device limit on starting from home.
4. Playwright laptop and phone test (about 2 seconds). Then Gemini 3.1 Pro (High) and GPT-6 Astra (High).
