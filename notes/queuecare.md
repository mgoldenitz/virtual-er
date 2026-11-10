# QueueCare reference notes

What to reuse from QueueCare, and what to change, for the Virtual Waiting Room build.

- **Source:** https://github.com/iahmedmalik/QueueCare, commit `d1d686b35cc72e842a4a59a3e44ded0d92b95ff2` (2026-10-27), MIT license.
- **Checked against:** `SPEC.md` as committed in `bc69eab` ("Update the spec and agent rules", 2026-11-09). If SPEC.md changes again, compare it with that commit (`git diff bc69eab -- SPEC.md`) and re-check the sections marked **SPEC**.
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
| The public reads only through database functions that run with elevated rights (`security definer`, `search_path = ''`) | `supabase/migrations/002_patient_status.sql` (`visit_status`) | The patient read function (section 3) and the public pause check (section 4). **SPEC rule 5** |
| One-row change signal plus a live-refresh component | `001_init.sql` (`queue_ticks`, `touch_queue_tick`), `src/components/LiveRefresh.tsx` | Required by **SPEC rule 5**. Changes listed in section 5 |
| Column grants: only listed columns can be inserted or updated, and timestamps come from the database | `001_init.sql` (`grant insert (...)`, `grant update (...)`) | Staff-side grants on `visits` and `site_settings`. The database sets `triaged_at`, so nobody can backdate a triage time to jump the line |
| Internal functions locked down (`revoke execute ... from public, anon`) | end of `001_init.sql` | Every trigger and helper function, including the rollup trigger (section 8) |
| Staff roles in a `profiles` table, set only by an admin | `001_init.sql` (`profiles`, `app_role()`) | Staff login. Turn off public sign-ups in Supabase Auth, because this project has no patient accounts |
| Status guard on updates, to stop double clicks | `src/app/doctor/actions.ts` (`.eq("status","waiting")`, then "The queue just changed") | Call back, Mark arrived, confirming unable to reach, reopening, the pause switch, and all patient functions |
| Three layers of access checks: `proxy.ts`, then `requireAccess()` on each page, then row-level security | `src/proxy.ts`, `src/lib/dal.ts` | `/staff`, `/dashboard`, demo mode. Next.js 16 renamed middleware to `proxy.ts`; confirm with context7 |
| Decisions as small pure functions with Vitest tests | `src/lib/*.ts` and `*.test.ts` | Line ordering, the follow-up steps (`followupState`, section 6), the wait range, the dashboard calculations, the daily_stats contribution. CLAUDE.md puts these in `lib/` |
| Security check script that signs in as each role and expects forbidden actions to fail | `scripts/check-security.mjs` | Evidence for SPEC rules 1, 4 and 5. Run it after Phases 2 and 3, alongside `/security-review` |
| Wait range: patients ahead × average of the last 5, shown as 80% to 125%, rounded to 5 minutes | `estimateWait` in `src/lib/priorityQueue.ts`, `src/lib/waitText.ts` | SPEC measures the wait from triage until a doctor sees the patient. Use the average gap between the last 5 call-backs at the same site, with a default of 15 minutes until there is history. Simulated, per **SPEC rule 8** |
| Full-screen called alert with `role="alert"` | `src/app/status/[code]/page.tsx` (`case "called"`) | The "Please head back now" screen. Add the demo-limits notice and the rule 9 requirements from section 7 |
| Visit day fixed by a trigger in clinic time | `assign_token_number()` in `001_init.sql` | Use `America/Toronto` (**SPEC dashboard definitions**). QueueCare hardcodes `Asia/Karachi` |

## 2. Do not reuse

- **`patient_name`**: this project stores no names (SPEC rule 1).
- **Priority aging and booked head starts** (`effectiveLevel`, `BOOKED_HEAD_START_MINUTES`): the line here is ordered by `triaged_at` only, per site.
- **Hiding the footer on patient pages**: QueueCare's `SiteFooter.tsx` returns nothing on `/status/*`. Here, the footer and the 911 line appear on every page and in every state.
- **"Visits are never deleted"**: this project deletes visits after 24 hours and keeps only totals (SPEC rule 4, section 8).
- **QueueCare's token generator**: `replace(gen_random_uuid()::text, '-', '')` gives 32 hex characters but only 122 random bits, because a version 4 UUID fixes 6 bits. **SPEC rule 1** requires at least 128 bits. See section 2a.
- **Token in the URL path** (`/status/<code>`): see section 2a.
- **The Pulse analytics, the `motion` animations and the separate doctor screen**: not needed. One nurse screen handles check-in and call-back.
- **`vercel.json` region `bom1` (Mumbai)**: set the region next to Supabase ca-central-1 (Montreal). Vercel's Montreal region should be `yul1`. **Unverified: check Vercel's region list before relying on it.** QueueCare measured live updates of 0.9 to 2.7 seconds before moving the server next to the database, and 0.8 to 0.9 seconds after. This decides the Phase 2 target of about 2 seconds.

