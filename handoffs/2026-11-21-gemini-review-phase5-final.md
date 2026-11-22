# Gemini review: Phase 5 final security, privacy, accessibility and code-quality review

Model: Gemini Hydrogen 4, High. Use 3 new chats, one for each part below, so that no chat checks its own work from memory. Find problems; do not confirm. (If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.)

Why 3 chats: the first Phase 5 code review upload stopped after about half of a 10527-line bundle. The database review bundle (5383 lines) came through complete. Each bundle here is 5700 lines or less.

For each chat, give it two things: the "Shared context" section plus that part's section (from its "Questions" to its "Not checked"), and that part's bundle file as an attachment. The bundles are not in git.

## Shared context

A concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, Supabase with row-level security, Vercel). Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Patients have no account: a long random token in the link (`#t=...`) opens one visit. Staff sign in. Synthetic data only, no hospital systems. The owner is new to coding, so the code must stay readable for a beginner.

Each file in the bundle starts with a line `===== FILE: path =====`. `SPEC.md` is first: its "hard rules" always win.

Settled, please do not report:

- Anything that `docs/decisions.md` lists as decided, or that `docs/known-issues.md` lists as a known limit, unless you show that the decision or the note is wrong in the code. (The accessibility bundle has no `decisions.md`; there, only `known-issues.md` applies.)
- Hosting limits that the owner chose: Vercel Hobby (no firewall rule), Supabase free plan.
- The French, Urdu, Arabic and Mandarin text: a fluent human reviews those.

Before your list, say which files you could not read or that stop early in the attachment. Put the faults in order, most serious first. For each fault, give the file and line, the steps or data that cause it, and the wrong result. If you are not sure of a fault, say so and say what would prove it.

## Part 1: security and privacy

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-1-security-bundle.txt` (87 files, 5700 lines, about 344 KB): `SPEC.md`, `docs/decisions.md`, `docs/known-issues.md`, `.env.example`, `package.json`, `next.config.ts`, `vercel.json`, `proxy.ts`, `supabase/checks/permissions.sql`, all of `supabase/migrations/`, `app/api/`, `data/`, `scripts/`, and the `lib/` files that check callers, tokens, staff access, the cron secret, analytics privacy and the AI summary.

### Questions

1. Access: can a patient (the `anon` role, with or without a token) read or change a visit that is not theirs, read any staff-only data, or call a function that is meant for staff? Can a signed-in user who is not staff do a staff action? Follow each RPC and policy in the migrations, in order, to its final form.
2. Tokens and codes: is any token or visit code guessable, logged, sent to a third party (Vercel Analytics, Pushover, the AI summary), kept in a page address that is sent in a `Referer`, or kept longer than SPEC.md allows?
3. API routes (`app/api/`): for each route, who can call it, what it checks first, and what it gives back on a fault. Is there a route that leaks a database error, a key, or patient data?
4. Privacy: does any data leave the app (analytics, Pushover, logs, the AI summary prompt) with more than SPEC.md allows? Does the old-visit delete remove everything it should?
5. A SPEC hard rule that the code breaks: give the rule number and the line.

Mark each fault "access", "token", "api", "privacy" or "rule". Report a hardening idea only after the faults, under its own heading, and say how much it helps.

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass. `npm run lint`: exit 0. `npm run build`: passed (2026-11-21, after `3c034a2`; later commits change only docs and the run skill).
- GitHub checks (test, lint, build) passed on `ca9cf88` (run 44944146594).
- `supabase/checks/permissions.sql` gave this live result on 2026-11-20 (docs/progress.md): 17 rows plus `rls_auto_enable` for 2 roles, no table without RLS.
- Earlier reviews: Phase 2 security and architecture (2026-11-10), the Phase 5 code review and the Phase 5 database review (2026-11-21). Their fixes are in the code.

### Not checked

- No test with a signed-in user who is not staff against the live database in this session.
- `/api/keep-alive` on Vercel: the owner has not confirmed a 200 in the Vercel logs yet.
- No load test of the start route (rate limits).

## Part 2: accessibility

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-2-access-bundle.txt` (75 files, 5358 lines, about 263 KB): `SPEC.md`, `docs/known-issues.md`, the English text (`lib/text/en.ts` and the language helpers), `lib/contrast.ts`, `lib/textSize.ts`, `lib/rowFocus.ts`, all screens in `app/` (not `app/api/`) and all of `components/`.

### Questions

1. WCAG 2.2 AA: for each screen (start page, patient screen, staff list, staff sign-in, dashboard), what fails? Look at focus order and focus after a screen change, live regions (`role="alert"`, `aria-live`), labels and names for controls, target size (24 by 24 px at least), text size and zoom to 200%, colour contrast, and motion.
2. A screen reader user on a phone: is there a state where a status change, an alert or the "I'm still here" prompt is not announced, or is announced two times?
3. Right-to-left (Arabic, Urdu): does any part of the layout or the text order break when `dir="rtl"`?
4. Plain language: is any English patient text in `lib/text/en.ts` hard to understand, or does it say something that the screen does not do?
5. Code quality in `app/` and `components/`: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, or a comment that no longer matches the code.

Mark each fault "wcag", "screen reader", "rtl", "wording" or "readability". For a WCAG fault, give the success criterion number.

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass, including click tests for focus after a screen change and a contrast test (`lib/contrast.ts`). Lint exit 0, build passed.
- `npm run e2e` (Playwright, phone 390 x 844 and laptop 1280 x 800): 39 passed on the last run (2026-11-21); one check is flaky (`e2e/timed-steps.spec.ts:84`, in known-issues.md).
- A WCAG 2.2 AA check with axe-core 4.14.0 ran on the patient and staff screens in Phase 3 (2026-11-17). Later screens (survey, run-time fixes) were not checked with axe.

### Not checked

- Not tried with a real screen reader (VoiceOver or TalkBack), and not on a real Android phone.
- Zoom to 200% and 400% not tried in a browser in this session.

