# QueueCare reference notes

What to reuse from QueueCare, and what to change, for the Virtual Waiting Room build.

- **Source:** https://github.com/iahmedmalik/QueueCare, commit `d1d686b35cc72e842a4a59a3e44ded0d92b95ff2` (2026-10-27), MIT license.
- **Checked against:** `SPEC.md` as of 2026-11-09 17:31. If SPEC.md changes again, re-check the sections marked **SPEC**.
- **Method:** the source was read only. Nothing from QueueCare was installed, built or run, and no QueueCare code has been copied into this project yet. This file describes patterns and points to QueueCare files. It contains no QueueCare code.
- **SPEC.md wins:** where this file and SPEC.md disagree, follow SPEC.md and update this file.

## 0. License rule (read before copying anything)

QueueCare is MIT-licensed. Whenever code is copied or closely adapted from it, whether a whole file, a function or a SQL block:

1. Put a header comment in the copied file:
   `// Adapted from QueueCare (https://github.com/iahmedmalik/QueueCare), Copyright (c) 2026 Ahmed Malik, MIT License. See THIRD_PARTY_NOTICES.md.`
   In SQL files, use `--` instead of `//`.
2. Create or update `THIRD_PARTY_NOTICES.md` at the project root with the full license text below, plus a list of the files that contain adapted code.
3. Mention it in the README's credits.

Ideas and patterns written fresh, such as "use a one-row signal table", need no notice. When unsure, add the notice.

