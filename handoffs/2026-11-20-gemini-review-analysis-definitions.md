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

## Response

Gemini Hydrogen 4, High, 2026-11-20, pasted by the owner.

## 1. Double counts, missed counts, two-date events, and moving to `daily_stats`

Visits that cross midnight (and stay under 24 hours) will not be double-counted or missed when moving to `daily_stats` **if** every new metric (`recalled`, wait seconds, wait count, and the four band counters) is recorded on the `America/Toronto` date of `called_at` inside the single atomic delete-and-rollup statement. Five gaps still cause missed or mismatched counts:

* **Pre-rollout `daily_stats` rows permanently miss new metrics for the past 7 days and CSV**
* **Problem:** `daily_stats` already exists for today's built definitions and stores totals only, never individual visit times. Because the 24-hour job has already deleted older visits, past days inside the 7-day window cannot be backfilled for `recalled`, `average off-site wait`, or wait bands—making a past day appear to have `triaged` and `average recall to arrival` data alongside `-` (or `0` if defaulted wrong) for `average off-site wait`.
* **Example visit:** `source: "desk"`, `status: "arrived"`, `created_at: 2026-11-18T10:00:00-05:00`, `triaged_at: 2026-11-18T10:10:00-05:00`, `offered_at: 2026-11-18T10:10:00-05:00`, `called_at: 2026-11-18T11:00:00-05:00`, `arrived_at: 2026-11-18T11:12:00-05:00`, `closed_at: 2026-11-18T11:40:00-05:00`. Deleted into `daily_stats` at `2026-11-19T10:15:00-05:00` before the new columns shipped; on `2026-11-20`, the `2026-11-18` row shows `triaged: 1` and `average recall to arrival: 12`, but `average off-site wait: -`.
* **Fix:** Initialize new `daily_stats` counters to `0`, preserve the rule that a `0` denominator displays `"-"` (never `0`), and note the feature launch date on the Past 7 days view and CSV so pre-launch `"-"` cells are not misread as zero recalls.

* **`Reached triage (from home)` conflicts between Today's rule (`created_at`) and the Funnel rule (`triaged_at`)**
* **Problem:** Today's built definition counts "Started from home" on `created_at` and "Reached triage" as "those with `triaged_at` set" (implicitly anchored to `created_at`), whereas the Funnel states that each step counts on the date of its own event. If `daily_stats` stores `homeReachedTriage` on `created_at` while the Funnel queries live `visits` by `triaged_at`, cross-midnight home visits will shift dates or drop out once moved to `daily_stats`.
* **Example visit:** `source: "home"`, `ctas_level: 3`, `status: "not_eligible"`, `created_at: 2026-11-19T23:45:00-05:00`, `triaged_at: 2026-11-20T00:15:00-05:00`, `offered_at: null`, `closed_at: 2026-11-20T00:15:00-05:00`. `created_at` is Nov 19, while `triaged_at` is Nov 20.
* **Fix:** Align `visits`, `daily_stats`, and the Funnel on one rule: count `Reached triage (from home)` on the `America/Toronto` date of `triaged_at` in both the live table query and the cleanup rollup.

* **`Answered survey` has no `surveyed_at` timestamp and shifts when submitted after midnight**
* **Problem:** The `visits` table has no `surveyed_at` column (`closed_at` is used instead). A patient whose visit closes before midnight and who answers the survey the next morning adds retroactively to yesterday's `Answered survey` count (rather than today's "date of its own event"); if they answer more than 24 hours after `created_at`, the cleanup job has already deleted the row and the survey is lost.
* **Example visit:** `source: "desk"`, `status: "arrived"`, `created_at: 2026-11-19T20:00:00-05:00`, `triaged_at: 2026-11-19T20:10:00-05:00`, `offered_at: 2026-11-19T20:10:00-05:00`, `called_at: 2026-11-19T22:30:00-05:00`, `arrived_at: 2026-11-19T22:45:00-05:00`, `closed_at: 2026-11-19T23:50:00-05:00`, and `survey_score: 9` submitted at `2026-11-20T08:15:00-05:00`. This increments `2026-11-19`, not `2026-11-20`.
* **Fix:** Note on the dashboard that survey counts are grouped by visit close date (`closed_at`), or add a `surveyed_at` timestamp set by `now()` on submission if you need surveys counted on the day answered.

