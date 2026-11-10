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
- Grok's simpler-screens pass was skipped (`handoffs/2026-11-09-grok-simpler-screens-phase1.md`).

Decisions kept on purpose:
- The patient heading "Checked in from home, not yet triaged" (SPEC wording; revisit in the Phase 3 wording pass).
- The staff button label "Check in".

Notes:
- Another copy of this project, in OneDrive\Desktop\Career\virtual-er, may be running on port 3000. Run this one with `npx next dev -p 3100`.
- `npm audit` shows 7 moderate warnings, all from one old `minimatch` inside `typescript-eslint` (code checker only, not in the app). No fix exists yet: `typescript-eslint` 8.72.2 accepts only `minimatch` 10.x, and the fix is in 11.0.1. Decided on 2026-11-09 to wait instead of forcing the newer version. **At the start of each phase, run `npm update` and then `npm audit` to see if the warnings are gone.**

## Next: Phase 2 (Supabase, realtime, staff login, row-level security, Vercel)

Not started. It begins only after the owner has tested Phase 1.
