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
  `supabase/migrations/20261110090000_visit_version_and_database_times.sql`.
- `version` goes up on every change, made by a trigger, so the patient functions (`record_seen`,
  `confirm_on_my_way`) also count as a change and a staff screen working from an older copy is refused.
- Times: rather than rewriting every `lib/` rule as a database function, the same trigger replaces any
  time that is newly filled in with the database's `now()`. Undo only ever clears times (checked in
  `lib/visitActions.ts` `undoClose`), so this covers every step. `created_at` can never change after
  the visit is made. `followup_paused_until` is a future time, so it is left alone.
- Staff updates become `.eq('id', id).eq('version', before.version)`.