* **A visit with `called_at` set and `triaged_at` null creates a count mismatch between `Recalled` and `Average off-site wait` / `Wait bands`**
* **Problem:** Definition 1 (`Recalled`) checks only `called_at` set, whereas Definitions 2 and 3 require `triaged_at` set as well (a case explicitly marked as not checked). Any row with `called_at` and no `triaged_at` is counted in `Recalled` on the Funnel, then silently dropped from `(X visits)` in `Average off-site wait` and the sum of `Wait bands` (and if synthetic data ever sets `called_at < triaged_at`, the negative duration lands in `"under 30 min"`).
* **Example visit:** `source: "desk"`, `status: "called"`, `created_at: 2026-11-20T10:00:00-05:00`, `triaged_at: null`, `offered_at: null`, `called_at: 2026-11-20T11:00:00-05:00`. `Recalled` shows `1`, while `Wait bands` sum to `0`.
* **Fix:** Add a database constraint/check requiring `triaged_at IS NOT NULL AND called_at >= triaged_at` whenever `called_at` is set, and use the exact same filter for `Recalled`, `Average off-site wait`, and `Wait bands`.

* **Two-query dashboard reads and visits active past 24 hours**
* **Problem:** If the dashboard fetches `visits` and `daily_stats` in separate requests rather than one database transaction, a 15-minute cleanup run between the two reads will double-count every deleted visit (`visits` read before delete, `daily_stats` after) or miss them (reverse order). Separately, because cleanup deletes all visits created > 24 hours ago unconditionally, any long-running visit recalled or closed past 24 hours is deleted before its recall/arrival can be recorded.
* **Example visit:** `source: "home"`, `status: "waiting"`, `created_at: 2026-11-19T14:00:00-05:00`, `triaged_at: 2026-11-19T14:20:00-05:00`, `offered_at: 2026-11-19T14:20:00-05:00`. If `visits` is queried at `2026-11-20T14:14:59`, cleanup runs at `14:15:00`, and `daily_stats` is queried at `14:15:01`, `triaged`, `offered`, and `accepted` are counted twice. If recalled at `14:20`, the row no longer exists.
* **Fix:** Return `visits` + `daily_stats` sums from a single PostgreSQL function (one snapshot), and consider keeping unclosed `waiting`/`called` visits out of the 24-hour delete (or document that visits auto-expire before 24 hours).

## 2. Counting `needs_reassessment`, `no_show`, and `unable_to_reach` in wait average and bands

Yes, they **should** still count, because excluding `no_show` and `unable_to_reach` visits introduces survivorship bias—if long off-site waits cause more patients to give up or stop checking their phone, dropping them makes wait times look artificially shorter. However, keeping them creates a **comparison trap** for staff:

* **Problem:** Today's built `Average recall to arrival` includes only `status = arrived`, whereas `Average off-site wait` includes all recalled visits. Nurses comparing `"52 (7 visits)"` alongside `"13 min"` recall-to-arrival will assume both numbers describe patients who actually came back, or wonder why a patient who never returned (`unable_to_reach` / `no_show`) is in the wait average. Additionally, if a `waiting` patient enters `needs_reassessment` and is later recalled, `called_at - triaged_at` includes reassessment time.
* **Example visit:** `source: "desk"`, `ctas_level: 4`, `status: "removed"`, `removed_reason: "no_show"`, `created_at: 2026-11-20T09:00:00-05:00`, `triaged_at: 2026-11-20T09:10:00-05:00`, `offered_at: 2026-11-20T09:10:00-05:00`, `called_at: 2026-11-20T11:30:00-05:00`, `arrived_at: null`, `closed_at: 2026-11-20T12:10:00-05:00`. This visit contributes `140` minutes to `Average off-site wait` and `1` to `"120 or more"`, even though the patient never arrived.
* **Fix:** Keep `needs_reassessment`, `no_show`, and `unable_to_reach` in `Average off-site wait` and `Wait bands`, and update the label/subtitle to **"Average wait to recall (all recalled visits)"** so staff know it includes no-shows, unable-to-reach, and reassessments.