### 2a. Access tokens and the short code (SPEC rule 1)

- **Only staff can look up a visit by its short code**, on `/staff`, behind login. Patients open a visit only with the token: the link saved on the phone, or the QR code or written-out link on a desk slip. Typing the short code on `/patient` does nothing.
  - *Superseded:* an earlier version of these notes described a public, rate-limited short-code lookup with a `lookup_attempts` table. It is no longer needed.
- **Generate at least 128 bits.** The written-out link on the desk slip must be typeable, so prefer a case-insensitive alphabet:
  - **Recommended:** 16 random bytes in Crockford base32. That gives 26 characters with no look-alike letters, it works in upper or lower case, and it can be printed in groups of 4 or 5 for easier typing. Grouping is a display choice; strip the spaces or hyphens before checking. It meets SPEC's "22 or more random URL-safe characters".
  - **Alternative:** base64url (22 characters). Shorter, but it mixes upper and lower case and uses `-` and `_`, which makes it hard to type from paper.
  - In Node: `crypto.randomBytes(16)`, then encode. In SQL: `extensions.gen_random_bytes(16)` from pgcrypto, which Supabase keeps in the `extensions` schema. Write the schema name out because `search_path = ''`.
  - Prefer one generator used by every way of creating a visit (desk, home, demo mode).
- **Display code:** 6 characters from an alphabet without look-alike characters, unique among visits that still exist. Generate it with a retry on collision. It is not a secret.
- **Optional hardening:** store only a SHA-256 hash of the token (`access_token_hash`), so a database leak doesn't hand out working links. This is a new field, and SPEC says to explain any new field. One catch: staff re-show the QR code from `/staff` when a scan fails (SPEC /patient). With only a hash stored, the QR can't be shown again. You would have to issue a new token, which breaks the old link. So skip hashing unless you choose to reissue.
- **Keep the token out of server logs and the Referer header.** Recommended: put it in the URL fragment (`/patient#t=<token>`), which browsers never send to the server. This works for scanned and hand-typed links alike.
  - The page reads the fragment, saves the token in `localStorage`, removes it from the address bar with `history.replaceState`, then calls the read function from the browser.
  - The trade-off: QueueCare's status page is a Server Component that receives the code in the path, and `LiveRefresh` calls `router.refresh()`. With the fragment approach, the patient page must fetch on the client and refetch when the signal fires (section 5).
  - Simpler fallback: keep the token in the path, add `Referrer-Policy: no-referrer` and `robots: noindex` (QueueCare already sets noindex), and accept that it appears in Vercel request logs.

## 3. Patient read function (SPEC rule 5)

The function is something like `patient_visit(p_token)`. It runs with elevated rights, `anon` may execute it, and it reads `visits` by token.

- **Return only what the patient screen needs:**
  - the display code, site, language and status
  - the place in line and the wait-range input
  - `called_at`, for the follow-up steps on the patient screen
  - `last_still_here_at`, for the 30-minute prompt
  - whether `seen_at` is already set, so the page doesn't call the seen function twice
  - whether the visit is closed, and whether a survey can still be sent (section 4)
- **Do not return:** the CTAS level, `phone_attempts`, `last_phone_result`, `followup_paused_until`, `review_flagged_at`, `removed_reason`, the token itself, or anything about other visits.
- **Work out the place in line inside the database:** count visits at the same site with `status = 'waiting'` and an earlier `triaged_at`, then add 1. Unlike QueueCare's `visit_status`, do not send the list of other waiting patients to the phone. QueueCare sends arrival times without names and works out the position on the phone; that reveals more than this SPEC allows. The screen always shows "Your place can change if more urgent patients arrive" under the position (SPEC /patient).
- **Wait input:** return the site's recent average call-back gap (one number), not the individual times.
- **Wrong token:** return `null`, the same way QueueCare does.

