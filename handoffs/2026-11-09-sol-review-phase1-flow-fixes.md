# Virtual Waiting Room: fixes after the Phase 1 flow review

Phase 1, browser-only demo data; this file contains no keys, tokens, passwords or patient data.

| # | Finding | Action |
|---|---------|--------|
| 1 | Cancelling a home visit carried CTAS and ticks to the next patient | `cancelHome()` in `components/staff/CheckInPanel.tsx` clears CTAS, ticks, language and message before leaving the home visit. `app/staff/page.tsx` gives the panel `key={site}`, so a site change starts a fresh form. |
| 2 | Visit processed on another screen left a stale form | New `lib/homeCheckIn.ts` `homeCheckInProblem(chosen, live, now)` compares the chosen visit with its live copy. The staff page passes the result to the panel, which shows it as an alert, disables the fieldsets and hides the save buttons. Text: "Visit CODE was already processed on another screen. Current status: offered, declined. No additional check-in was saved." Also covers a visit that is gone. |
| 3 | 6-hour expiry differed between staff and patient | `checkInHomeVisit` now refuses an expired visit (uses `isExpected`). `PatientView` has `expired`; `usePatientView` re-reads on the 15-second clock. The patient screen shows "This visit request has expired" with arrival advice and a link to start a new demo visit. Expiry while the staff form is open shows the problem from item 2. |
| 4 | Closed visits offered "Start a visit" straight away | New `lib/startPage.ts` `startPageState()`. Closed: "Your last visit on this phone", the code, "Open your visit" first, then a separate "Start a new demo visit instead" button. Expired gets the same treatment. |
| 5 | "Checked in from home" implies registration | **Heading kept**: SPEC.md names this status "Checked in from home, not yet triaged", and patient wording is scheduled for the Phase 3 wording pass. Added: "Starting this demo visit does not register you with a hospital, reserve a place, or give permission to wait off-site." |
| 6 | No arrival instruction | Added: "If you go to the emergency department, follow its normal arrival, triage and registration steps. Show this visit code when staff ask. Only staff can approve waiting off-site." |
| 7 | Staff labels | List heading is now "Off-site: waiting or called back". **"Check in" button kept**: "Select for off-site assessment" would suggest assessment happens off-site (triage is on-site) and that off-site waiting is the outcome, but the same form records "declined" and "not eligible". The row steps were already distinct: "Seen (screen shown, not necessarily read)", "On the way", and arrival only when staff mark it. |
| 8 | Care options could read as recommendations | Heading is "Official information about care options", followed by: "This demo cannot tell which service is right for you. Check eligibility, availability and hours on each linked site before you go." The pharmacist pilot line adds "The pilot may change or end, so check that it is still running." |
| + | No unavailable-storage state on the start page | `startPageState` returns `unavailable`. The start page then says "We cannot read the visit saved on this phone" and gives no start form. |

60 unit tests pass (12 new); lint and type check are clean. All of the following were checked in a browser:
- Cancel clears CTAS and ticks.
- A second tab declining the visit makes the first tab show the item-2 alert with no save buttons.
- The start page shows a closed visit first.
- A visit aged 7 hours shows as expired on the patient screen and the start page.
- A normal home check-in still shows "Visit … is now waiting off-site." with no false alert.
- Broken storage on the start page shows no form.
- No sideways scroll at 390 px.

## Questions for you

1. Do these changes close findings 1–4, 6, 8 and the storage gap?
2. Do you accept the reasons for keeping the item-5 heading and the item-7 "Check in" label? If not, suggest a staff button label that works for all three outcomes.
3. Is there any new state these changes leave without a message?