## 3. Starting at `triaged_at` when a `declined` visit can move to `waiting`

`triaged_at` is the **wrong start time for a pure off-site wait** because a patient can initially decline off-site waiting and switch to `waiting` much later.

* **Problem:** Because `offered_at` is saved in the same step as triage, measuring `called_at - triaged_at` counts every minute the patient spent waiting **on-site** in the physical waiting room before switching from `declined` to `waiting`, inflating the "off-site" average and shifting visits into higher wait bands.
* **Example visit:** `source: "desk"`, `ctas_level: 4`, `created_at: 2026-11-20T10:00:00-05:00`, `triaged_at: 2026-11-20T10:05:00-05:00`, `offered_at: 2026-11-20T10:05:00-05:00`, initially `status: "declined"`. The patient waits inside the ER until `11:20:00`, asks to wait off-site (`status` changes to `"waiting"`), and is recalled at `called_at: 2026-11-20T11:35:00-05:00` (`status: "called"`). Actual off-site wait was **15 minutes**, but `called_at - triaged_at` records **90 minutes** in the `"60 to 119"` band.
* **Fix:** Add an `offsite_started_at` column set to `now()` when a visit first enters `"waiting"` (leaving `triaged_at` and `offered_at` unchanged so `Offered` and `Accepted` dates do not shift), and measure `called_at - offsite_started_at`. If you prefer no schema change for the prototype, rename the metric to **"Average wait (triage to recall)"** and note that it includes any initial on-site wait after a `declined` switch.

## 4. Clarity of wait band edges, labels, and `"52 (7 visits)"`

The band cutoffs and display labels have two usability contradictions:

* **Problem A (Seconds-based bands contradict the rounded whole-minute average):** Definition 2 displays whole minutes (rounded), whereas Definition 3 bins by whole seconds (`< 1800`, `1800–3599`, `3600–7199`, `>= 7200`). Any visit between `29m 30s` and `29m 59s` (or `59m 30s` and `59m 59s`, or `119m 30s` and `119m 59s`) rounds up to `30`, `60`, or `120` in the average while landing in the band below (`under 30 min`, `30 to 59`, or `60 to 119`).
* **Example visit:** `source: "desk"`, `status: "called"`, `triaged_at: 2026-11-20T10:00:00-05:00`, `offered_at: 2026-11-20T10:00:00-05:00`, `called_at: 2026-11-20T10:29:45-05:00` (`1785` seconds = `29.75` min). On a day with one visit, `Average off-site wait` shows **`30 (1 visit)`** while the `Wait bands` show **`1` in `under 30 min`** and **`0` in `30 to 59`**.
* **Problem B (Missing `"min"` units):** `"52 (7 visits)"` has no unit, and three of the four band labels (`"30 to 59"`, `"60 to 119"`, `"120 or more"`) drop `"min"`. Staff glancing at `"120 or more"` or `"52 (7 visits)"` without explicit units have to infer whether numbers are minutes or hours (and whether `1` visit prints `"1 visit"` vs `"1 visits"`).
* **Fix:**
  * Format the average as **`"52 min (7 visits)"`** (with singular `"1 visit"`).
  * Put units on every band: **`"Under 30 min"`**, **`"30–59 min"`**, **`"60–119 min"`**, **`"120+ min"`** (or `"2+ hours"`).
  * Bin by the same rounded whole-minute integer (`round(seconds / 60)`: `< 30`, `30–59`, `60–119`, `>= 120`) so a single-visit average always agrees with its band—or, if keeping exact `< 1800` second boundaries, floor/truncate displayed minutes or clarify `"completed minutes"`.