## 4. The five patient actions (SPEC rule 5)

`anon` gets no table grants at all. These five are the only ways a patient changes anything. Each database function takes the token, runs with elevated rights and is a single `update ... where <token matches> and <guard> returning`. It returns true or false, so a stale tap does nothing.

| Action | Kind | Guard (only when...) | Sets |
|---|---|---|---|
| Start a visit from home | **Server route** (POST), rate-limited | the chosen site's `site_settings.offsite_paused` is false | inserts a visit with `source = 'home'` and `status = 'pre_arrival'` set by the route, never by the browser. No place in line: `triaged_at` stays empty |
| `mark_seen(p_token)` | function | `status = 'called'` and `seen_at is null` | `seen_at = now()` |
| `confirm_on_way(p_token)` | function | `status = 'called'` | `status = 'on_the_way'`, `confirmed_at = now()` |
| `still_here(p_token)` | function | `status = 'waiting'` | `last_still_here_at = now()` |
| `submit_survey(p_token, p_score)` | function | `closed_at is not null`, `survey_score is null`, the visit waited off-site and arrived, and `p_score` is between 0 and 10 | `survey_score` |

Notes:

- **The start-from-home route** calls a database function that only the server's secret key may execute (revoke it from `anon` and `authenticated`). Keep that key in Vercel environment variables, never in chat or client code.
  - The route returns the new token and display code, and the page saves them as a QR scan would.
  - When the site is paused, it refuses with the SPEC wording: "Off-site waiting is paused right now. Please come to the emergency department and wait there."
- **The start-from-home rate limit** needs somewhere to count attempts per device: a random ID in an HTTP-only cookie plus a hash of the IP address, per hour. That means a small `start_attempts` table (hashed key, hour window, count), cleaned up by the deletion job. It holds no visit data. This is a new table, and SPEC says to raise it first.
  - A simpler alternative: cap new home visits per site per hour in the database, which needs no new table. That limits flooding but can also block real users during a burst.
- **Public pause check:** the start page must know whether a site is paused before showing "Start a visit". `site_settings` is staff only (SPEC data), so add a small public function, `offsite_paused(p_site)`, that returns only true or false. This is a read, not one of the five patient actions. The start-from-home route checks again on the server, because the page may be stale.
- **`mark_seen` means only that the screen was displayed** in an open browser. It does not mean the patient read it. Staff still wait for "On the way" and arrival (SPEC /patient). The staff list shows "Seen" separately from "On the way".
- **"Waited off-site and arrived" for the survey:** use `status = 'arrived' and triaged_at is not null and called_at is not null`. Only off-site visits are ever called back, so this rules out declined, not-eligible, removed and unable-to-reach visits. A reopened visit (`needs_reassessment`) gets no survey unless it later reaches `arrived`.
- **Add a check constraint** on `survey_score` (0 to 10) as a second guard.
- **Resolved by SPEC since the last notes:** starting from home is now a counted patient action; `closed_at` is set by staff actions that end virtual waiting (arrived, removed, unable_to_reach confirmed, declined, not_eligible); a reopen clears it.

## 5. Change signal and live refresh (SPEC rule 5)

- **Copy the one-row `queue_ticks` table and its trigger** (with the MIT header).
- **Fire the trigger on `insert or update or delete`.** QueueCare only uses `insert or update` because it never deletes. Also fire it when `site_settings` changes, so the start page and the staff pause banner update live.
- **Optional:** make the signal one row per site (`id` = site). The patient page can then ignore changes at the other site. This is still no visit data.
- **Staff screens** may also listen to `visits` directly, as QueueCare does, because row-level security still applies. Patient pages must listen only to the signal and then call the read function again.
- **Time-based steps don't change the database,** so no signal fires for them. Both screens run a 1-second timer and call the pure `followupState` function (section 6).
- **Keep QueueCare's safety net:** refresh after a reconnect and every 30 seconds.
- **If the token is in the fragment** (section 2a), replace `router.refresh()` with a client-side call to the read function.

## 6. Follow-up steps and nurse review (SPEC /staff)

**Superseded:** my first advice was to set `unable_to_reach` automatically at 30 minutes, with a "left without being seen" note. Both are wrong. Nothing leaves the line automatically, and the app records nothing as left without being seen; staff follow hospital policy outside the app.

