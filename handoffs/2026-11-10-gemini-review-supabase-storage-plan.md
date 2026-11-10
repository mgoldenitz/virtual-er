# Review request: plan to move visit storage from the browser to Supabase

Project: concept prototype of an emergency department virtual waiting room (Next.js 16 App Router,
React 19, Supabase, later Vercel). Demo data only: no names, health numbers, phone numbers or symptoms.
Built by a beginner with Claude Code. Please review the plan below before any code is written.

## Where things stand

- Phase 1 kept every visit in the browser's localStorage (`data/visitStore.ts`). Screens never touch
  storage directly: staff screens call `data/staffActions.ts` and `data/useVisits.ts`; patient screens
  call `data/patientVisit.ts`. All rules (line order, allowed steps, wait range) are pure, tested
  functions in `lib/` (for example `callBack(visit, now)` returns the changed visit, or null if the step
  is not allowed now).
- The database is already set up and checked (not changing in this step unless the review says so):
  - `visits` table, row-level security: only signed-in staff (`app_metadata.role = 'staff'`) can
    select, insert, update. No delete. Patients (`anon`) have no table access.
  - Patient functions, `security definer`, callable by anon, each takes the long access token:
    `get_patient_visit(token)` returns patient-safe fields plus `place_in_line` and
    `average_gap_minutes` (rounded); `record_seen(token)` and `confirm_on_my_way(token)` return true
    or false (false = step not allowed now).
  - `start_home_visit(site, language, code, token)`: only the server (secret key) may call it. It sets
    source = home and status = pre_arrival itself, and returns saved / paused / busy (10 starts per
    site per minute) / taken (code or token already used).
  - `change_signal`: one row whose time changes on every change; it carries no visit data. Used in the
    next step for live updates.
- Staff login works (`proxy.ts` sends non-staff to `/login`).

## The plan

Work in four small steps, with a Git save point and a check after each.

### Step A: patient screen reads from the database
- `data/patientVisit.ts`: `usePatientView(token)` calls `get_patient_visit` and keeps the result in a
  small in-memory cache read through `useSyncExternalStore`. It re-reads every 30 seconds and when the
  tab comes back into view (live updates come in the next step).
- New tested rule `lib/patientViewFromRow.ts`: turns the database row into the existing `PatientView`
  shape, working out the wait range with the existing `waitRange()` (default gap 15 minutes when
  `average_gap_minutes` is null).
- `recordSeen` and `confirmOnMyWayByToken` call the two functions: true = "saved", false = "refused",
  a network or database error = "not_saved" (the screen already has a message for this).
- If the read fails, the screen shows the existing "We cannot load your visit right now" state, never
  "No visit found".

### Step B: start a visit from home through a server route
- New server-only file `data/supabaseServer.ts` (uses the secret key; marked `import "server-only"` so
  it can never be bundled into the browser).
- New route `app/api/start-visit/route.ts` (POST, body: site and language only). It checks site is A
  or B and language is an allowed code, makes the code and token with `lib/codes.ts`, calls
  `start_home_visit`, and retries up to 3 times on "taken". It returns the token, or paused / busy /
  error. The per-device limit is added later, with the Vercel deployment.
- `startVisitFromHome` becomes an async call to this route; the start page shows "Starting…" and a
  clear message for paused, busy and error.

### Step C: staff screens read and change visits in the database
- `data/useVisits.ts` loads all visits (`select *`, allowed by row-level security for staff) into an
  in-memory cache, read through `useSyncExternalStore`. It re-loads after every staff action and when
  the tab comes back into view. New states: loading, and "could not load" with a Try again button.
- Every staff action stays a `lib/` rule applied to the cached visit, then is saved as a conditional
  update: only the fields that changed, and only if the row still has the status it had when the
  action started:
  `update(changed).eq('id', id).eq('status', before.status).select()`.
  No row back = "refused" (someone else changed it first; the list re-loads). Error = "not_saved".
  A new tested rule `lib/changedFields.ts` works out the changed fields.
- New desk visit: insert, with the display code made from the codes already in the cache; on a
  unique-code error, make a new code and retry up to 3 times.
- Look up by short code (`findVisitByCode`) asks the database, so a visit started from home a moment
  ago is found even if the cached list is older.
- Buttons are disabled with "Saving…" while a change is in flight, so a double click cannot send it
  twice.

### Step D: remove the browser storage
- Delete `data/visitStore.ts` and its test, `data/useStorageProblem.ts`,
  `components/staff/StorageWarning.tsx` and the "Start a new list" flow (they only handled damaged
  localStorage), and probably `lib/parseVisits.ts` (database constraints now guarantee the shape).
- Remove the yellow "visits are saved only in this browser" note from the staff screen.
- `data/savedToken.ts` stays: the phone still remembers its own token.

### Checks
- Type check, lint, unit tests (new tests for `patientViewFromRow` and `changedFields`).
- Playwright: start a visit in a "phone" browser, check it in on the signed-in staff screen in a
  separate browser, call back, confirm "I'm on my way" on the phone, mark arrived. Two staff tabs
  pressing "Call back" on the same patient: one succeeds, the other is told it was already changed.
- axe-core accessibility check on the new loading and error states.
- Supabase security advisor and `supabase/checks/permissions.sql` after any database change.

## Questions

1. Is the status-guarded conditional update (`.eq('status', before.status)`) enough to stop two staff
   screens overwriting each other, or should the table get a version number or `updated_at` column?
   Are there actions where the status does not change, so the guard does not protect anything
   (for example recording a phone attempt or the "seen" time)?
2. The `lib/` rules stamp times from the device clock (`new Date()`), while the database functions use
   `now()`. A staff laptop with a wrong clock could put patients in the wrong line order. Keep device
   time for a prototype, or have the database set the times?
3. Is loading every visit for the staff list acceptable here (a demo with at most a few hundred rows,
   cleaned up after 24 hours in Phase 3), or should it be limited now (for example last 24 hours)?
4. Any risk in the server route that holds the secret key, beyond the per-device limit planned for
   later? Anything it must validate that is missing?
5. Missing states or steps in the plan, or a better order?