## 5. Funnel screen line for a nurse reading it once

The current screen line (`"Each step counts the patients who reached that step today. A patient who was triaged yesterday and recalled today counts only in Recalled. So a step can be larger than the step above it."`) is **not clear enough for a single quick read**:

* **Problem:** At 36 words, it reads like a technical disclaimer and omits the **two most common reasons** a lower step exceeds the step above it: (1) desk visits enter at step 3 (`Triaged CTAS 4 or 5`), so step 3 routinely dwarfs steps 1 and 2; and (2) `Answered survey` counts any closed visit with a `survey_score`, including `removed` (`left` / `no_show`) and early walk-ins who were never recalled, so step 8 can exceed step 7 even with zero cross-midnight visits. Also, `"patients who reached that step today"` is slightly inaccurate for `Accepted`, which is `offered minus declined` on `offered_at`.
* **Example visits:**
  * Walk-in: `source: "desk"`, `ctas_level: 4`, `status: "waiting"`, `created_at: 2026-11-20T10:00:00-05:00`, `triaged_at: 2026-11-20T10:05:00-05:00`, `offered_at: 2026-11-20T10:05:00-05:00`. `Reached triage (from home)` stays `0`, while `Triaged CTAS 4 or 5` becomes `1`.
  * Left before recall: `source: "desk"`, `ctas_level: 5`, `status: "removed"`, `removed_reason: "left"`, `created_at: 2026-11-20T11:00:00-05:00`, `triaged_at: 2026-11-20T11:05:00-05:00`, `offered_at: 2026-11-20T11:05:00-05:00`, `called_at: null`, `arrived_at: null`, `closed_at: 2026-11-20T11:30:00-05:00`, `survey_score: 10`. `Recalled` and `Arrived after recall` stay `0`, while `Answered survey` becomes `1`.
* **Fix:** Label the block **"Today's steps"** instead of "Funnel", and replace the three-sentence note with a single 18-word line:
  > **"Each row counts visits hitting that step today (walk-ins join at Triaged), so lower rows can be larger."**

## 6. Keeping or leaving out today in the CSV

* **Reasons to leave today out (current choice):** Today's totals are incomplete and still shifting. Early in the day, cross-midnight recalls skew `average off-site wait` upward before new daytime visits are recalled, and exporting a partial day risks staff combining or comparing a 10-hour shift against full 24-hour days.
* **Reasons to keep today in (or problems caused by excluding it):**
  1. **Empty CSV on Day 1 or same-day demos:** On launch day—or whenever demo visits are created only today—there are no past dates, so clicking CSV download produces a header-only empty file even though today's dashboard shows active data.
  2. **Missing denominators in the CSV:** Neither the Past 7 days view nor the CSV includes `offered`, `recalled`, `arrived_after_recall`, or `survey_responses` counts, making it impossible for an analyst to tell if an average came from `1` visit or `30`, or to compute a weighted 7-day average. Also, exporting `"-"` for zero-denominator cells turns numeric columns into text in Excel/Sheets.
* **Example visit:** On launch day (`2026-11-20`), `source: "desk"`, `status: "arrived"`, `created_at: 2026-11-20T09:00:00-05:00`, `triaged_at: 2026-11-20T09:05:00-05:00`, `offered_at: 2026-11-20T09:05:00-05:00`, `called_at: 2026-11-20T10:00:00-05:00`, `arrived_at: 2026-11-20T10:12:00-05:00`, `closed_at: 2026-11-20T10:30:00-05:00`. It appears on Today's screen, yet the CSV downloads with `0` data rows.
* **Fix:** Keep today **out** of the default CSV, label the download **"Past 7 complete days (excludes today)"** with an on-screen message when `0` past days exist (or an optional `"Include today (incomplete)"` toggle for demos), use blank cells instead of `"-"` in CSV, and add the missing count columns (`offered`, `recalled`, `arrived_after_recall`, `survey_responses`).

## 7. Other wording or edge cases staff could misread

