-- Phase 3: the "Pause off-site waiting" switch (SPEC /staff and /).
-- 1. The app's server (the service_role connection, used only by server routes) may read the
--    site letter and the switch, so /api/site-status can tell the start page to hide
--    "Start a visit" while a site is paused. Patients (anon) and staff (authenticated) get
--    no new rights; staff already read and change site_settings under row-level security.
-- 2. The database sets paused_at itself: now() when a site is paused, empty when it is turned
--    back on, so no device clock decides it.

grant select (site, offsite_paused) on table public.site_settings to service_role;

create function public.site_settings_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.offsite_paused and not old.offsite_paused then
    new.paused_at := now();
  elsif not new.offsite_paused then
    new.paused_at := null;
  else
    new.paused_at := old.paused_at;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.site_settings_before_update() from public, anon, authenticated;

create trigger site_settings_before_update
  before update on public.site_settings
  for each row execute function public.site_settings_before_update();