**One pure function decides what both screens show:**
`followupState({ called_at, seen_at, confirmed_at, last_phone_result, followup_paused_until, review_flagged_at }, now, settings)`. Put it in `lib/` with tests. Every time is a setting so it can be shortened for testing; the values are demo placeholders.

| Time since `called_at` | Condition | Staff screen | Patient screen |
|---|---|---|---|
| 0 | not confirmed | "Called" (then "Seen" once `seen_at` is set) | called alert |
| 10 min | not confirmed, not paused | flag "Phone this patient" | second alert |
| 20 min | not confirmed, not paused | flag "Phone a second time" | "Please return now. Staff will review your visit if you do not respond." |
| 30 min | not confirmed, **no answered call** | flag "Review: unable to reach" (visit stays in line) | same as 20 min |
| 30 min | not confirmed, **an answered call** | flag "Contacted, not yet arrived", **never** "Review: unable to reach" | same as 20 min |
| `confirmed_at` + 30 min (setting) | on the way, not arrived | flag "On the way, not arrived"; never removed automatically | on-the-way screen |

**Phone results:**
- "Phoned, answered" and "Phoned, no answer" are staff buttons. Both increment `phone_attempts` and set `last_phone_result`.
- "Answered" also clears the phone flag and sets `followup_paused_until = now() + 10 min` (a setting).
- While paused, no new phone flag is raised. When the pause ends, the steps continue from the time elapsed since `called_at`; they don't restart. If the 20-minute mark passed during the pause, the "Phone a second time" flag appears as soon as the pause ends.
- These columns are staff-only. Add them to the staff update grant, never to anything a patient can call.

**`review_flagged_at` is written once:**
`update ... set review_flagged_at = now() where status = 'called' and confirmed_at is null and review_flagged_at is null and (last_phone_result is distinct from 'answered') and called_at <= now() - <threshold>`
- **Option A (recommended for the demo):** the staff screen runs this through a server action when its timer finds an overdue visit. The update runs only once per visit, so several open staff screens can't double-flag. The threshold comes from the same settings file as `followupState`.
- **Option B:** a `pg_cron` job every minute. The SQL can't read the app's settings file, so the times would need a settings table. That is a new table; raise it first.

**Nurse actions:**
- **Confirm unable to reach** (a staff server action) has the guard `where status = 'called' and review_flagged_at is not null`, and sets `status = 'unable_to_reach'` and `closed_at`. If the patient confirmed in the meantime, the guard fails and the screen says the visit changed.
- **Reopen** has the guard `where status = 'unable_to_reach'`, and sets `status = 'needs_reassessment'` and `closed_at = null` (SPEC).
- **Pause off-site waiting** (per site, with a confirmation step, and a second confirmation to turn it off) updates `site_settings`. Visits already waiting keep working. The staff list shows a banner asking staff to check every outstanding call-back and offer on-site waiting, and check-in offers on-site waiting only.

**Tests:** cover `followupState` at 0, 9, 10, 19, 20, 29 and 30 minutes, with and without `confirmed_at`, with an answered call before 10 minutes, an answered call before 30 minutes, a pause that spans the 20-minute mark, and shortened settings.

## 7. Phone alerts and accessibility (SPEC /patient, rule 9)

- **Say it on screen:** alerts work only while the page is open and the phone is unlocked. Never claim the app can wake a locked phone.
- **Sound:** browsers block audio until the user has tapped the page. Unlock audio on the first tap (for example the language or "I'm still here" button). Rule 9 says never rely on sound or colour alone, so every alert also appears as words.
- **Vibration:** iOS Safari does not support the Vibration API, as far as I know. **Verify on a real iPhone.** Treat vibration as a bonus on Android only.
- **Live regions:** use one polite live region for status changes and an assertive one for the call-back ("You have been called back"). Never put the wait range or a countdown inside a live region, or it will be read out every second.
- **QueueCare's called screen** turns the whole screen green with `role="alert"`, which counts as assertive. Fine for the call-back, but make sure it fires once, not on every refresh. The green colour alone isn't enough; the words carry the message.
- **Rule 9 checklist:**
  - touch targets of at least 24 by 24 CSS pixels
  - visible focus
  - contrast
  - 200% text size
  - reflow at 320 CSS pixels wide with no sideways scrolling
  - keyboard access on `/staff`, including the QR scanner, which needs a "type the code" fallback (SPEC already has one)
  - Run an automated check (for example axe through Playwright) in Phase 3; it catches only part of it, so also check by hand.