* **`accepted` (count) right next to `offered %` (percentage) in Past 7 days**
* **Problem:** The Past 7 days table puts `offered %` immediately before `accepted`, which is a raw count (`offered minus declined`). Seeing `20 | 75% | 12`, staff can easily read `12` as `12%` accepted instead of `12` visits (`80%` of the `15` offered).
* **Example visit:** On `2026-11-19`, out of `10` CTAS 4/5 visits, `8` are offered (`80%`) and `1` is `status: "declined"` (`triaged_at: 2026-11-19T14:00:00-05:00`, `offered_at: 2026-11-19T14:00:00-05:00`, `closed_at: 2026-11-19T14:00:00-05:00`). The table shows `10 | 80% | 7`, which looks like `80%` offered and `7%` accepted.
* **Fix:** Display both count and share consistently (e.g., `8 (80%)` for Offered, `7 (88%)` for Accepted) or add `%` / `(count)` to the column headers, and include separate count and percentage columns in the CSV.

* **`Past 7 days` column titled `triaged` hides that CTAS 1–3 are excluded**
* **Problem:** Step 3 of the Funnel specifies `Triaged CTAS 4 or 5`, whereas Past 7 days shortens the column header to `triaged`. Nurses will read `triaged` as total ER triages (CTAS 1–5) and think the counts are wrong.
* **Example visit:** `source: "home"`, `ctas_level: 3`, `status: "not_eligible"`, `created_at: 2026-11-19T15:00:00-05:00`, `triaged_at: 2026-11-19T15:15:00-05:00`, `offered_at: null`, `closed_at: 2026-11-19T15:15:00-05:00`. It counts in `Reached triage (from home)` but is excluded from `triaged` in Past 7 days.
* **Fix:** Label the column **`Triaged (CTAS 4–5)`** in both the Past 7 days view and the CSV (`triaged_ctas_4_5`).

* **`Average off-site wait` ignores patients who are still waiting off-site**
* **Problem:** Because only visits with `called_at` set enter the average, a backlog of patients still `waiting` for 3–4 hours does not raise `Average off-site wait`. A charge nurse checking whether to pause off-site waiting can misread a low completed-wait average as the current wait time.
* **Example visit:** Ten visits with `status: "waiting"`, `triaged_at: 2026-11-20T09:00:00-05:00`, `offered_at: 2026-11-20T09:00:00-05:00`, `called_at: null` have waited 4 hours by `13:00`; meanwhile one quick visit triaged at `12:40` and recalled at `12:55` (`status: "called"`) makes `Average off-site wait` read **`15 min (1 visit)`**.
* **Fix:** Label the metric **"Average wait to recall (recalled today)"** so staff know it measures completed waits only, and show the longest current wait among `status = waiting` alongside it if staff use the screen to decide on pausing.