## Part 3: code quality

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-3-quality-bundle.txt` (99 files, 4535 lines, about 278 KB): `SPEC.md`, `docs/decisions.md`, `docs/known-issues.md`, `eslint.config.mjs`, `tsconfig.json`, all of `lib/` (English text only) and all of `data/`.

### Questions

1. Correctness: a function in `lib/` or `data/` that gives a wrong result for some input (an empty list, a time across midnight in Toronto, a `null` field, a status that the function does not expect).
2. Dead code and copies: code that nothing in these files calls (say if the caller may be in `app/` or `components/`, which are not in this bundle), or two pieces of code that do the same job.
3. Error handling: a Supabase call in `data/` whose fault is lost, or turned into the wrong answer (for example "not saved" in place of "refused").
4. Readability for a beginner: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, a comment that no longer matches the code, or a type that is wider than it needs to be.

Mark each fault "bug", "dead code", "error handling" or "readability".

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass; each rule in `lib/` has its own test file (not in the bundle). Lint exit 0, build passed.
- GitHub checks passed on `ca9cf88` (run 44944146594).

### Not checked

- No test coverage report was made.

## Bundles

- Made from the files at `ca9cf88` with `git ls-files`. Left out: the tests, `.mcp.json`, and every `.env` file except `.env.example` (it has only the names of the settings, with empty values). `.env.local` is not in git.
- Searched for keys before saving: no key, token, password, project ID or real patient data. The only long strings are the code and token alphabets. The only addresses are the live app, the Pushover API, two public health links, `localhost` and placeholders.

## Response

Pasted by the owner on 2026-11-21. Gemini Hydrogen 4, High, 3 new chats.

### Response: Part 1, security and privacy

#### Bundle completeness

All 87 files included in `2026-11-21-gemini-review-phase5-final-1-security-bundle.txt` are present and complete through the end of `lib/demoPlanReply.ts`. None of the attached files stop early.

Files outside this bundle that could not be inspected here:

* UI layouts, pages, and components (`app/layout.tsx`, `app/page.tsx`, `app/patient/page.tsx`, `app/staff/page.tsx`, `app/dashboard/page.tsx`, `app/login/page.tsx`, `components/PrivateAnalytics.tsx`, `components/patient/*`, `components/staff/*`).
* `lib/` modules not included in the security bundle (such as `lib/recallAlert.ts`, `lib/demoPlan.ts`, `lib/dashboardNumbers.ts`, `lib/saveResult.ts`, `lib/sitePause.ts`, `lib/visitActions.ts`, `lib/text/*`).
* Other SQL check files in `supabase/checks/` besides `supabase/checks/permissions.sql`.

#### Faults (most serious first)

No confirmed access, token, api, privacy, or rule fault was found in the 87 inspected files (excluding items settled in `docs/decisions.md` and `docs/known-issues.md`). One potential privacy / token issue could not be ruled out because the layout and analytics component files are not in this bundle:

1. privacy / token (unverified): `@vercel/speed-insights` is listed in dependencies with no documented `beforeSend` scrubbing
   * Where: `package.json:16` (`"@vercel/speed-insights": "^2.1.0"`), compared with `lib/analyticsPrivacy.ts` and `docs/decisions.md` (2026-11-18).
   * Steps / data: `docs/decisions.md` specifies that Vercel Web Analytics (`@vercel/analytics`) strips `?` and `#` via `privateEvent()` in `components/PrivateAnalytics.tsx` so `/patient#t=...` tokens never leave the browser. However, `@vercel/speed-insights` is also installed in `package.json`, and neither `docs/decisions.md` nor `lib/analyticsPrivacy.ts` mentions it.
   * Wrong result (if unconfigured): If `<SpeedInsights/>` is mounted in `app/layout.tsx` or `components/PrivateAnalytics.tsx` without `beforeSend={privateEvent}`, and if the browser script captures `window.location.href` before `takeTokenFromLink()` runs `history.replaceState` on hydration, the `#t=` access token could be included in Speed Insights telemetry.
   * What would prove it: Reading `app/layout.tsx` and `components/PrivateAnalytics.tsx` to check whether `<SpeedInsights/>` is rendered and whether it passes `beforeSend={privateEvent}` (or confirming the package is unused).

#### Question 1: Access

Tracing `supabase/migrations/` in chronological order to the final schema matches `supabase/checks/permissions.sql`:

* Table access (`anon`): `visits`, `site_settings`, `daily_stats`, and `demo_settings` revoke all rights from `anon`. Only `change_signal` grants `SELECT` to `anon` (one row containing `id = 1` and `changed_at`, with no visit data).
* Table access (`authenticated`, signed-in non-staff):
  * `visits` grants `SELECT, INSERT, UPDATE` (no `DELETE`), and all three RLS policies require `(select public.is_staff())`.
  * `site_settings` grants `SELECT, UPDATE`, and both RLS policies require `(select public.is_staff())`.
  * `daily_stats` grants `SELECT` (`20261118120000_daily_stats_staff_read.sql`), and its RLS policy requires `(select public.is_staff())`.
  * `demo_settings` revokes all rights from `anon`, `authenticated`, and `service_role` (`20261118000000`, `20261118000200`, `20261120020000`), with RLS enabled and no policies.
  * `public.is_staff()` checks `(auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'`. Because `app_metadata` can only be set by the project owner/service role and not by end users, a signed-in non-staff user receives `false` from `is_staff()`, 0 rows on `SELECT`, and RLS rejection on `INSERT`/`UPDATE`.
* Functions (`anon` and `authenticated`):
  * Patient RPCs (`get_patient_visit`, `record_seen`, `confirm_on_my_way`, `record_still_here`, `submit_survey`) are `SECURITY DEFINER` with `set search_path = ''`, revoked from `public`, and granted only to `anon, authenticated`. All five require an exact `access_token` match and enforce their state constraints in SQL (`status = 'called'`, `status = 'waiting'`, or `status = 'arrived' and closed_at is not null and survey_score is null and p_score between 0 and 10`). Dropping and recreating `get_patient_visit` in `20261111050000`, `20261120000000`, and `20261121000000` re-applies `REVOKE` from `public` and `GRANT` to `anon, authenticated` each time.
  * `clear_demo_data()` is granted to `authenticated` (`20261118010000_clear_demo_data.sql`), but checks `if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;` first, blocking non-staff accounts.
  * `start_home_visit` and `set_demo_plan` are revoked from `public, anon, authenticated` and granted only to `service_role`.
  * `delete_old_visits`, `simulate_demo_tick`, `demo_new_token`, `demo_new_code`, and all trigger functions are revoked from `public, anon, authenticated` (and `service_role` for cleanup/simulator functions).
* App-layer staff gate (`proxy.ts` and `data/staffSignIn.ts`): `proxy.ts` verifies claims via `supabase.auth.getClaims()` and redirects unauthenticated or non-staff users away from `/staff/*` and `/dashboard/*` to `/login` (`pageAfterSignIn` in `lib/staffAccess.ts` rejects external redirects and non-staff paths). `data/staffSignIn.ts` immediately signs out any account whose claims fail `isStaffAccount()`.

#### Question 2: Tokens and codes

* Generation and randomness: `makeAccessToken()` in `lib/codes.ts` uses `crypto.getRandomValues` for 16 bytes (128 random bits) encoded as 26 Crockford base32 characters. `demo_new_token()` in `20261118000000_demo_settings.sql` uses `extensions.gen_random_bytes(26)` (130 random bits). `makeDisplayCode()` uses rejection sampling on `crypto.getRandomValues` (`limit = 248`) over a 31-character look-alike-free alphabet (`CODE_ALPHABET`).
* URL, `Referer`, and caching: `patientLink()` (`data/savedToken.ts`) places the token in the hash fragment (`#t=...`), which browsers do not send in HTTP requests or `Referer` headers. `takeTokenFromLink()` removes the hash immediately via `window.history.replaceState(null, "", window.location.pathname)`. `next.config.ts` sets `Referrer-Policy: strict-origin-when-cross-origin`. `/api/start-visit` returns `Cache-Control: no-store` and never returns the display `code`.
* Third parties and logs:
  * `privateEvent()` (`lib/analyticsPrivacy.ts`) strips `?` and `#` (and drops malformed URLs) before Vercel Web Analytics sends events. (Only `@vercel/speed-insights` in `package.json:16` needs layout verification, noted above.)
  * `/api/recall-alert` selects only `id, code, site, status, called_at, is_demo`, so neither `access_token`, `language`, nor `ctas_level` is even fetched for Pushover.
  * `data/startHomeVisit.ts` logs only `{ code: error.code, message: error.message }` or the exception message on DB errors, never `token` or `p_code`.
  * `data/dashboardFields.ts` explicitly excludes `access_token` and `code` from dashboard and AI summary reads.
* Retention: `delete_old_visits()` deletes every visit row where `created_at < now() - interval '24 hours'` every 15 minutes via `pg_cron`. `localStorage` keeps `vwr.patientToken` until replaced or cleared on a broken/dead link (noted in `docs/known-issues.md`).

#### Question 3: API routes (`app/api/`)

(Gemini gave this as a table; one route per item here.)

* `POST /api/start-visit`: anyone (rate-limited by Vercel WAF + 10/min/site DB cap). Checks first: body `<= 200` chars, valid JSON, `site` in `A`/`B`, `language` in `START_LANGUAGES`. Faults: `400` `bad_request`, `409` `paused`, `429` `busy`, `500` `error` (all `no-store`); DB errors logged server-side only.
* `GET /api/site-status`: anyone. Checks first: `await connection()`, reads only `site, offsite_paused` via `service_role`. Faults: `500` `{ result: "error" }` (`no-store`); DB errors logged server-side only.
* `GET /api/time`: anyone. Checks first: `await connection()`. Returns `{ now: Date.now() }` (`no-store`); no DB call or secrets.
* `GET /api/keep-alive`: cron only (`CRON_SECRET`). Checks first: `isCronRequest(authorization, process.env.CRON_SECRET)` (`401` if invalid/unset). Faults: `502` `{ ok: false }` (`no-store`); uses publishable key on `change_signal` only.
* `GET /api/demo-plan`: cron only (`CRON_SECRET`). Checks first: `isCronRequest` (`401`), then `claudeIsSetUp()` (`204` if missing). Faults: `503` `busy`, `502` `claude_failed` / `refusal` / `cut_off` / `not_json` / `not_saved` (`no-store`); no DB errors or keys returned.
* `POST /api/recall-alert`: signed-in staff (`Bearer` JWT). Checks first: Pushover env vars (`204` if missing), `Bearer` header (`401`), body `<= 2500` chars + `parseRecallAlertBody` (`400`). Faults: `500` `error` on query failure, `200` `nothing_to_send` for non-staff/empty RLS result, `502` `alert_failed` on Pushover timeout/failure (`no-store`).
* `POST /api/dashboard-summary`: signed-in staff (`Bearer` JWT). Checks first: `claudeIsSetUp()` (`204`), `Bearer` token (`401`), body `<= 100` chars + `{ isDemo: boolean }` (`400`), `auth.getUser(token)` + `is_staff` (`401`/`403`/`500`). Faults: `503` `busy`, `502` `claude_failed` (`no-store`); no DB errors, keys, or visit rows leaked.

#### Question 4: Privacy and old-visit deletion

* Outbound data:
  * Vercel Analytics: `privateEvent()` (`lib/analyticsPrivacy.ts`) sends only `origin + pathname`.
  * Pushover: `app/api/recall-alert/route.ts` queries only `id, code, site, status, called_at, is_demo` and formats only real (`!is_demo`) recent recalls into the Pushover message.
  * AI summary (`/api/dashboard-summary`): `summaryInput()` (`lib/summaryInput.ts`) copies only the 23 named aggregate counts/sums per site from `SummarySite` plus `isDemo`. No codes, tokens, or individual visit timestamps leave the server.
  * AI demo plan (`/api/demo-plan`): `demoPlanUserMessage()` (`lib/demoPlanPrompt.ts`) sends only today's date and the 8 parameter names/ranges.
* 24-hour deletion (`delete_old_visits()` in `20261121010000_wait_stats_on_triage_day.sql`):
  * Runs every 15 minutes via `pg_cron` (`*/15 * * * *`), deleting all `visits` rows where `created_at < now() - interval '24 hours'` (including un-triaged `pre_arrival` rows and open/closed visits).
  * In the same CTE statement, it rolls aggregate counts/sums into `daily_stats` keyed only by `(day, site, is_demo)`, keeping no codes, tokens, or single-visit timestamps.
  * A second daily cron job (`delete-old-cron-logs` in `20261116110000`) prunes `cron.job_run_details` older than 7 days.

#### Question 5: `SPEC.md` hard rules

Across the files in this bundle, no hard-rule violation was found:

* Rule 1 (no PHI, two identifiers, Pushover limits): Satisfied by `visits` schema (`20261110060756`), `lib/codes.ts`, `app/api/recall-alert/route.ts:36`, and `data/staffActions.ts:112` (staff-only short-code lookup).
* Rule 2 (no clinical decisions): Verified in `start_home_visit` (leaves `ctas_level` null), `lib/summaryPrompt.ts:14`, and `20261120020000_demo_plan.sql` (random 4/5 stays in SQL).
* Rule 4 (24-hour delete + `daily_stats` before delete): Satisfied by `delete_old_visits()` (`20261121010000`) and `daily_stats` schema.
* Rule 5 (patient read/write limits + `change_signal`): Satisfied by `get_patient_visit`, `/api/start-visit` + `start_home_visit`, `record_seen`, `confirm_on_my_way`, `record_still_here`, `submit_survey`, `visits` RLS, and `change_signal`.
* Rule 7 (home start never holds place in line): `start_home_visit` forces `source = 'home', status = 'pre_arrival'`, and `get_patient_visit` orders `place_in_line` by `(triaged_at, id)` only while `status = 'waiting'`.
* (Rules 3, 6, 8, and 9 are primarily enforced in UI components/pages outside this security bundle.)

#### Hardening ideas

1. Add a per-day guard to `/api/demo-plan` (`app/api/demo-plan/route.ts`, `supabase/migrations/20261120020000_demo_plan.sql`): `set_demo_plan` records `plan_set_at = now()`, but neither the route nor the SQL function checks whether a plan was already generated today. Skipping the Claude call when `plan_set_at` is already today (Toronto time) prevents repeated Anthropic API charges and overwrites if `CRON_SECRET` is ever exposed or a call is retried manually. Helps: Low to moderate.
2. Use fixed-length digests in `isCronRequest` (`lib/cronAuth.ts:11`): Hashing both `given` and `wanted` with SHA-256 before `timingSafeEqual` avoids returning early on `given.length === wanted.length`. Helps: Very low (the length timing difference is already obscured by network jitter).
3. Log `error.name` instead of `error.message` in server `catch` blocks (`app/api/demo-plan/route.ts:48`, `app/api/keep-alive/route.ts:19`, `app/api/site-status/route.ts:15`, `data/startHomeVisit.ts:42`): Only `demo-plan` logs `error.name` for Claude errors (line 37) while logging `problem.message` for database/fetch errors. Switching to `problem.name` avoids printing internal hostnames or connection error strings into Vercel runtime logs. Helps: Low (errors are never sent in HTTP responses).
4. Short-circuit malformed tokens in patient RPCs (`get_patient_visit`, `record_seen`, `confirm_on_my_way`, `record_still_here`, `submit_survey`): Checking `p_token ~ '^[0-9A-HJKMNP-TV-Z]{26}$'` at the top of each function avoids querying the `visits` index on `null`, empty, or invalid inputs. Helps: Very low.

### Response: Part 2, accessibility

#### Files not read or truncated in the attachment

74 of the 75 stated files in `2026-11-21-gemini-review-phase5-final-2-access-bundle.txt` are present and complete from `SPEC.md` through `components/useNow.ts`, with none cut off mid-file. One file from the expected 75-file count is missing from the bundle, and imported helpers outside the requested scope could not be read:

* `lib/languageScript.ts` (imported by `app/layout.tsx` and `components/useDocumentLanguage.ts`) and other `lib/` helpers (`lib/waitText.ts`, `lib/duration.ts`, `lib/followUp.ts`, `lib/stillHere.ts`, `lib/recentlyClosed.ts`, `lib/progressChanges.ts`, `lib/survey.ts`, `lib/homeCheckIn.ts`, `lib/queue.ts`, `lib/calledAlert.ts`, `lib/codes.ts`, `lib/startPage.ts`, `lib/switchToOffsite.ts`, `lib/expectedArrivals.ts`, `lib/dashboardNumbers.ts`, `lib/trendNumbers.ts`, `lib/dashboardCsv.ts`).
* All files in `data/*` (e.g., `data/patientVisit.ts`, `data/staffActions.ts`, `data/sitePauses.ts`, `data/useOnline.ts`) and `app/api/*`, as well as `fr.ts`, `ur.ts`, `ar.ts`, and `zh.ts`.
* Real screen readers (VoiceOver/TalkBack) and live 200%/400% browser zoom were not tested in a live browser here; live-region timing collisions below are inferred from DOM/focus order and mobile screen-reader behaviour, and would be proved by testing with iOS VoiceOver and Android TalkBack.

#### Faults (most serious first)

1. screen reader: Status announcement (`StatusAnnouncer`) collides with focus rescue to `#status-heading` (Patient screen)
   * File and line: `components/patient/useFocusRescue.ts:32-44`, `components/patient/PatientStatus.tsx:154-169`, `components/patient/StatusAnnouncer.tsx:68-89`
   * Steps or data: On `/patient`, put keyboard or VoiceOver/TalkBack focus on `"I'm on my way"` (when `status === "called"`) or on `"Turn on sound"` / `"Turn off sound"` (when `status === "called"`), then tap `"I'm on my way"` or have staff mark the visit `"arrived"`.
   * Wrong result: `useRescueFocus` moves focus synchronously (`t = 0 ms`) to `<h2 id="status-heading" tabIndex={-1}>`. At `t = 300 ms`, while the screen reader is reading the heading, `StatusAnnouncer` populates its `aria-live="polite"` region (`"Thank you. Staff know you are on your way."` or `"Staff have marked you as back..."`). On iOS VoiceOver and Android TalkBack, this cuts off the heading mid-phrase or reads the status change twice in different words. (Inferred from timing; prove on real VoiceOver/TalkBack.)
2. screen reader: Two `aria-live="assertive"` announcements fire together at 300 ms on an overdue call-back (Patient screen)
   * File and line: `components/patient/StatusAnnouncer.tsx:68-89`, `components/patient/CallReminder.tsx:21-30`
   * Steps or data: Open or reload `/patient` when `status === "called"` and `calledAt` is already at or past the 10-minute (`second_alert`) or 20-minute (`return_now`) threshold.
   * Wrong result: Both `StatusAnnouncer` (announcing `t.announce.called`) and `CallReminder` (announcing `t.announce.secondAlert` or `returnNow`) schedule `aria-live="assertive"` updates after 300 ms. One assertive announcement interrupts or drops the other on mobile screen readers. (Inferred; prove on real VoiceOver/TalkBack.)
3. screen reader: Sound off/failure announcements are preempted by focus moving to `"Turn on sound"` (Patient screen)
   * File and line: `components/patient/SoundSwitch.tsx:107-126` and `183-191`
   * Steps or data: On `/patient`, tap `"Turn on sound"` and then tap `"Turn off sound"` (either while `waiting` or while `called`), or tap `"Turn on sound"` in a browser where `AudioContext` / `unlockSound()` fails.
   * Wrong result: When `state` changes to `"off"` or `"failed"`, `useEffect` moves focus to `<Button ref="{turnOnButton}">Turn on sound</Button>` at the same moment `<div role="status">` renders `offWhileCalled` or `failed`, and `turnOnButton` has no `aria-describedby` pointing to that `<div role="status">`. While `waiting`, tapping `"Turn off sound"` only announces `"Turn on sound, button"` with no spoken confirmation that sound turned off; while `called` or on failure, the focus jump cuts off the `role="status"` alert.
4. wording: `"Sound is on"` stays on screen after iOS suspends `AudioContext` while waiting, and fails to warn that iOS cannot vibrate (Patient screen)
   * File and line: `components/patient/SoundSwitch.tsx:128-154` and `169-177`, `components/patient/alertSound.ts:91-100`, `lib/text/en.ts:158-162`
   * Steps or data: On an iPhone, open `/patient` while `status === "waiting"`, tap `"Turn on sound"`, lock the phone or switch apps for a minute, and unlock/return while still `"waiting"`; or view `"Sound is on"` on any iPhone (`navigator.vibrate` is `undefined`).
   * Wrong result: While `waiting`, `shouldAlert` is `false`, so `SoundSwitch` never checks `AudioContext.state` on `visibilitychange` and continues displaying `"Sound is on"` even though iOS suspended the audio context; when `called` arrives later without a tap, `ctx.resume()` fails and sound drops to `"off"`. Separately, `sound.notice` says `"It also vibrates if your phone allows it"`, and `"Sound is on"` gives no note on devices where `typeof navigator.vibrate !== "function"` that vibration is unavailable on that phone. (iOS background suspension should be verified on a real iPhone.)
5. screen reader: `"I'm still here"` thank-you collides with heading focus, is spoken twice on swipe, and uses `aria-live` without `aria-atomic` on the prompt (Patient screen)
   * File and line: `components/patient/StillHerePrompt.tsx:47-53`, `61-70`, `84`, `106-114`
   * Steps or data: Wait for the `"I'm still here"` prompt (`showing === true`), tap `"I'm still here"`, and swipe through the screen within 3 seconds (`THANKS_SPOKEN_MS = 3_000`).
   * Wrong result: Unmounting the button triggers `useRescueFocus` to focus `#status-heading` (`"Status: Waiting"`) at the same moment `<p role="status" className="sr-only">` populates `"Thank you..."` (focus speech vs. live region collision). In addition, for the first 3 seconds both the `sr-only` `<p role="status">` and the visible `<p className="clean-card">` expose identical text to screen readers, so swiping forward reads the thank-you message twice. Line 84 (`<p aria-live="polite" className="sr-only">{announcement}</p>`) also omits `aria-atomic="true"`, and changing language while the prompt is visible re-triggers the `"stillHere"` announcement 300 ms later.
6. wcag (4.1.3 Status Messages, 2.4.3 Focus Order): AI `"Write a short summary"` disables the focused button and gives no live announcement when the summary appears (Dashboard)
   * File and line: `components/dashboard/SummaryPanel.tsx:49-61`
   * Steps or data: On `/dashboard`, focus `"Write a short summary"` and press Enter or Space.
   * Wrong result: The button immediately receives `disabled={waiting || resting}` while focused. When the summary text returns, `{message?.kind === "text"}` renders plain `<p>` elements with no `role="status"` or `aria-live` and no focus move, so screen-reader users are not told the summary is ready. On failure (`message?.kind === "note"`), `<p role="status">` is conditionally mounted already populated, which mobile screen readers often skip.
7. wcag (2.4.3 Focus Order): `"Start a new demo visit"` on the start page drops focus to `document.body` (Start page)
   * File and line: `components/start/StartVisit.tsx:107-113`
   * Steps or data: Open `/` with a closed or expired visit saved in `localStorage`, tab to `"Start a new demo visit"`, and activate it.
   * Wrong result: `setWantsNew(true)` unmounts the focused `<Button>` and `{savedBox}` and mounts the new start form (`#start-heading`) with no focus move, dropping keyboard and screen-reader focus to `document.body` (top of the page).
8. wcag (2.4.3 Focus Order): `"Cancel: check in a new patient instead"` on the staff check-in form drops focus to `document.body` (Staff list)
   * File and line: `components/staff/CheckInPanel.tsx:65-72` and `167-177`, `app/staff/page.tsx:31-36`
   * Steps or data: On `/staff`, select an expected arrival (or reopened reassessment visit) so `homeVisit` is set, tab to `"Cancel: check in a new patient instead"`, and activate it.
   * Wrong result: `cancelHome()` calls `onHomeDone()`, setting `homeVisit` to `null` and unmounting the focused button; `app/staff/page.tsx:35` only moves focus to `#checkin-heading` when `homeVisit` is truthy, so focus drops to `document.body`.
9. wcag (3.1.2 Language of Parts) and rtl: `<Footer>` stays English and `dir="rtl"` flips its trailing period on Urdu/Arabic pages (Start page, Patient screen)
   * File and line: `components/Footer.tsx:6-12`, `components/useDocumentLanguage.ts:11-22`
   * Steps or data: Select Urdu (`ur`) or Arabic (`ar`) in `LanguageSwitch` on `/` or `/patient`.
   * Wrong result: `useDocumentLanguage` sets `<html lang="ur" dir="rtl">` (or `ar`), while `<footer>` renders `textFor("en").footer` with no `lang="en"` or `dir="ltr"` attribute. Screen readers pronounce the English disclaimer using an Urdu/Arabic voice (WCAG 3.1.2), and under Unicode BiDi (`dir="rtl"`), the trailing period at the end of `"Demo data only."` moves to the left edge of the footer text.
10. wcag (2.5.8 Target Size Minimum): Standalone `"Or start a new demo visit on the start page."` link is below 24 px tall (Patient screen)
    * File and line: `components/patient/VisitScreen.tsx:69-71`, `components/patient/PatientStatus.tsx:138-140`
    * Steps or data: Open `/patient` with no saved visit (`screen === "none"`), a broken link, or an expired visit at 100% text size.
    * Wrong result: `<Link className="font-semibold text-brand underline underline-offset-2" href="/">` is `display: inline` with no vertical padding (`py-*`) or `min-h-11`, and it makes up the entire `<p>` (so WCAG 2.5.8's inline-in-a-sentence exception does not apply). On a single line, its inline box height is ~21-22 CSS px (under 24 px).
11. screen reader: Conditionally mounted `role="status"` in `VisitRow` and simultaneous focus+status announcements on `/staff` (Staff list)
    * File and line: `components/staff/VisitRow.tsx:160-164`, `app/staff/page.tsx:43-52`, `components/staff/WaitingOnSite.tsx:140-155`
    * Steps or data: On `/staff`, press `"Mark arrived"`, `"Left"`, `"No-show"`, or `"Yes, issue a new link"` on a row, or confirm/undo a switch in `WaitingOnSite`.
    * Wrong result: `VisitRow.tsx:160` conditionally mounts `<p role="status">` only when `saving || note || okNote` is truthy, which mobile screen readers may ignore on insertion. Separately, `onLeftList`, `onUndoResult`, `confirm`, and `undoLast` set a `role="status"` confirmation message and synchronously call `.focus()` on `#list-heading` / `#onsite-heading` in the same commit, which can interrupt or drop the confirmation text on VoiceOver/TalkBack. (Inferred; prove on real VoiceOver/TalkBack.)
12. screen reader: `LanguageSwitch` draft notice lacks `aria-atomic="true"` and fires synchronously with `<select>` change (Start page, Patient screen)
    * File and line: `components/LanguageSwitch.tsx:22-35`
    * Steps or data: Switch from one draft language (e.g., French) to another draft language (e.g., Urdu) in `<select>`.
    * Wrong result: `<div role="status">` updates its child `<p>` text in the same event tick as `<select>` `onChange` and lacks `aria-atomic="true"`, risking a speech collision with the native `<select>` announcement on mobile screen readers.
13. wcag (2.4.3 Focus Order, 1.3.1 Info and Relationships): `<p id="status-heading">` during loading causes a double focus jump on same-tab link change (Patient screen)
    * File and line: `components/patient/VisitScreen.tsx:48-52`
    * Steps or data: While focused inside an open visit on `/patient`, open a different `#t=...` link in the same tab (`hashchange`).
    * Wrong result: `screen` transitions `visit -> loading -> visit`, so focus jumps once onto `<p id="status-heading" tabIndex={-1}>{p.loading}</p>` (a `<p>` rather than a heading) and jumps a second time onto `<h2 id="status-heading">` when the visit loads.
14. wcag (2.4.7 Focus Visible): Scrollable `TrendTable` region and `SurveyBox` thank-you rely on browser default outlines inside `overflow-x-auto` (Dashboard, Patient screen)
    * File and line: `components/dashboard/TrendTable.tsx:66`, `components/patient/SurveyBox.tsx:41-43`
    * Steps or data: On `/dashboard`, press Tab until focus lands on the scrollable table region (`<div className="relative overflow-x-auto" tabIndex={0}>`), or submit the survey on `/patient`.
    * Wrong result: Unlike `Button` and page links, neither element carries `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink`; on `TrendTable`, the browser's default outline on an `overflow-x-auto` container can be faint or clipped against the panel edge (browser-dependent).
15. wording: `lib/text/en.ts` describes actions on a screen with none, uses `"Please head back now"` after confirmation, and retains jargon
    * File and line: `lib/text/en.ts:25`, `73`, `78`, `80`, `91`, `93`, `107-108`, `112`, `116`, `118`, `145`, `169`, `180`
    * Steps or data: Trigger the `"unavailable"` screen on `/patient` (`VisitScreen.tsx:53-58`), confirm `"I'm on my way"` (`PatientStatus.tsx:69-89`), or read the waiting/still-here/reassess/draft/offline copy.
    * Wrong result:
      * `unavailableText` (line 73): Says `"Your actions on this page are not saving. Staff may not see them."` on the `"We cannot load your visit"` screen (`VisitScreen.tsx:53-58`), which has no buttons or actions at all.
      * `calledHeading` (line 93): `"Please head back now"` stays as the `<h2>` even after `status === "on_the_way"` (`PatientStatus.tsx:74`), and `"head back"` is idiomatic compared to `"come back"`.
      * Ambiguity / above Grade 6: `careIntro` (`"each site"`, line 25, easily confused with Demo Site A/B), `replacedLinkText` (`"ask... for help"` without saying what to ask for, line 78), `findVisitHelp` (`"QR code"` unexplained / assumes paper slip, line 80), `simulated` (`"simulated"`, line 91), `reassessHeading` (`"triage desk"`, line 107, whereas `fromHomeHeading` replaced `"triaged"`), `onsiteText` (`"Staff will call you"` sounds like a phone call, line 112), `unableText` / `removedText` (`"this visit has left the off-site line"` / `"off-site waiting"`, lines 116, 118), `stillHere.heading` (`"Are you still following your visit?"`, line 145), `language.draftNotice` (`"draft"`, `"fluent speaker"`, line 169), `offline` (`"Reconnect"`, line 180). (Fixed `SPEC` lines are excluded.)
16. readability: Multi-job component, misleading names, and stale comments in `app/` and `components/`
    * File and line: `components/staff/ExpectedArrivals.tsx:1-124`, `components/staff/CheckInPanel.tsx:3-5` and `25`, `app/staff/page.tsx:28-36`, `components/patient/VisitScreen.tsx:70`, `lib/text/en.ts:121`, `components/staff/RecentlyClosed.tsx:43`
    * Wrong result:
      * More than one job: `ExpectedArrivals.tsx` handles three jobs in one component (expected arrivals list, `"Back for reassessment"` list, and short-code lookup form).
      * Names that hide what the thing does: `homeVisit`, `homeProblem`, `onHomeDone`, and `chooseHomeVisit` (`app/staff/page.tsx`, `CheckInPanel.tsx`) also handle reopened desk visits (`needs_reassessment`); `p.expiredNewVisit` (`VisitScreen.tsx:70`, `lib/text/en.ts:121`) is used on the no-visit / broken-link screen as well as the expired screen; `undo` / `onUndoResult` (`RecentlyClosed.tsx`) also reopen `unable_to_reach` visits.
      * Stale comments: `CheckInPanel.tsx:3-5` and `25` state the component checks in only a new desk visit or a visit started from home, omitting reopened reassessment visits (`line 158`). (No file in `app/` or `components/` exceeds 300 lines.)

#### Per-screen WCAG 2.2 AA status

* Start page (`/`): Fails 2.4.3 (`StartVisit` `"Start a new demo visit"` drops focus) and 3.1.2 (`Footer` missing `lang="en" dir="ltr"` in Urdu/Arabic). Contrast, `min-h-11` / `aloneStyle` targets, labels, and lack of animation pass.
* Patient screen (`/patient`): Fails 2.5.8 (standalone `<Link href="/">` under `none` and `expired`), 3.1.2 (`Footer` in Urdu/Arabic), and 2.4.3 (`VisitScreen` loading `<p id="status-heading">`), alongside the screen-reader collisions in `StatusAnnouncer`, `CallReminder`, `SoundSwitch`, and `StillHerePrompt`. Contrast, 200% reflow of text blocks, and labels pass.
* Staff list (`/staff`): Fails 2.4.3 (`CheckInPanel` `"Cancel: check in a new patient instead"` drops focus) and has conditional/colliding `role="status"` in `VisitRow` and `app/staff/page.tsx`. Contrast, `min-h-11` targets, `<summary>` focus rings, and labels pass.
* Staff sign-in (`/login`): No WCAG 2.2 AA failures found (`min-h-11` inputs with `<label>`, `autoComplete`, `role="alert"` + `aria-describedby` on errors, contrast, and focus rings pass).
* Dashboard (`/dashboard`): Fails 4.1.3 (`SummaryPanel` disables the focused button and renders the AI summary with no live region or focus move) and has a minor 2.4.7 outline gap on `TrendTable`'s `overflow-x-auto` region. Contrast, headings/tables/`<dl>` semantics, and `NoData` screen-reader text pass.

### Response: Part 3, code quality

All 99 files in the bundle (`SPEC.md`, `docs/decisions.md`, `docs/known-issues.md`, `eslint.config.mjs`, `tsconfig.json`, `lib/` with English text only, and `data/`) are complete and readable, and none stop early. Because `app/`, `components/`, `supabase/`, test files, and the non-English translation files in `lib/text/` are excluded from this bundle, callers or schema behaviour in those folders cannot be verified directly from the attachment.

1. bug: Prototype-property lookups in `textFor`, `formatWaitRange`, and `fill`
   * File and line: `lib/text/index.ts`, lines 17 and 21; `lib/waitText.ts`, lines 12 and 40.
   * Steps / data: Call `textFor("toString")`, `formatWaitRange(10, 20, "constructor")`, or `fill("{toString}", {})`.
   * Wrong result: `TEXT[language]`, `WORDS[language]`, and `name in values` resolve inherited `Object.prototype` properties (`toString`, `constructor`) as truthy instead of falling back to `en`, `enDuration`, or `whole`. Callers reading `.patient` or `.minute` receive `undefined` and throw an uncaught `TypeError`.
2. bug: Incomplete Claude stop reasons treated as finished summaries
   * File and line: `lib/summaryAnswer.ts`, lines 22-29.
   * Steps / data: Pass a reply with `stop_reason: "pause_turn"` (or `"model_context_window_exceeded"` or `null`) and partial text blocks in `content`.
   * Wrong result: Unlike `demoPlanReply` (`lib/demoPlanReply.ts`, line 12), which rejects everything other than `"end_turn"`, `summaryAnswer` only checks `"refusal"` and `"max_tokens"`, so it returns partial text as `{ kind: "text", ... }` instead of `{ kind: "none", reason: "cut_off" }`.
3. bug: Unsynced local clock used on initial dashboard load and staff list cutoff
   * File and line: `data/dashboardRead.ts`, line 62; `data/serverClock.ts`, lines 36-39; `data/visitCache.ts`, line 49.
   * Steps / data: Open `/dashboard` or `/staff` near midnight Toronto time on a device whose clock is ahead of the server (for example, 23:55 Toronto server time while the device clock says 00:05 the next day).
   * Wrong result: `serverNow()` starts `syncClock()` asynchronously without awaiting `/api/time` and immediately returns `Date.now() + 0`. Even though `docs/decisions.md` states `serverNow()` prevents a wrong laptop clock from moving midnight, the first `loadDashboard` computes the wrong `today` and queries `daily_stats` for the wrong 7-day window until the next 15-second read. `loadVisits` uses `Date.now()` directly instead of `serverNow()`, so a fast device clock hides visits created or closed 23-24 hours ago from `/staff`. (Not sure whether `app/dashboard` or `app/staff` awaits or pre-warms `syncClock()` before `useDashboard`/`useVisits` mounts; inspecting `app/` would prove it.)
4. error handling: `signInStaff` ignores `getClaims()` errors and maps `429`/`408` to `"wrong"`; `signOutStaff` has no `try/catch`
   * File and line: `data/staffSignIn.ts`, lines 14-20 and 28-31.
   * Steps / data: (a) `signInWithPassword` succeeds, then `supabase.auth.getClaims()` returns an error or `null` claims due to a network/JWKS outage; (b) `signInWithPassword` returns HTTP `429` (rate limit) or `408`; (c) `signOutStaff()` rejects on a network/storage failure.
   * Wrong result: (a) `signInStaff` does not inspect the `error` returned by `getClaims()`, treats missing claims as non-staff, calls `signOut()`, and returns `"not_staff"` instead of `"no_connection"`; (b) `error.status < 500` turns rate-limit or timeout responses into `"wrong"` (wrong email or password); (c) `signOutStaff` throws an unhandled rejection instead of returning `false`.
5. bug: `recallAll` triggers `N` parallel `loadVisits()` calls and store updates
   * File and line: `data/staffActions.ts`, lines 151-153; `data/visitCache.ts`, lines 65-70.
   * Steps / data: Run `recallAll(ids)` for multiple waiting visits (for example, 9 visits).
   * Wrong result: `(data as StoredVisit[]).forEach(putVisit)` invokes `putVisit` once per row, and `putVisit` calls `show(...)` and `void loadVisits()` each time, firing `N` redundant `SELECT * FROM visits` requests (plus one more on line 153 if `data.length < ids.length`) and `N` store notifications instead of updating the cache once and reloading once.
6. error handling: Database rejections outside `VWR01`/`VWR02` become `"not_saved"` / `"failed"` / `null`, and `issueNewVisitLink` does not retry on collision
   * File and line: `data/patientVisit.ts`, line 164; `data/staffActions.ts`, lines 48, 86, 131, and 149; `data/sitePauses.ts`, line 61; `data/demoData.ts`, line 12.
   * Steps / data: (a) Call `submitSurvey(token, 7.5)`; (b) trigger a Postgres unique violation (`23505`) in `issueNewVisitLink`; (c) call `changeVisit`, `createDeskVisit`, `recallAll`, `setSitePaused`, or `clearDemoData` after a staff session expires (RLS `42501` denial) or on a database constraint failure.
   * Wrong result: (a) PostgREST rejects `7.5` for `p_score integer` with error `22P02` instead of returning `false`, so `submitSurvey` returns `"not_saved"` rather than `"refused"`; (b) unlike `createDeskVisit` and `startHomeVisit`, `issueNewVisitLink` does not retry on `23505` and maps it to `"not_saved"`; (c) `resultForError`, `setSitePaused`, `recallAll`, and `clearDemoData` map RLS/constraint errors to `"not_saved"` / `null` / `"failed"` ("could not be reached") instead of `"refused"`.
7. bug: `formatWaitRange` skips normalizing `low` when `high < 60` and mishandles `NaN` `high`
   * File and line: `lib/waitText.ts`, lines 41-42.
   * Steps / data: Call `formatWaitRange(-5, 25, "en")`, `formatWaitRange(12.4, 25, "en")`, or `formatWaitRange(10, NaN, "en")`.
   * Wrong result: Because `low` bypasses `formatDuration`'s `whole` guard when `high < 60`, it produces `"-5 to 25 minutes"` or `"12.4 to 25 minutes"`. When `high` is `NaN`, `NaN < 60` is `false`, so line 42 runs and returns `"10 minutes to 0 minutes"` instead of `"10 to 0 minutes"`.
8. bug: String comparison on ISO timestamps in `expectedArrivals`, `backForReassessment`, and `recentlyClosed`
   * File and line: `lib/expectedArrivals.ts`, lines 16 and 27; `lib/recentlyClosed.ts`, line 21.
   * Steps / data: Pass a list of visits whose `created_at`, `triaged_at`, or `closed_at` values mix whole-second `...00Z` with fractional-second `...00.500Z` strings (or different timezone offsets).
   * Wrong result: Because `"."` (ASCII 46) sorts before `"Z"` (ASCII 90), `"2026-11-21T10:00:00.500Z"` sorts earlier than `"2026-11-21T10:00:00Z"` (unlike `byTriage` in `lib/queue.ts`, which uses `Date.parse`). (Not sure if mixed formats occur outside tests; inspecting Supabase row serialization across all callers would confirm.)
9. bug: `torontoDay` and `pastDays` throw `RangeError` on empty or invalid date strings
   * File and line: `lib/torontoDay.ts`, line 13; `lib/pastDays.ts`, lines 7-10.
   * Steps / data: Call `torontoDay("")` or `pastDays("")` (for example, `EMPTY_DASHBOARD.today` in `data/dashboardRead.ts` is `""`).
   * Wrong result: `new Date("")` and `new Date(NaN)` throw an uncaught `RangeError: Invalid time value`.
10. bug: `closedLabel` silently returns `"removed: left"` for unexpected statuses or `null` `removed_reason`
    * File and line: `lib/recentlyClosed.ts`, lines 25-29.
    * Steps / data: Call `closedLabel` on a `Visit` whose `status` is `"declined"`, `"not_eligible"`, or `"waiting"`, or `"removed"` with `removed_reason: null`.
    * Wrong result: Falls through both `if` checks and returns `"removed: left"`.
11. dead code: Test-only duplicates of SQL RPCs and unused exports in `lib/visitActions.ts`
    * File and line: `lib/visitActions.ts`, lines 26, 78-80, 83, 106-109, 117-121, and 162.
    * Details: `startFromHome`, `markSeen`, and `confirmOnMyWay` (plus `NewVisit`) duplicate the database functions `start_home_visit`, `record_seen`, and `confirm_on_my_way`. Nothing in `lib/` or `data/` calls them (and `app/` / `components/` should not, per SPEC rule 5 and the comments stating they are copies for tests). `canTriageAgain` and `statusBeforeClose` are also exported without callers in `lib/` or `data/` (likely test-only).
12. dead code: Duplicate RPC wrapper in `data/patientVisit.ts`
    * File and line: `data/patientVisit.ts`, lines 129-140 and 161-169.
    * Details: `submitSurvey` duplicates the try/catch, RPC error check, `await refreshPatientView(token)`, and `data ? "saved" : "refused"` logic of `patientStep`.
13. dead code: Uncalled exports in `lib/` and `data/`
    * File and line: `lib/allowedSteps.ts` (`ALLOWED_MOVES`, `START_STATUSES`, `TRIAGE_STATUSES`, `OFFSITE_START_STATUSES`, `isAllowedMove`), `lib/contrast.ts` (`contrastRatio`), `lib/analyticsPrivacy.ts` (`privateAddress`), `lib/expectedArrivals.ts` (`EXPECTED_ARRIVAL_HOURS`), `lib/demoPlan.ts` (`normalPlan`), `lib/followUp.ts` (`wasAnswered`), `data/useOnline.ts` (`watchConnection`), `data/dashboardRead.ts` (`loadDashboard`), `data/serverClock.ts` (`syncClock`), plus page/component/API exports in the remaining `lib/` and `data/` modules.
    * Details: Nothing in `lib/` or `data/` calls `lib/allowedSteps.ts` or `lib/contrast.ts` (both exist for test suites per their comments and `docs/decisions.md`), nor the internal helpers exported for unit tests (`privateAddress`, `EXPECTED_ARRIVAL_HOURS`, `wasAnswered`, `watchConnection`). Other uncalled exports (such as `lib/calledAlert.ts`, `lib/clearDemoMessage.ts`, `lib/cronAuth.ts`, `lib/dashboardCsv.ts`, `lib/deadToken.ts`, `lib/demoPlanPrompt.ts`, `lib/demoPlanReply.ts`, `lib/duration.ts`, `lib/e2eCleanup.ts`, `lib/funnelSteps.ts`, `lib/homeCheckIn.ts`, `lib/languageScript.ts`, `lib/notSavedAlert.ts`, `lib/progressChanges.ts`, `lib/pushover.ts`, `lib/recallAll.ts`, `lib/rowFocus.ts`, `lib/saveReply.ts`, `lib/slipOrigin.ts`, `lib/staffAccess.ts`, `lib/startPage.ts`, `lib/startProblem.ts`, `lib/startVisitRequest.ts`, `lib/summaryPrompt.ts`, `lib/survey.ts`, `lib/visitCount.ts`, `lib/waitStart.ts`, `data/claudeClient.ts`, `data/dashboardSummary.ts`, `data/demoPlanSave.ts`, `data/keepAliveRead.ts`, `data/siteStatusRead.ts`, `data/startHomeVisit.ts`, `data/summaryRead.ts`, `data/useDashboard.ts`, `data/useVisits.ts`, and `normalPlan`/`loadDashboard`/`syncClock`) likely have callers in `app/`, `components/`, or `proxy.ts`, which are not in this bundle.
14. readability: Files with more than one job
    * File and line: `lib/expectedArrivals.ts`, lines 1-29; `lib/summaryInput.ts`, lines 1-49.
    * Details: `lib/expectedArrivals.ts` handles both 6-hour-expiring home arrivals (`isExpected`, `expectedArrivals`) and non-expiring reopened reassessment visits (`backForReassessment`). `lib/summaryInput.ts` both builds the 23-field Claude payload (`summaryInput`) and parses the HTTP request body (`parseSummaryBody`).
15. readability: Names that do not say what the thing does
    * File and line: `lib/homeCheckIn.ts`, line 25 (`homeCheckInProblem`); `data/staffActions.ts`, line 106 (`checkInVisitFromHome`); `lib/visitActions.ts`, line 90 (`checkInHomeVisit`); `lib/expectedArrivals.ts`, line 9 (`isExpected`); `lib/dashboardNumbers.ts`, line 106 (`on`).
    * Details: The three `...Home...` functions also handle `needs_reassessment` visits that originated at the desk. `isExpected` checks only un-triaged `pre_arrival` visits under 6 hours (excluding `needs_reassessment`). `on` in `siteNumbers` does not indicate that it checks whether a timestamp matches `today` in Toronto time.
16. readability: Stale comments that no longer match the code
    * File and line: `lib/demoTimes.ts`, lines 13 and 16; `lib/visitActions.ts`, line 127; `lib/trendNumbers.ts`, line 33; `data/keepFresh.ts`, lines 3-4; `lib/expectedArrivals.ts`, lines 1-2.
    * Details: `lib/demoTimes.ts` and `lib/visitActions.ts` quote the old labels `"Phone this patient"` and `"Phone a second time"` instead of `"Phone the patient now"` and `"Phone the patient again"`. `lib/trendNumbers.ts` says `False gives "No past days to download yet."`, whereas `docs/decisions.md` notes the dashboard shows `"No past days with visits yet."` and hides the download button. `data/keepFresh.ts` says it is used only by the patient's visit and the staff list, omitting `data/sitePauses.ts` and `data/dashboardRead.ts`. `lib/expectedArrivals.ts` describes only expected home arrivals and omits `backForReassessment`.
17. readability: Types wider than they need to be
    * File and line: `lib/visit.ts`, line 23; `lib/patientView.ts`, line 10; `lib/patientViewFromRow.ts`, lines 11-13; `lib/recallAlert.ts`, line 11; `lib/recentlyClosed.ts`, line 25; `lib/text/languages.ts`, line 6; `lib/visitActions.ts`, lines 17 and 26; `lib/startVisitRequest.ts`, line 10; `data/staffActions.ts`, line 32.
    * Details: `language` (and `LanguageInfo.code`) is typed as `string` instead of the 5 offered language codes; `PatientVisitRow.site`, `PatientVisitRow.status`, and `RecallAlertRow.status` are typed as `string` instead of `Site` and `VisitStatus`; and `closedLabel(visit: Visit)` accepts any `Visit` instead of narrowing to closed statuses (`"arrived" | "removed" | "unable_to_reach"`). No file in `lib/` or `data/` exceeds 300 lines.

## Claude's check

Checked on 2026-11-21 by reading the code (greps and file reads in this session). No test or browser run was made for this check. Verdicts: confirmed (the code does what Gemini says), plausible (needs a test or a real screen reader), not a fault, settled (a decision in docs/decisions.md covers it), or not checked.

### Part 1, security and privacy

- Fault 1 (Speed Insights): not a fault. `git grep` finds no `SpeedInsights` in app/, components/ or any code; only package.json:19 and docs/progress.md:112 ("installed, not used in code"). The package is unused. Owner decision: keep it or remove it.
- Questions 1 to 5: Gemini found no fault. Not checked again here; the permission checks in docs/progress.md stand.
- Hardening 1 (per-day guard on `/api/demo-plan`): worth doing, low priority. The route is cron-only behind `CRON_SECRET`.
- Hardening 2, 3, 4: low value. Not planned.

### Part 2, accessibility

- 1, 2, 3, 13 (two announcements at once on the patient screen): plausible. CallReminder.tsx is `aria-live="assertive"` after 300 ms, and StatusAnnouncer.tsx puts the urgent text in after 300 ms too, so both can fire together on an overdue call-back. Needs a real phone screen reader (TalkBack, VoiceOver) to confirm.
- 4 (sound on after iOS suspends audio): not checked. Needs an iPhone.
- 5 (still-here thank-you): not checked.
- 6 (dashboard summary, 4.1.3): confirmed. SummaryPanel.tsx shows the summary text with no live region, and the note's `role="status"` mounts with the note, so it may not be read.
- 7 (start page, 2.4.3): confirmed. StartVisit.tsx:113-121 "Start a new demo visit" has no focus move after the button leaves the page.
- 8 (check-in cancel, 2.4.3): confirmed. CheckInPanel.tsx cancelHome() calls onHomeDone(); app/staff/page.tsx moves focus only when `homeVisit` is set, not when it clears.
- 9 (Footer, 3.1.2): confirmed. components/Footer.tsx always shows `textFor("en").footer` with no `lang="en"` or `dir="ltr"`.
- 10 (target size, 2.5.8): likely not a fault. A lone inline link with no other target near it passes by the spacing exception.
- 11 (VisitRow status): plausible. VisitRow.tsx:160-164 mounts `role="status"` only while there is text.
- 12 (LanguageSwitch notice): not checked.
- 14 (focus outline on TrendTable and SurveyBox): plausible. TrendTable.tsx:68 has `tabIndex={0}` and no `focus-visible:` class.
- 15 unavailableText: confirmed. The text says "Your actions on this page are not saving", but the screen comes from a failed read (data/patientVisit.ts:46) and has no actions. Owner wording decision.
- 15 calledHeading: the words "Please head back now" are settled (decisions.md 2026-11-17, SPEC.md line 60). That the heading stays after `on_the_way` is confirmed (PatientStatus.tsx:65, 72). Owner decision: keep it or show a different heading after "I'm on my way".
- 15 jargon list: settled. Plain-language rewrites wait for the fluent review (decisions.md 2026-11-17).
- 16 (names, ExpectedArrivals three jobs): not checked. Readability only.

### Part 3, code quality

- 1 (`textFor`, `fill` prototype lookups): hardening only. Every language code is checked against LANGUAGE_CODES before use (data/savedLanguage.ts).
- 2 (summary stop reasons): confirmed. lib/summaryAnswer.ts checks only `refusal` and `max_tokens`; lib/demoPlanReply.ts already rejects every stop reason that is not `end_turn`.
- 3 (local clock): confirmed, small. data/visitCache.ts loadVisits uses `Date.now()` for the cutoff, and the first `serverNow()` returns before `syncClock()` answers (offset 0).
- 4 (staffSignIn): confirmed, all 3 parts. The `getClaims` error is ignored, a 429 or 408 maps to "wrong", and signOutStaff has no try/catch.
- 5 (recallAll): confirmed. data/staffActions.ts calls `putVisit` per row, and each `putVisit` starts a `loadVisits()`.
- 6 (other database errors become "not saved"): not checked.
- 7 (formatWaitRange): not a fault for the current inputs. lib/waitText.ts:45 puts `low` in as a number when `high < 60`, but the range comes in as whole minutes; `NaN` is turned into 0 by formatDuration.
- 8 (ISO string sorts): plausible, low. All timestamps come from the same database in the same form, and the order is only for display.
- 9 (`torontoDay("")`): not reached. DashboardView.tsx calls the number functions only when visits are loaded.
- 10 (closedLabel): not a fault. lib/recentlyClosed.ts calls it only for closed visits.
- 11, 12, 13 (dead code): not checked. Gemini says most callers are likely in app/ or components/, which were not in its bundle.
- 14, 15, 17 (files with two jobs, names, wide types): not checked. Readability only.
- 16 (stale comments): confirmed for lib/demoTimes.ts:12 and 15, lib/visitActions.ts:145 (old labels "Phone this patient", "Phone a second time"; FollowUpPanel.tsx uses "Phone the patient now", "Phone the patient again") and data/keepFresh.ts (also used by data/sitePauses.ts and data/dashboardRead.ts). Gemini is wrong on lib/trendNumbers.ts:36: "No past days to download yet." matches components/dashboard/CsvButton.tsx:14.

### Proposed fix list (needs the owner's OK and a plan, because it touches lib/, data/ and components/)

1. Part 3 #2: summaryAnswer rejects every stop reason that is not `end_turn`, as demoPlanReply does.
2. Part 3 #4: staffSignIn handles the `getClaims` error, maps 429 and 408 to "no connection", and signOutStaff gets a try/catch.
3. Part 3 #5: recallAll loads the list once.
4. Part 2 #6, #7, #8, #9: summary live region, 2 focus moves, Footer `lang="en" dir="ltr"`.
5. Part 3 #16: fix the 3 stale comments.
6. Wording: unavailableText, and the heading after `on_the_way`, as the owner decides.