```text
MIT License

Copyright (c) 2026 Ahmed Malik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 1. Patterns to reuse

| Pattern | QueueCare file | Use in this project |
|---|---|---|
| The public reads only through one database function that runs with elevated rights (`security definer`, `search_path = ''`) | `supabase/migrations/002_patient_status.sql` (`visit_status`) | The patient read function. See section 3. **SPEC rule 5** |
| One-row change signal plus a live-refresh component | `001_init.sql` (`queue_ticks`, `touch_queue_tick`), `src/components/LiveRefresh.tsx` | Required by **SPEC rule 5**. Changes listed in section 5 |
| Column grants: only listed columns can be inserted or updated, and timestamps come from the database | `001_init.sql` (`grant insert (...)`, `grant update (...)`) | Staff-side grants on `visits`. The database sets `triaged_at`, so nobody can backdate a triage time to jump the line |
| Internal functions locked down (`revoke execute ... from public, anon`) | end of `001_init.sql` | Every trigger and helper function |
| Staff roles in a `profiles` table, set only by an admin | `001_init.sql` (`profiles`, `app_role()`) | Staff login. Turn off public sign-ups in Supabase Auth, because this project has no patient accounts |
| Status guard on updates, to stop double clicks | `src/app/doctor/actions.ts` (`.eq("status","waiting")`, then "The queue just changed") | Call back, Mark arrived, confirming unable to reach, and all three patient functions |
| Three layers of access checks: `proxy.ts`, then `requireAccess()` on each page, then row-level security | `src/proxy.ts`, `src/lib/dal.ts` | `/staff`, `/dashboard`, demo mode. Next.js 16 renamed middleware to `proxy.ts`; confirm with context7 |
| Decisions as small pure functions with Vitest tests | `src/lib/*.ts` and `*.test.ts` | Line ordering, the no-response ladder (`ladderStep`), the wait range, the dashboard calculations |
| Security check script that signs in as each role and expects forbidden actions to fail | `scripts/check-security.mjs` | Evidence for SPEC rules 1, 4 and 5. Run it after Phases 2 and 3, alongside `/security-review` |
| Wait range: patients ahead × average of the last 5, shown as 80% to 125%, rounded to 5 minutes | `estimateWait` in `src/lib/priorityQueue.ts`, `src/lib/waitText.ts` | Replace "consultation length" with the average gap between the last 5 call-backs at the same site. Default 15 minutes until there is history. Simulated, per **SPEC rule 8** |
| Full-screen called alert with `role="alert"` | `src/app/status/[code]/page.tsx` (`case "called"`) | The "Please head back now" screen. Add the demo-limits notice from section 7 |
| Visit day fixed by a trigger in clinic time | `assign_token_number()` in `001_init.sql` | Use `America/Toronto` (**SPEC dashboard definitions**). QueueCare hardcodes `Asia/Karachi` |

## 2. Do not reuse

- **`patient_name`**: this project stores no names (SPEC rule 1).
- **Priority aging and booked head starts** (`effectiveLevel`, `BOOKED_HEAD_START_MINUTES`): the line here is ordered by `triaged_at` only, per site.
- **Hiding the footer on patient pages**: QueueCare's `SiteFooter.tsx` returns nothing on `/status/*`. Here, the footer and the 911 line appear on every page and in every state.
- **"Visits are never deleted"**: this project deletes visits after 24 hours (SPEC rule 4, section 6).
- **QueueCare's token generator**: `replace(gen_random_uuid()::text, '-', '')` gives 32 hex characters but only 122 random bits, because a version 4 UUID fixes 6 bits. **SPEC rule 1** requires at least 128 bits. See section 2a.
- **Token in the URL path** (`/status/<code>`): see section 2a.
- **The Pulse analytics, the `motion` animations and the separate doctor screen**: not needed. One nurse screen handles check-in and call-back.
- **`vercel.json` region `bom1` (Mumbai)**: set the region next to Supabase ca-central-1 (Montreal). Vercel's Montreal region should be `yul1`. **Unverified: check Vercel's region list before relying on it.** QueueCare measured live updates of 0.9 to 2.7 seconds before moving the server next to the database, and 0.8 to 0.9 seconds after. This decides the Phase 2 target of about 2 seconds.

### 2a. Access tokens (SPEC rule 1, data `access_token`)

The earlier recommendation to add a long secret beside the 6-character code is now part of the SPEC. Implementation notes:

- **Generate 128 bits:** use 16 random bytes encoded as base64url (22 characters).
  - In SQL: `extensions.gen_random_bytes(16)` from pgcrypto, which Supabase keeps in the `extensions` schema. Write the schema name out because `search_path = ''`. Then base64-encode, replace `+/` with `-_` and strip the `=` padding.
  - In Node: `crypto.randomBytes(16).toString('base64url')`.
  - Prefer a column default, so every way of creating a visit (desk, home, demo mode) gets a token.
- **Display code:** 6 characters from an alphabet without look-alike characters, unique among visits that still exist. Generate it with a retry on collision. It is not a secret and must never open a visit on its own, except through the rate-limited lookup.
- **Optional hardening:** store only a SHA-256 hash of the token (`access_token_hash`), so a database leak doesn't hand out working links. This is a new field, and SPEC says to explain any new field. Skip it if it adds friction.
- **Keep the token out of server logs and the Referer header.** Recommended: put it in the URL fragment (`/patient#t=<token>`), which browsers never send to the server.
  - The page reads the fragment, saves the token in `localStorage`, removes it from the address bar with `history.replaceState`, then calls the read function from the browser.
  - The trade-off: QueueCare's status page is a Server Component that receives the code in the path, and `LiveRefresh` calls `router.refresh()`. With the fragment approach, the patient page must fetch on the client and refetch when the signal fires (section 5).
  - Simpler fallback: keep the token in the path, add `Referrer-Policy: no-referrer` and `robots: noindex` (QueueCare already sets noindex), and accept that it appears in Vercel request logs.
- **Short-code lookup route** (SPEC rule 1: about 10 failed attempts per device per hour, revealing nothing about other visits):
  - Use a Next.js route handler (POST) on the server.
  - The handler calls a database function that only the server's secret key may execute (revoke it from `anon` and `authenticated`). Keep that key in Vercel environment variables, never in chat or client code.
  - The function returns the token for a matching live visit, or nothing.
  - On success, the handler returns the token and the page saves it like a QR scan.
  - On failure, it returns the same "Code not found" message every time. It never says "expired", "wrong site" or anything else that hints about other visits.
  - Count failures per device. A device is a random ID in an HTTP-only cookie plus a hash of the IP address, because a cookie alone can be cleared. Store the counts in a small `lookup_attempts` table (hashed key, hour window, count) and delete old rows in the cleanup job.
  - This adds a table, which SPEC says to raise first: it's needed for the rate limit, and it holds no visit data.

## 3. Patient read function (SPEC rule 5)

The function is something like `patient_visit(p_token)`. It runs with elevated rights, `anon` may execute it, and it reads `visits` by token.

- **Return only:** the display code, site, language, status, place in line, wait-range inputs, `called_at` (for "place held until [time]" and the ladder), `last_still_here_at` (for the 30-minute prompt), whether a survey score was already sent, and whether the visit is closed.
- **Do not return:** the CTAS level, `phone_attempts`, `review_flagged_at`, `removed_reason`, the token itself, or anything about other visits.
- **Work out the place in line inside the database:** count visits at the same site with `status = 'waiting'` and an earlier `triaged_at`, then add 1. Unlike QueueCare's `visit_status`, do not send the list of other waiting patients to the phone. QueueCare sends arrival times without names and works out the position on the phone; that reveals more than this SPEC allows.
- **Wait input:** return the site's recent average call-back gap (one number), not the individual times.
- **Wrong token:** return `null`, the same way QueueCare does.

## 4. The three patient write functions (SPEC rule 5)

Each is a separate elevated-rights function that `anon` may execute and that takes the token. Each is a single `update ... where <token matches> and <guard> returning` that returns true or false, so a stale tap does nothing. `anon` gets no table grants at all, so these functions are the only way patients change anything.

| Function | Guard (only when...) | Sets |
|---|---|---|
| `confirm_on_way(p_token)` | `status = 'called'` | `status = 'on_the_way'`, `confirmed_at = now()` |
| `still_here(p_token)` | `status = 'waiting'` | `last_still_here_at = now()` |
| `submit_survey(p_token, p_score)` | the visit is closed (`closed_at is not null`) and `survey_score is null`; `p_score` between 0 and 10 | `survey_score` |

Add a check constraint on `survey_score` (0 to 10) as a second guard.

**SPEC ambiguities to raise with Michael before Phase 2:**

1. **Starting a visit from home is a fourth patient write.** The start page lets anyone create a visit, but rule 5 says patients change exactly three things. Suggested reading: creating a visit is not changing an existing one. Do it through a server route (`start_visit`) that inserts with fixed values (`source = 'home'`, `status = 'pre_arrival'`) and is rate-limited like the short-code lookup, so the line can't be flooded. The 6-hour cleanup removes visits that never arrive. Confirm before building.
2. **Who sets `closed_at`, and in which statuses?** Suggested: staff actions that end the visit (arrived, removed, unable_to_reach confirmed, declined, not_eligible) set `closed_at` in the same update. The survey then appears for any closed visit. Confirm whether declined or not-eligible patients should get the survey.
3. **"I'm on my way", then no arrival:** `on_the_way` has no follow-up rule in the SPEC. Should the ladder continue, or should staff get a flag after a set time?

## 5. Change signal and live refresh (SPEC rule 5)

- **Copy the one-row `queue_ticks` table and its trigger** (with the MIT header).
- **Fire the trigger on `insert or update or delete`.** QueueCare only uses `insert or update` because it never deletes.
- **Optional:** make the signal one row per site (`id` = site). The patient page can then ignore changes at the other site. This is still no visit data.
- **Staff screens** may also listen to `visits` directly, as QueueCare does, because row-level security still applies. Patient pages must listen only to the signal and then call the read function again.
- **The ladder doesn't change the database at 10 and 20 minutes,** so no signal fires then. Both screens run a 1-second timer and call a pure function, `ladderStep(called_at, confirmed_at, now, settings)`, to show the current step.
- **Keep QueueCare's safety net:** refresh after a reconnect and every 30 seconds.
- **If the token is in the fragment** (section 2a), replace `router.refresh()` with a client-side call to the read function.

## 6. No-response ladder and nurse review (SPEC /staff)

**Superseded:** my earlier advice was to have a scheduled job set `unable_to_reach` automatically at 30 minutes, and to show staff "Record per hospital policy (usually left without being seen)". Both are now wrong. The SPEC says:

- **At the 30-minute step,** the visit is **flagged "Review: unable to reach" and stays in the line**. Nothing leaves the line automatically.
- **A nurse confirms.** Only then does the status become `unable_to_reach`, and the visit leaves the active line.
- **The app records nothing as "left without being seen"** and gives no wording about it. Staff follow hospital policy outside the app.

Implementation:

- **`review_flagged_at`** is written once, and is never cleared by the flag step itself: `update ... set review_flagged_at = now() where status = 'called' and confirmed_at is null and review_flagged_at is null and called_at <= now() - <threshold>`.
  - **Option A (simpler, recommended for the demo):** the staff screen runs this through a server action whenever its timer finds an overdue visit. The update runs only once per visit, so several open staff screens can't double-flag. The threshold comes from the same settings file the pure `ladderStep` uses, so the 10/20/30-minute times stay one setting that can be shortened for testing.
  - **Option B:** a `pg_cron` job every minute. The SQL can't read the app's settings file, so the times would need a one-row settings table. That is a new table; raise it first.
- **The nurse's "Confirm unable to reach" button** is a staff server action with a guard: `where status = 'called' and review_flagged_at is not null`. It sets `status = 'unable_to_reach'` and `closed_at`, and nothing about left without being seen. If the patient confirmed in the meantime, the status guard fails and the screen says the visit changed.
- **Reopening:** `unable_to_reach` → `needs_reassessment` (staff action with a status guard). Decide whether reopening clears `closed_at`.
- **Simulated phone calls:** "Phoned, answered" and "Phoned, no answer" increment `phone_attempts`. That is a staff-only column; add it to the staff update grant, never to anything a patient can call. **SPEC ambiguity:** should "answered" pause the ladder or clear the flags? The SPEC stores only a count, so whether the call was answered is not saved.
- **The place-held time on the patient screen** is `called_at` plus the 30-minute setting, worked out by the same pure function.
- **Tests:** unit-test `ladderStep` at 0, 9, 10, 19, 20, 29 and 30 minutes, with and without `confirmed_at`, and with shortened settings.

## 7. Phone alerts: what the demo can and can't do (SPEC /patient)

- **Say it on screen:** alerts work only while the page is open and the phone is unlocked. Never claim the app can wake a locked phone.
- **Sound:** browsers block audio until the user has tapped the page. Unlock audio on the first tap (for example the language or "I'm still here" button), and show a visual alert even if sound fails.
- **Vibration:** iOS Safari does not support the Vibration API, as far as I know. **Verify on a real iPhone.** Treat vibration as a bonus on Android only.
- **Optional:** the Screen Wake Lock API can keep the screen on while waiting, where supported. Mention the battery cost.
- **QueueCare has none of this:** its called screen is visual only. Its full-screen green `role="alert"` pattern is still a good base.

## 8. Daily stats and the 24-hour deletion (SPEC rule 4, `daily_stats`)

QueueCare never deletes visits, so it has no pattern for this. Design:

- **One scheduled job** (`pg_cron`, every 15 minutes), in one transaction:
  1. Roll up every finished Toronto day (before today) that isn't yet in `daily_stats`.
  2. Delete visits older than 24 hours.
  3. Delete expected arrivals (`pre_arrival`) older than 6 hours.
  4. Delete old `lookup_attempts` rows.
- **Why this order works:** a day's earliest visits turn 24 hours old just after the next midnight, and the rollup in the same run happens first, so nothing is deleted before it is counted.
- **Each number is counted on the date of its own event,** following the SPEC definitions: `offered_at`, `triaged_at`, `arrived_at`, the survey time and so on, all in Toronto time. A visit can count on two different days.
  - The SPEC has no survey timestamp, only `survey_score`. Either add `survey_at` (a new field; explain why) or count a survey on the date of `closed_at`. **Ask.**
- **Store sums and counts, not averages:** for example the sum of call-back-to-arrival minutes plus the count of such visits, and the sum of survey scores plus the count of responses and the count scoring 9 or 10. Averages can't be combined later; sums can. "One total per dashboard number" means each numerator and denominator is a column.
- **Keep demo data separate:** the SPEC says demo visits count only in demo mode. Make `is_demo` part of the `daily_stats` key (`day, site, is_demo`), or don't roll up demo visits at all. This is a new field; raise it first.
- **No codes, tokens or single-visit times** in `daily_stats` (SPEC rule 4).
- **The dashboard reads live `visits` for today** and `daily_stats` for earlier days. Unit-test both with the same pure functions.

## 9. Lessons from QueueCare's `docs/lessons-learned.md` that apply here

- **A code review found the worst bug, not a test:** a failed registration left the previous patient's QR code on screen. Test what the screen shows after a failure that follows a success, especially on the staff check-in screen.
- **Deploy early and measure the live site** against the 2-second target before Phase 3.
- **Plan test data from the start:** `is_demo`, a clear-demo button and test cleanup. QueueCare's parallel tests polluted its shared demo queue.
- **Read the defaults:** for example, Supabase `signOut()` signs out every device unless told otherwise. That matters for shared staff demo accounts.
- **QueueCare's `docs/`** (BRD, PRD, test plan, test report, pilot plan) are good models for the course write-up.

## 10. Open items

- [ ] Confirm the Vercel Montreal region ID (`yul1`?) and set it in `vercel.json`.
- [ ] Michael: answer the SPEC ambiguities in sections 4, 6 and 8 (`start_visit` as a fourth write, who sets `closed_at`, the `on_the_way` follow-up, "Phoned, answered", a survey timestamp, `is_demo` in `daily_stats`).
- [ ] Decide between a token in the URL fragment and one in the path (section 2a).
- [ ] Decide between Option A and Option B for writing the 30-minute review flag (section 6).
- [ ] Approve or reject the new tables and fields: `lookup_attempts`, optional `access_token_hash`, `daily_stats.is_demo`, optional settings table.
- [ ] Verify vibration and sound behaviour on a real iPhone and a real Android phone.