* **`Average recall to arrival` and `Average off-site wait` sit side-by-side in Past 7 days using different date anchors**
* **Problem:** `Average off-site wait` counts on `called_at`, whereas `Average recall to arrival` counts on `arrived_at`—and neither column shows its visit count in Past 7 days. Staff comparing the two columns on a quiet night shift will see one column populated and the other showing `-`, or give a 1-visit outlier the same weight as a 25-visit day.
* **Example visit:** `source: "desk"`, `status: "arrived"`, `created_at: 2026-11-18T23:30:00-05:00`, `triaged_at: 2026-11-18T23:35:00-05:00`, `offered_at: 2026-11-18T23:35:00-05:00`, `called_at: 2026-11-18T23:55:00-05:00`, `arrived_at: 2026-11-19T00:05:00-05:00`. If this is the sole visit near midnight, `2026-11-18` shows `average off-site wait: 20` and `average recall to arrival: -`, while `2026-11-19` shows `average recall to arrival: 10` and `average off-site wait: -`.
* **Fix:** Show visit counts in parentheses in Past 7 days (matching Today's view) and add a short table note explaining that off-site wait is grouped by recall date while recall-to-arrival is grouped by arrival date.

* **Early returners (`arrived` with `called_at = null`) skip `Recalled` and `Arrived after recall` but still count in `Answered survey`**
* **Problem:** A patient who accepts off-site waiting and returns to the desk before being recalled (`status = arrived`, `called_at = null`) counts in `Accepted` and `Answered survey`, bypassing `Recalled` and `Arrived after recall`. Staff see a drop between `Accepted` and `Arrived after recall` (plus surveys exceeding `Arrived after recall`) and assume patients walked out.
* **Example visit:** `source: "desk"`, `ctas_level: 5`, `status: "arrived"`, `created_at: 2026-11-20T11:00:00-05:00`, `triaged_at: 2026-11-20T11:05:00-05:00`, `offered_at: 2026-11-20T11:05:00-05:00`, `called_at: null`, `arrived_at: 2026-11-20T11:30:00-05:00`, `closed_at: 2026-11-20T11:50:00-05:00`, `survey_score: 9`.
* **Fix:** Clarify the survey step as **"Answered survey (any ended visit)"** or note on the Funnel that patients who arrive before recall are excluded from `Arrived after recall`.

## Check of the response (Claude, 2026-11-20)

Facts read in this session:
- A survey is saved only when status is `arrived` and `closed_at` is set (`supabase/migrations/20261120000000_survey.sql:26-27`).
- A declined-to-waiting switch moves `offered_at` to the switch moment (`lib/switchToOffsite.ts:33`); the database requires `offered_at` after `triaged_at` for a switched visit (`20261119010000_declined_switch_checks.sql:58`).
- `home_reached_triage` counts on `created_at` in both the live count (`lib/dashboardNumbers.ts:107,152`) and the cleanup (`20261116110000_lock_key_and_cron_log_fix.sql:68`).
- No allowed step goes from `called` back to `waiting`.

Point by point:
- 1a (days before the new columns have 0 wait data): valid. Fix: one start date in lib/, days before it show "-" for the new numbers on screen and empty cells in the CSV. Owner decision on the note.
- 1b (Reached triage date): partly valid. Live and daily_stats agree (both on `created_at`), so no count drifts or drops. The funnel line is wrong for this step. Fix in wording, keep the rule (it is an existing SPEC number).
- 1c (survey on `closed_at`): valid but not new; SPEC line 112 already sets `closed_at`. No change.
- 1d (recalled with no triage time): valid as a consistency point. Fix: one filter for Recalled, the average and the bands: `called_at` and `offered_at` set. No new constraint in this plan.
- 1e (two reads around a cleanup run; open visits deleted at 24 hours): the first is valid but not new; it applies to every dashboard number today, and the next read 15 seconds later corrects it. Fix: a known-issues line, not a new database function now (owner decision). The second is an existing decision (`open_at_deletion`, hard rule 4). No change.
- 2 (keep all recalled visits): agreed. Label change, owner decision.
- 3 (wrong start after a declined switch): valid problem; Gemini's new column is not needed. Fix: measure `called_at` minus `offered_at`.
- 4A (seconds bands against a rounded average): valid. Fix: band by whole minutes rounded the same way as the average.
- 4B (units): valid. Fix: follow the existing SPEC style, minutes in the label ("Average minutes from offer to recall: 52 (7 visits)"), bands "Under 30 minutes", "30 to 59 minutes", "60 to 119 minutes", "120 minutes or more".
- 5 (funnel line): valid for desk visits and early arrivals. Not valid for the "left with a survey" example (only `arrived` visits can answer). Wording is an owner decision.
- 6 (CSV): valid. Fix: keep today out, a message when there are no past days, empty cells instead of "-", raw count columns next to each share and average.
- 7a (count next to a percent): valid. Fix: same form as Today, "8 of 10 (80%)".
- 7b (`triaged` header): valid. Fix: "Triaged CTAS 4 or 5".
- 7c (still-waiting patients not in the average): valid for the label. The longest current wait is a new number, not in this plan.
- 7d (counts and date anchors in the trend): valid. Fix: counts in brackets, one note line.
- 7e (early arrivals): valid; covered by the funnel wording.
