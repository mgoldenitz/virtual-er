-- Phase 4 dashboard: signed-in staff may read daily_stats (the totals of deleted visits),
-- so /dashboard can show a day as its daily_stats totals plus the visits still in the table
-- (SPEC hard rule 4). Read only: only delete_old_visits() and clear_demo_data() change it.
-- Patients (anon) still get nothing.

grant select on table public.daily_stats to authenticated;

create policy "Staff can read daily stats" on public.daily_stats
  for select to authenticated using ((select public.is_staff()));
