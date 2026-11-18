# Review: demo simulator (Phase 4, step 1)

Model: Gemini Hydrogen 4, High, in a new chat.

## What to paste into Gemini

Paste everything below the line "Text for Gemini", and the three files it names:

- supabase/migrations/20261118000000_demo_settings.sql (80 lines, new)
- supabase/migrations/20261118000100_demo_simulator.sql (174 lines, new)
- supabase/checks/demo_tick.sql (89 lines, new)

Also changed: supabase/checks/permissions.sql (63 lines; only a comment above the expected list, 4 lines added, 1 removed).

## Text for Gemini

Find problems in this code. Do not confirm that it is correct. List each problem with the file, the line, and a concrete case where it goes wrong.

The project is a concept prototype of a virtual ER waiting room on Supabase (Postgres). Synthetic data only. Low-acuity patients wait off-site, follow their place in line on their phone, and come back when staff recall them. Table public.visits holds real visits (is_demo = false) and demo visits (is_demo = true) at sites A and B. Real patients' place in line counts demo visits too, on purpose, so the demo shows a 2 to 3 hour wait.

The new function public.simulate_demo_tick() runs from pg_cron every 5 minutes as the database owner (security definer, so row-level security does not apply). It plays staff and patients for demo visits only. It does nothing unless demo_settings.running is true.

Main question: can simulate_demo_tick, demo_new_token or demo_new_code change, delete or reveal any visit with is_demo = false, in any case (concurrent staff actions, a paused site, a token or code clash, a trigger error, a second run at the same time)?

Other questions:
1. Can a tick stop with an error (for example the VWR02 pause error below) and so leave the demo stuck? Is a stopped tick harmless?
2. Does any move break the allowed moves in visits_check_step below?
3. Can anyone other than pg_cron run these functions? (Each is revoked from public, anon, authenticated and service_role.)
4. Does demo_tick.sql prove what it says? It runs inside begin ... rollback, pauses the visits_before_write trigger only while it moves demo times back 5 minutes, and compares each real visit's version before and after.
5. Simpler ways to do the same thing.

Facts the code depends on (not in the three files):

- visits_before_write (before insert or update, each row): on insert sets version = 1 and sets every non-null time column to now(); on update adds 1 to version and sets each time column that changed to a non-null value to now().
- visits_check_step (before insert or update, each row): a new visit may start only as pre_arrival, waiting, declined or not_eligible. Site may not change. Allowed status moves: pre_arrival to waiting, declined or not_eligible; needs_reassessment to waiting, declined or not_eligible; waiting to called, arrived or removed; called to on_the_way, arrived, removed or unable_to_reach; on_the_way to arrived or removed; unable_to_reach to needs_reassessment; arrived, removed to waiting, called or on_the_way (undo). A new waiting visit (insert, or a move from pre_arrival or needs_reassessment) raises VWR02 if site_settings.offsite_paused for that site is not false (read with "for share").
- An after-statement trigger on visits updates a one-row change_signal table, even when zero rows change.
- visits.code and visits.access_token are unique, with checks ^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$ and ^[0-9A-HJKMNP-TV-Z]{26}$.
- The patient functions the tick calls (newest versions):

```sql
create function public.record_seen(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits set seen_at = now()
  where access_token = p_token and status = 'called' and seen_at is null;
  return found;
end; $$;

create or replace function public.confirm_on_my_way(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now(), seen_at = coalesce(seen_at, now())
  where access_token = p_token and status = 'called';
  return found;
end; $$;

create function public.record_still_here(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits set last_still_here_at = now()
  where access_token = p_token and status = 'waiting';
  return found;
end; $$;
```

## Checked (output in this session, 2026-11-18)

- Both migrations ran in the SQL Editor without errors; cron job simulate-demo is active, */5 * * * *.
- supabase/checks/permissions.sql: the list is the same as before (anon and authenticated get nothing new); no table without row-level security.
- supabase/checks/demo_tick.sql: real visits changed 0; site A waiting 9; site B waiting 9; site B new waiting while paused 0; call-backs at A 9.
- npm test: 65 files, 376 tests passed. npm run lint: no errors. npm run build: completed.

## Not checked

- The simulator has not run live yet (demo_settings.running is still false).
- What happens when a staff member pauses a site during a tick.
- How the staff and patient screens look with demo visits.

## What to bring back

Gemini's full answer. Paste it under "Response" below.

## Response
