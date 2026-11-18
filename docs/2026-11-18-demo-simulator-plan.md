# Demo simulator plan

Written 2026-11-18 from branch phase3-review-fixes at edcebf2. Plan only: no code, SQL or SPEC change has been made.

## What it does

A small scheduled job plays both sides of the app so the staff screen and the patient screens look like a normal evening at both sites, all day. It uses no AI model. Each run it looks at the demo visits, then makes the next few moves a nurse or a patient would make:

- Staff side: add a triaged visit at the desk (mostly waiting off-site, sometimes declined or not eligible), recall the patient at the front of the demo line about every 12 to 18 minutes, mark called patients arrived, and now and then record a phone attempt and mark one unable to reach.
- Patient side: tap "Seen" and "I'm on my way" a minute or two after a recall, answer most "I'm still here" prompts, and miss about one in ten so the staff flags show up too. Once in a while a visit starts from home (pre_arrival) and is triaged later.

The targets come from the Phase 4 wait-range plan in docs/progress.md: about 9 demo visits waiting off-site per site and call-backs about 15 minutes apart. With the formula in lib/queue.ts, a real patient who checks in behind them is place 10 and sees "120 to 190 minutes". So the simulator also does the job of SPEC's "Demo mode" button, and it does it better, because the database sets every time to now() (visits_before_write), which means a one-click button cannot create visits "spread over the last few hours". A simulator that has been running for a few hours has real history.

## What it can use in Supabase

Everything it needs already exists:

- visits has an is_demo column (false by default). Every simulated row sets is_demo = true, and the simulator only ever reads or changes rows where is_demo is true.
- Staff moves are ordinary updates of visits. The step check trigger (visits_check_step, 20261117010000_step_check_fixes.sql) still applies, so the simulator cannot make a move the app itself could not make, and it is refused (VWR02) while a site's off-site waiting is paused.
- Patient moves are the same functions the phone uses: record_seen, confirm_on_my_way and record_still_here, each taking the visit's access token.
- start_home_visit always writes is_demo = false and counts toward the 10-starts-per-minute site cap, so the simulator should not use it. A demo home start is a plain insert with source = home, status = pre_arrival and is_demo = true.
- The 15-minute clean-up job (delete_old_visits, pg_cron) already deletes every visit after 24 hours and adds its numbers to daily_stats, which keeps demo numbers apart through its is_demo key.

## Where it runs: two options

I recommend option 1.

Option 1, inside Supabase (pg_cron). One new database function, for example simulate_demo_tick(), run by pg_cron every 5 minutes, next to the clean-up job that already runs there. Nobody can call it from outside: the migration revokes it from public, anon, authenticated and service_role, as delete_old_visits does. It needs no password, no key and no GitHub secret, it runs on time, and 5-minute steps fit the app's timings (still-here prompt every 30 minutes, answer within 10; recall alerts at 10, 20 and 30 minutes). The cost is that the logic is SQL, which is harder to read and has no unit tests in the npm test run; a check file in supabase/checks/ would cover it, as with the other migrations. The main risk is a mistake in a function that runs with owner rights, so every statement filters on is_demo = true and the check file confirms that no real visit changed.

Option 2, a script on GitHub Actions (the coordinator's first suggestion). A Node script in scripts/ on a schedule. It signs in with a dedicated staff account (for example sim-staff, marked role = staff in app_metadata like Michael's account) using the publishable key, so row-level security treats it like any staff browser. It reads the demo visits (staff can read access tokens) and calls the patient functions with those tokens. Its advantages are TypeScript, unit tests, and a path that exercises the same rules as the app. Its drawbacks: it needs a staff password stored as a secret; GitHub's schedule is a minimum of every 5 minutes and runs are often late or skipped when GitHub is busy; scheduled workflows stop after 60 days without repository activity (not a problem before 2026-12-07); and 15 to 30 minute steps are too coarse for the 10-minute recall alerts, so simulated patients would often look like they missed alerts. It should not use the Supabase secret key, because that key skips row-level security and gives the script more power than staff have.

## Keeping fake visits apart from real ones

