# Response: Gemini 3.6 Flash (High) on steps A to C

Asked: `handoffs/2026-11-10-gemini-review-steps-a-to-c-supabase-storage.md`. The owner had no credits
left for Gemini 3.1 Pro, so Gemini 3.6 Flash (High) did this review.

## Gemini's answer (as pasted by the owner)

**1. Read cache bugs (`data/visitCache.ts` and `data/patientVisit.ts`)**

- Duplicate polling timers per component in `watchVisits`: `useVisits()` calls
  `useSyncExternalStore(watchVisits, readVisitList, ...)`. Inside `watchVisits`, every new component
  subscription executes `readNow()`, setting up its own independent `setTimeout` loop. If three staff
  components mount and call `useVisits()`, three concurrent 15-second polling loops run
  simultaneously. Polling timers must be managed globally at the module level rather than inside the
  per-subscriber setup function.
- Overlapping read requests on focus/online events: in both `watchVisits` and `watch`, the `onBack`
  listener invokes `readNow()`. In `readNow()`, `clearTimeout(timer)` is executed after
  `await loadVisits()` / `await refreshPatientView()` completes. If an asynchronous network fetch takes
  two seconds, a `visibilitychange` or timer tick during that fetch spawns a second overlapping request
  because the existing timer was not cleared before the `await`.
- Global subscriber notification scope: in `data/patientVisit.ts`, `listeners` is a single global
  `Set`. Executing `listeners.forEach((tell) => tell())` notifies all subscriber components across the
  entire application, triggering re-renders even for components observing completely different tokens.

**2. Staff actions and version check (`data/staffActions.ts`)**

- Version check correctness: optimistic concurrency control is implemented correctly via
  `.eq("id", id).eq("version", before.version)`. If another staff member or patient updates the visit
  first, the update query returns 0 rows, causing `changeVisit` to return "refused" without
  overwriting data.
- Double-click safeguards: component buttons use `saving` state locks (`if (saving) return;` and
  `aria-disabled={saving}`), preventing duplicate submissions while an action is in flight.
- Empty update payload edge case: `changedFields(before, after)` compares values via strict
  inequality. If an action function returns an object where no fields changed, `changedFields` returns
  `{}`. Passing an empty payload to PostgREST in `update({})` can result in database errors or
  unexpected API responses.

**3. Client-side rules vs. database enforcement**

- Risk level for Phase 2: low risk for a local concept prototype using demo data.
- Security isolation: direct table mutations are restricted to authenticated users matching
  `is_staff()`. Unauthenticated patient clients (`anon`) have no table access and can only execute
  narrow security definer functions (`get_patient_visit`, `record_seen`, `confirm_on_my_way`).
- Database guards: the trigger `visits_before_write` overrides timestamp modifications by enforcing
  `now()` whenever a timestamp transitions from null, preventing staff devices with incorrect local
  clocks from manipulating line order. Leaving business logic checks in `lib/visitActions.ts` until
  Phase 3 is an acceptable temporary compromise for Phase 2.

**4. Secret key security and route validation**

- Secret key leak prevention: the secret key is imported into `data/supabaseServer.ts` with
  `import "server-only";` and relies on `SUPABASE_SECRET_KEY` (without the `NEXT_PUBLIC_` prefix). It
  will not be bundled or leaked to the client browser.
- Request input validation: the API route enforces a payload limit of 200 characters and validates
  `site` and `language` through `parseStartVisitRequest` before making database calls.
- Race condition mitigation: `start_home_visit` invokes `pg_advisory_xact_lock`, serializing
  concurrent requests per site and preventing race conditions against the 10-starts-per-minute cap.
- Missing safeguards: the API endpoint lacks IP rate-limiting or bot verification (for example
  CAPTCHA/Turnstile). Automated clients can make continuous POST requests to `/api/start-visit` until
  the site-wide cap is exhausted.

**5. Timing and patient safety**

- Clinical appropriateness: for non-urgent emergency patients (CTAS 4 and 5), a 30-second delay for
  status updates (and up to 35 seconds during a single transient read failure) is safe and acceptable
  for prototype testing.
