# Response: Gemini 3.1 Pro (High) on the Supabase storage plan

Asked: `handoffs/2026-11-10-gemini-review-supabase-storage-plan.md`. Kimi K3.1 Pro was not working, so
its second opinion was skipped. Gemini answered questions 1 and 2 only; 3 to 5 got no answer.

## Gemini's answer (as pasted by the owner)

No, the status guard is not enough, and yes, the database should absolutely handle the timestamps.

* **The Status Guard:** You spotted the exact flaw in your own plan. Because actions like recording a
  phone attempt or logging a "seen" time do not change the visit's status, the
  `.eq('status', before.status)` guard offers no protection for them. Two staff members performing
  concurrent actions while a patient is in the "called" status will blindly overwrite each other. To
  establish true optimistic concurrency control, add a `version` integer column (e.g.,
  `version integer default 1`) to the `visits` table that increments on every update, and change your
  condition to `.eq('version', before.version)`.

* **Device Clocks:** You must let the database set the times. The system strictly orders the off-site
  line based on the `triaged_at` time. If you rely on `new Date()` from the browser, a staff laptop
  with an incorrect clock will stamp the wrong time and actively put patients in the wrong place in
  line. Always use PostgreSQL's `now()` so the entire application relies on a single, synchronized
  source of truth.

## What Claude Code will do with it

- Agreed on both points. One database change does both:
  `supabase/migrations/20261110090134_visit_version_and_database_times.sql`.
- `version` goes up on every change, made by a trigger, so the patient functions (`record_seen`,
  `confirm_on_my_way`) also count as a change and a staff screen working from an older copy is refused.
- Times: rather than rewriting every `lib/` rule as a database function, the same trigger replaces any
  time that is newly filled in with the database's `now()`. Undo only ever clears times (checked in
  `lib/visitActions.ts` `undoClose`), so this covers every step. `created_at` can never change after
  the visit is made. `followup_paused_until` is a future time, so it is left alone.
- Staff updates become `.eq('id', id).eq('version', before.version)`.
- Run on 2026-11-10 after the owner approved it. Tested in a transaction that was rolled back: an
  insert and an update sending 1999 times and versions 99 and 500 came out with the database's times
  and version 2. Permissions check matched the expected list; security advisor showed only the
  known warnings.

## Gemini's second answer: questions 3 to 5 (as pasted by the owner)

**3. Is loading every visit for the staff list acceptable here?**
No, loading every visit without limits is not acceptable. In Phase 2, `visits` lacks the planned
24-hour deletion rule, which is not coming until Phase 3. This means `select *` will accumulate and pull
every historical visit ever generated since launch, progressively degrading performance and risking
memory issues on staff devices. You should limit the query (e.g., to the last 24 hours or specifically
active statuses) to keep the payload bounded.

**4. Any risk in the server route that holds the secret key?**
Yes, there is a risk regarding how you enforce the rate limit in `start_home_visit`. Currently, the
function performs a read (`select count(*)`) and then an insert. Under concurrent load, multiple
requests can read an acceptable count (like 29) simultaneously and then all insert, bypassing your
30-starts-per-minute cap. Furthermore, because the server route takes only the site and language as
body parameters, it currently lacks any mechanism (like a CAPTCHA or token) to stop automated scripts
from spamming the route before the Vercel limits are in place.

**5. Missing states or steps in the plan, or a better order?**
The most critical missing step in your database plan is granting the `authenticated` role the base
privileges (SELECT, INSERT, UPDATE) on the `visits` and `site_settings` tables. You successfully revoked
access from `anon`, but Row-Level Security policies only filter access; they do not grant the
underlying base privileges. Without these grants, all staff actions will fail with a "Permission denied"
error before your RLS policies are even evaluated. You must add these base grants to the SQL in Step A.
Additionally, the `change_signal` table strategy in Step A requires a rework: updating a single shared
row (`id = 1`) on every visit change will force all database writes to queue for the same row-level
lock, serializing all writes and creating a severe performance bottleneck. Replace this with an
append-only signal table or Supabase Realtime Broadcast.

## What Claude Code checked and will do

- **3. Accepted.** The staff list will load only visits still in the line (waiting, called, on the
  way) plus anything created or closed in the last 24 hours. That covers the line, expected arrivals
  (6 hours) and Recently closed. Code lookup already asks the database directly.
- **4. Race: incorrect.** `start_home_visit` takes `pg_advisory_xact_lock` per site before counting
  (checked in the live database), so two requests cannot both pass the count. The cap is 10 per site
  per minute, not 30. **Spam: valid but already planned.** Until the per-device limit arrives with the
  Vercel step, a script could use up a site's 10 starts a minute and block real patients starting from
  home; checking in at the desk still works. The route stays unpublished (local only) until then.
- **5. Grants: incorrect.** The grants are already in `20261110060756_tables_and_security.sql`
  (`grant select, insert, update on table public.visits to authenticated`, and select, update on
  `site_settings`), and the live database confirms staff have them. **Single signal row: true in
  principle, not a problem at this size.** Each write holds the row lock only until it commits
  (milliseconds) and a demo has a handful of staff. Revisit in the live-updates step, where Supabase
  Realtime Broadcast could replace the table.