There are two ways, and this choice is Michael's (decision card in the thread):

- Same sites A and B, tagged is_demo (recommended). This is what the Phase 4 wait-range plan already decided: get_patient_visit counts demo visits in every patient's place in line, which is how a real patient sees a 2 to 3 hour range. It needs no change to the site list. What it needs: a small "Demo" tag on demo rows in the staff screen, and a way to switch the simulator off and clear demo data before the Phase 5 real testers.
- A separate demo site. Fake visits never touch sites A and B, so real visits stay clean. But real patients then see short waits, the wait-range plan no longer works, and a third site touches the check constraints on visits and site_settings, the start-visit request check, the site picker, the staff screen and the pause rules.

## Turning it on and off, and clean-up

- On/off: version one is the cron job itself (scheduled or unscheduled from the SQL editor, or the workflow enabled or disabled on GitHub). Later, a one-row demo switch that staff can flip from the staff screen.
- No nightly job is needed for visits: the existing 24-hour clean-up already removes them, so a steady run keeps about a day of demo visits (a few hundred rows at most).
- daily_stats keeps one demo row per site per day. A small addition can drop demo rows older than 14 days.
- "Clear demo data" (already in SPEC) becomes one staff action that switches the simulator off, then deletes all is_demo visits and all demo rows in daily_stats. It must be run before real testing.

## Keep-alive

The daily keep-alive already exists: vercel.json runs /api/keep-alive at 12:00 UTC every day, and it is protected by CRON_SECRET. Keep it as it is. The simulator should not replace it, because with option 1 its activity happens inside the database, and I have not confirmed that Supabase counts that as project activity for the free-plan pause.

## Secrets

Option 1 has none. For option 2, Michael adds them himself on GitHub (repository Settings > Secrets and variables > Actions), typed into the browser, never into chat or a terminal with the ! prefix: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SIM_STAFF_EMAIL and SIM_STAFF_PASSWORD. The sim-staff account is created in the Supabase dashboard (sign-ups stay off) and can be disabled on its own without touching his account.

## Cost

No model is called, so there is no AI cost. Option 1 runs on the Supabase free plan: a few hundred small rows and one realtime signal per run (every open screen re-reads once). Vercel is not involved. Option 2 is free on a public repository. On a private repository the free plan includes 2,000 Actions minutes a month and each run is billed as at least one minute, so every 15 minutes (about 2,880 runs a month) would go over, and every 30 minutes (about 1,440) would fit, leaving roughly 560 minutes for the checks workflow. I could not check from here whether the repository is public.

## Timing

- Finish Phase 3 first (WCAG check, /security-review, the two Gemini Hydrogen 4 reviews, closing save point). The simulator writes to the live database, so it should not start while Phase 3 fixes are still landing.
- Build it as the first Phase 4 item, because it replaces the "Demo mode" button and the dashboard needs demo data to check its numbers. Before building, SPEC's "Demo mode" section needs rewording (from a button to a simulator); that is a SPEC change for Michael to approve.
- Aim to have it running by 2026-11-30, so it runs for a week before the 2026-12-07 presentation. Freeze changes to it by 2026-12-04.
- On 2026-12-07, have it running for at least 3 hours before the presentation so the call-back history is full.
- Switch it off and run "Clear demo data" before the Phase 5 real testers start.

## Other models to consult

- Gemini Hydrogen 4, High: review the simulator function (or script) and its migration for security, mainly that it can only touch is_demo rows. CLAUDE.md asks for this review after each small change.
- Gemini 3.6 Flash, High: CLAUDE.md gives it the job of writing 15 to 20 synthetic visits with the dashboard numbers they should produce. With a simulator, ask it instead for the targets the simulator should hold (counts per status, call-back gaps) and the dashboard numbers those should produce, with the expected 120 to 190 minute wait range included.

## Things to decide

1. Decided (Michael, 2026-11-18): same sites A and B, with demo visits tagged is_demo.
2. Option 1 (Supabase pg_cron) or option 2 (GitHub Actions).
3. Approve the SPEC change to "Demo mode" when Phase 4 starts.