- User experience: a 30-second gap between staff triggering "Call back" and the patient's screen
  updating can cause administrative delay at the triage desk.
- Recommended adjustment: lower the patient screen polling interval (`REREAD_MS`) to 10 to 15 seconds
  while status is `waiting` or `called`.

**6. Timestamp comparisons in `lib/` rules**

- Direct ISO string comparison is unsafe: comparing ISO-8601 timestamp strings directly using
  JavaScript operators in `lib/queue.ts` or `lib/recentlyClosed.ts` is unsafe.
- Microsecond precision mismatches: PostgreSQL `timestamptz` values returned via PostgREST may
  truncate or extend fractional seconds (for example `.82` vs `.82226`). Lexicographically,
  `".82+00:00"` evaluates as greater than `".82226+00:00"` because `'+'` (ASCII 43) comes after digits
  (ASCII 48 to 57).
- Equality failure in `undoClose`: comparing string timestamps via
  `visit.closed_at === closure.closed_at` will fail if JavaScript generates a standard ISO string
  (`.123Z`) while Postgres returns an offset format (`.123000+00:00`).
- Fix: parse string timestamps into numeric epoch milliseconds before any comparison or equality check.

**7. Maintainability and simplification**

- Separate subscription from timer execution: centralize background polling into a single
  module-level `setInterval` or hook, rather than starting polling loops inside
  `useSyncExternalStore` subscription callbacks.
- Standardize date parsing: replace direct string equality in `lib/visitActions.ts` (such as
  `undoClose`) with numeric timestamp evaluation.
- Simplify changed field detection: instead of relying on generic object reflection via
  `changedFields`, explicitly pass changed fields within each action handler.

## What Claude Code checked and did

- **1, one timer per subscriber: valid, fixed.** Only one part of each screen was listening, so there
  was one timer in practice, but a second listener would have added a second timer. The timer now
  lives in one new file, `data/keepFresh.ts`, used by both the staff list and the patient view: one
  timer per staff list and one per token, however many listeners. Checked in the browser: one read in
  17 seconds on each screen.
- **1, overlapping reads: partly valid, fixed.** A read started while another was on its way could
  not show an older answer (the `latestRead` / `latestLoad` counters already prevented that), but it
  was a wasted request. `keepFresh` now runs one read at a time.
- **1, one listener list for all tokens: no change.** A listener that is told about another token's
  change re-checks its own value, finds it unchanged, and React does not redraw. Nothing is redrawn
  for nothing.
- **2, empty change: valid, fixed.** No rule can produce an unchanged visit today, but `changeVisit`
  now returns "refused" instead of sending an empty update.
- **3: agreed.** The database checks of allowed steps stay planned for Phase 3.
- **4, no per-device limit: valid, already planned** for the Vercel step. The route stays local until
  then.
- **5: accepted.** The patient screen now re-reads every 15 seconds in every status (simpler than a
  different speed per status). Live updates in the next step replace the timer as the main signal.
- **6, text comparison of times: the reason given is incorrect, but line order was hardened anyway.**
  `'+'` (ASCII 43) comes before the digits, not after, so `.82+00:00` sorts before `.82226+00:00`,
  which is the right order; the old comparison was correct for database times. It did rely on every
  time being written the same way (UTC, database style). `byTriage` in `lib/queue.ts` now compares the
  moments first and uses the text only to break a tie inside the same millisecond, where the
  database's microseconds still decide (so the staff list keeps agreeing with the patient's place in
  line, which the database works out). Two new tests cover database-style times with different
  numbers of decimals, and a browser-style time mixed with a database-style one.
- **6, `undoClose` equality: no change.** Both values compared come from the same database row, in
  the same format; the browser's own times never reach it, because the trigger replaces them and the
  saved row is read back. The version number is the real guard against undoing a newer closure.
  `lib/recentlyClosed.ts` and `lib/expectedArrivals.ts` only decide display order, from database times.
- **7, explicit changed fields per action: no change.** The rules in `lib/visitActions.ts` are tested
  and return the whole visit; listing the changed fields by hand in each action would be a second
  copy that could drift. `lib/changedFields.ts` is 16 lines with its own tests.
