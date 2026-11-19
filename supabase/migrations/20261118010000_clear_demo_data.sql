-- Demo mode, part 3 (SPEC "Demo mode"): the "Clear demo data" staff action.
-- It switches the demo simulator off. Then it deletes every demo visit and every demo row in
-- daily_stats. Real visits and real daily_stats rows stay.
-- The owner runs this file once in the Supabase SQL Editor. Check: supabase/checks/demo_clear.sql.

-- Staff only. It returns how many demo visits it deleted.
create function public.clear_demo_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  -- A tick or a clean-up that is running ends first, so neither adds a demo visit or a demo
  -- daily_stats row after the delete.
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick'));
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits'));
  update public.demo_settings set running = false where id = 1;
  delete from public.visits where is_demo = true;
  get diagnostics v_deleted = row_count;
  delete from public.daily_stats where is_demo = true;
  return v_deleted;
end;
$$;

revoke execute on function public.clear_demo_data() from public, anon, service_role;
grant execute on function public.clear_demo_data() to authenticated;
