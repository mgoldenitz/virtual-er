# Virtual Waiting Room: two follow-ups after the fourth Phase 1 review

Phase 1, browser-only demo data; this file contains no keys, tokens, passwords or patient data.

| # | Finding | Action |
|---|---------|--------|
| 1 | Patient sees "No visit found" when damaged storage hides the visit | `storageMayHideToken(token)` in `data/visitStore.ts` is true when the saved list is unreadable or a damaged entry carries this token. `usePatientView` in `data/patientVisit.ts` then returns `"unavailable"`, and `app/patient/page.tsx` shows "We cannot load your visit right now", says nothing can be saved, and asks the patient to contact the desk. No status or "I'm on my way" button is shown, so nothing implies an action succeeded. The 911 line stays. Patients get no reset; reset with backup stays staff-only |
| 2 | Last "Show older closures" press removes the focused button | `components/staff/RecentlyClosed.tsx` moves focus to the first newly shown row (rows have `tabIndex=-1`) and a status region says "Showing N older closures." |

43 unit tests pass; lint and type check are clean. Checked in a browser: after 7 closures, "Show older closures" focuses row 6 and announces "Showing 2 older closures."; a patient whose own entry is damaged, and a patient with an unreadable list, both see "We cannot load your visit right now" with no action buttons.

## Question for you

Do these two changes close the follow-ups?
