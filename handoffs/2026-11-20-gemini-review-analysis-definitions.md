# Gemini review: definitions of four new dashboard views (2026-11-20)

Model: Gemini Hydrogen 4, High, in a new chat. If no Gemini Hydrogen 4 credits: Gemini 3.6 Flash, High.
Plan: docs/2026-11-20-analysis-views-plan.md (`ef83546`). Phase 4 rule: the metric definitions are checked before the build.

Give the model everything below the line "Text for the model". No code, no keys, no real patient data.

---

## Text for the model

You review metric definitions for a concept prototype: a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. All data is synthetic. Your job is to find problems, not to confirm. List every gap, double count, unclear edge or wording that staff could misread. For each point, give a concrete example visit (its times and status) that shows the problem, and a fix.

### How the data works now

- One table, `visits`, one row per visit. Times: `created_at`, `triaged_at`, `offered_at` (staff offer off-site waiting; saved in the same step as triage), `called_at` (staff recall), `arrived_at`, `closed_at`. Status is one of: pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed (with removed_reason left or no_show), declined, not_eligible. `source` is home or desk. `survey_score` is 0 to 10 or empty. `is_demo` keeps demo and real visits apart.
- The database sets every time to the server's now(). A visit is called at most once: there is no step from `called` back to `waiting`. A declined visit can later move to `waiting`.
- Every 15 minutes a job deletes visits created more than 24 hours ago. In the same statement each deleted visit adds its numbers to `daily_stats`, one row per (Toronto date, site, is_demo). Each number counts on the America/Toronto date of its own event. `daily_stats` holds totals only, never one visit's times.
- A dashboard number for a day = the visits still in the table whose event falls on that date + that day's `daily_stats` row.

### Today's definitions (already built, for context)

- Offered off-site waiting: offered_at today, over CTAS 4 or 5 with triaged_at today.
- Accepted: offered minus declined. Declined: status declined, on offered_at.
- Average minutes from recall to arrival: arrived_at minus called_at, over status arrived with called_at set, on arrived_at.
- No-shows, Unable to reach, Left: on closed_at.
- Started from home: source home, on created_at. Reached triage: those with triaged_at set.
- Survey responses, average score, scored 9 or 10: visits with survey_score, on closed_at.
- A share or average whose bottom number is 0 shows "-" ("no data yet").

### New definitions to review

1. Recalled: called_at set, on the called_at date.
2. Average off-site wait (triage to recall): called_at minus triaged_at, over recalled visits with triaged_at set, on the called_at date. Shown in whole minutes with the count, for example "52 (7 visits)".
3. Wait bands, same visits, by whole seconds of wait: under 1800 (under 30 min), 1800 to 3599 (30 to 59), 3600 to 7199 (60 to 119), 7200 or more (120 or more).
4. Funnel for today, counts only, no percent: Started from home, Reached triage (from home), Triaged CTAS 4 or 5 (home and desk), Offered, Accepted, Recalled, Arrived after recall, Answered survey. Each step counts on the date of its own event. The screen line: "Each step counts the patients who reached that step today. A patient who was triaged yesterday and recalled today counts only in Recalled. So a step can be larger than the step above it." Desk visits join at "Triaged".
5. Past 7 days: the 7 Toronto dates before today, each counted by the same rules as today, per site. Columns: triaged, offered %, accepted, average recall to arrival, average off-site wait, average survey score.
6. CSV download: one row per past day and site for the mode on screen (real or demo), the same numbers as the past-7-days view, plus the date, site and is_demo. Today is left out because it is not complete. No codes, tokens or visit times.

### Questions

- Is any new number counted twice, or missed, when a visit's events fall on two dates or when the visit moves from the table into daily_stats?
- Should a recalled visit that later needs reassessment, is a no-show, or is unable to reach still count in the wait average and bands?
- Is "triaged_at to called_at" the right start for an off-site wait, given that a declined visit can later move to waiting?
- Are the band edges and their labels clear to staff?
- Is the funnel line clear to a nurse who reads it once? Suggest a shorter one if you can.
- Is there any reason to keep or to leave out today in the CSV?
- Anything else a staff member could misread.

---

## Checked

- A visit is called at most once: no ('called', 'waiting') step in the allowed steps of `supabase/migrations/20261119010000_declined_switch_checks.sql` (read in this session).
- Today's definitions match SPEC.md lines 104-114 (read in this session).

## Not checked

- Whether `called_at` is ever set for a visit with no `triaged_at` in real or demo data.
- How the demo simulator spreads triage and recall times across midnight.
