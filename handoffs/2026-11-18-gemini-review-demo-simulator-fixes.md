# Review: demo simulator fixes (Phase 4, step 1b, review round 2)

Model: Gemini Hydrogen 4, High, in a new chat (not the chat of round 1).

## What to paste into Gemini

Paste everything below the line "Text for Gemini", and these two files:

- supabase/migrations/20261118000200_demo_simulator_fixes.sql (208 lines, new)
- supabase/checks/demo_tick.sql (126 lines, changed: 54 lines added, 13 removed, then 2 lines of the expected range)

## Text for Gemini

Find problems in this code. Do not confirm that it is correct. List each problem with the file, the line, and a concrete case where it goes wrong.

The project is a concept prototype of a virtual ER waiting room on Supabase (Postgres). Synthetic data only. Table public.visits holds real visits (is_demo = false) and demo visits (is_demo = true) at sites A and B. Real patients' place in line counts demo visits too, on purpose.

public.simulate_demo_tick() runs from pg_cron every 5 minutes as the database owner (security definer). It plays staff and patients for demo visits only, and does nothing unless demo_settings.running is true. The migration replaces an earlier version with these changes, from a first review:

1. Time rules have 1 minute of slack (4, 9, 19, 29 minutes), because each cron tick's now() is a few ms after the 5-minute mark.
2. unable_to_reach needs phone_attempts >= 2.
3. The home start update (pre_arrival to waiting) and the desk insert are each in begin ... exception when sqlstate 'VWR02' then v_paused := true; end; so a site pause during a tick does not roll back the work for the other site.
4. No desk starts while a site is paused (owner choice).
5. Execute on the function is revoked from public, anon, authenticated and service_role; all rights on demo_settings are revoked from service_role.

Settled, do not report:
- Place in line is ordered by triaged_at only, never by CTAS (SPEC). The recall order "order by triaged_at, id" is correct.
- A unique clash on code or token with a real insert in the same ms only stops one tick; no fix.
- One change_signal write per row is fine; all writes are in one transaction.
- A home start can make 10 demo visits waiting (desk starts stop at 9); the check allows 7 to 10 (owner choice).
- The check pauses visits_before_write, because that trigger sets every new time to now(); a p_now parameter would be written over.

Main question: can the new function change, delete or reveal any visit with is_demo = false, in any case?

Other questions:
1. Does each VWR02 block work as meant? After the exception, is v_paused true and does the rest of that site's step stop? Can any other error now be caught and hidden by mistake?
2. Is there any move the 1-minute slack makes too early or makes happen twice?
3. Does demo_tick.sql (rows 0 to 8) prove what each row says?

Facts the code depends on (not in the files):
- visits_before_write (before insert or update, each row): on insert sets version = 1 and sets every non-null time column to now(); on update adds 1 to version and sets each time column that changed to a non-null value to now().
- visits_check_step (before insert or update, each row): a new visit may start only as pre_arrival, waiting, declined or not_eligible. Allowed moves: pre_arrival to waiting, declined or not_eligible; waiting to called, arrived or removed; called to on_the_way, arrived, removed or unable_to_reach; on_the_way to arrived or removed; unable_to_reach to needs_reassessment. A new waiting visit (insert, or a move from pre_arrival or needs_reassessment) raises SQLSTATE VWR02 if site_settings.offsite_paused for that site is not false.
- record_seen, confirm_on_my_way and record_still_here are security definer functions that update one visit by its unique access_token (unchanged since round 1).

## Checked (output in this session, 2026-11-18)

- The migration ran in the SQL Editor without errors. A read-only query shows the new body is live, service_role has no select on demo_settings, the cron job is active, running is false, 0 demo visits.
- supabase/checks/permissions.sql: the list is the same as before.
- supabase/checks/demo_tick.sql: 0 real visits checked 3; 1 real visits changed 0; 2 site A waiting 10; 3 site B waiting 9; 4 site B new waiting after pause 0; 5 call-backs at A 9; 6 demo arrived 15; 7 phone attempts recorded 10; 8 changes while running is false 0.
- npm test: 65 files, 376 tests passed. npm run lint: no errors. npm run build: completed.

## Not checked

- The second query of permissions.sql (no result pasted this round).
- A real VWR02 during a tick (a staff pause in the same moment). No check makes one.
- The simulator running live (running is still false).

## What to bring back

Gemini's full answer. Paste it under "Response" below.

## Response