- **Optional:** the Screen Wake Lock API can keep the screen on while waiting, where supported. Mention the battery cost.

## 8. Daily stats and the 24-hour deletion (SPEC rule 4)

QueueCare never deletes visits, so it has no pattern for this. SPEC now says: add each visit's contribution just before it is deleted, count each number on the date of its own event, and do not use a once-a-night summary job.

*Superseded:* an earlier version of these notes suggested a job that totals each finished day. Don't build that.

- **Recommended: a row-level `before delete` trigger on `visits`** that adds the visit's contribution to `daily_stats`. Every deletion then counts, whether from the 24-hour job, the 6-hour expected-arrival cleanup or anything else, and the count can't be forgotten. Make the trigger function internal (revoke execute).
- **One pure contribution function** (in `lib/`, tested) decides which totals a visit adds to and on which date. The SQL trigger must follow the same rules. Copy QueueCare's idea of a security script that compares the two: run the TypeScript function and the SQL on the same test visits and check they agree.
- **Event dates, from the SPEC dashboard definitions,** in America/Toronto:
  - offered on `offered_at`
  - triaged CTAS 4 or 5 on `triaged_at`
  - call-back-to-arrival minutes on `arrived_at`
  - started from home on `created_at`; "of those, arrived at triage" also on `created_at`, since it is a share of that day's home visits
  - no-show and unable to reach on `closed_at`
  - surveys on `closed_at`
  - not-eligible and declined don't have their own timestamp. Use `closed_at`, which the same staff action sets. **Confirm with Michael.**
  - A visit can add to two different days; insert or upsert one `daily_stats` row per (day, site, is_demo).
- **Store sums and counts, not averages:** for example the sum of call-back-to-arrival minutes plus the count, and the sum of survey scores plus the count of responses and the count scoring 9 or 10. Averages can't be combined; sums can.
- **Key (day, site, is_demo):** SPEC now includes `is_demo`. Demo mode's "clear all demo data" deletes demo visits first (the trigger adds their totals), then deletes the demo `daily_stats` rows, in one transaction.
- **The dashboard for a day** shows the `daily_stats` totals plus the visits still in `visits` for that day. "Waiting off-site now" and "called but not arrived" come from live visits only.
- **Deletion job:** `pg_cron` every 15 minutes. It deletes visits whose `created_at` is older than 24 hours, `pre_arrival` visits older than 6 hours, and old `start_attempts` rows if that table exists. It is a deletion job, not a nightly summary, so it fits rule 4.
- **Edge case to raise:** a visit still open (waiting or called) at 24 hours would be deleted mid-visit. Unlikely in a demo; ask whether to skip open visits until they close.
- **No codes, tokens or single-visit times** in `daily_stats`.

## 9. Lessons from QueueCare's `docs/lessons-learned.md` that apply here

- **A code review found the worst bug, not a test:** a failed registration left the previous patient's QR code on screen. Test what the screen shows after a failure that follows a success, especially on the staff check-in screen and the start-from-home route.
- **Deploy early and measure the live site** against the 2-second target before Phase 3.
- **Plan test data from the start:** `is_demo`, a clear-demo button and test cleanup. QueueCare's parallel tests polluted its shared demo queue.
- **Read the defaults:** for example, Supabase `signOut()` signs out every device unless told otherwise. That matters for shared staff demo accounts.
- **QueueCare's `docs/`** (BRD, PRD, test plan, test report, pilot plan) are good models for the course write-up.

## 10. Open items

- [ ] Confirm the Vercel Montreal region ID (`yul1`?) and set it in `vercel.json`.
- [ ] Michael: pick the token format for the typed link: base32 with 26 characters (recommended) or base64url with 22 (section 2a).
- [ ] Michael: token in the URL fragment (recommended) or in the path (section 2a).
- [ ] Michael: rate limit for starting from home, with a `start_attempts` table or a per-site hourly cap (section 4).
- [ ] Michael: Option A or Option B for writing the 30-minute review flag (section 6).
- [ ] Michael: which date counts not-eligible and declined, `closed_at` or another (section 8)?
- [ ] Michael: should the 24-hour deletion skip visits that are still open (section 8)?
- [ ] Verify vibration and sound on a real iPhone and a real Android phone.
