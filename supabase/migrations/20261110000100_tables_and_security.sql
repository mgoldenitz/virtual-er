-- Phase 2, part 1: the tables and who may touch them (SPEC "Data" section and hard rule 5).
-- Patients (the "anon" role) get no access to these tables at all; they use the
-- functions in the next file. Only logged-in staff can read or change visits.

-- ---------------------------------------------------------------------------
-- Who counts as staff: a logged-in user whose account is marked role = staff.
-- The mark lives in app_metadata, which only the project owner can set (users cannot
-- change it themselves), so turning sign-ups on by mistake would not make anyone staff.
-- ---------------------------------------------------------------------------
create function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false);
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- visits: one row per visit. No names, health card numbers, phone numbers or symptoms.
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  -- 6-character display code, no look-alike characters (same alphabet as lib/codes.ts).
  code text not null unique check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  -- 26 Crockford base32 characters = 128 random bits (lib/codes.ts makeAccessToken).
  access_token text not null unique check (access_token ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  site text not null check (site in ('A', 'B')),
  source text not null check (source in ('home', 'desk')),
  ctas_level smallint check (ctas_level in (4, 5)),
  language text not null default 'en' check (language ~ '^[a-z]{2,3}$'),
  status text not null check (status in (
    'pre_arrival', 'waiting', 'called', 'on_the_way', 'arrived', 'unable_to_reach',
    'needs_reassessment', 'removed', 'declined', 'not_eligible')),
  removed_reason text check (removed_reason in ('left', 'no_show')),
  created_at timestamptz not null default now(),
  triaged_at timestamptz,
  offered_at timestamptz,
  last_still_here_at timestamptz,
  called_at timestamptz,
  seen_at timestamptz,
  confirmed_at timestamptz,
  review_flagged_at timestamptz,
  arrived_at timestamptz,
  closed_at timestamptz,
  phone_attempts integer not null default 0 check (phone_attempts >= 0),
  last_phone_result text check (last_phone_result in ('answered', 'no_answer')),
  followup_paused_until timestamptz,
  survey_score smallint check (survey_score between 0 and 10),
  is_demo boolean not null default false,
  -- A removed visit always has a reason, and only a removed visit has one.
  constraint removed_has_reason check ((status = 'removed') = (removed_reason is not null))
);

-- The off-site line is read by site and ordered by triage time (never created_at).
create index visits_site_line on public.visits (site, status, triaged_at, id);

alter table public.visits enable row level security;

-- Row-level security only filters rows; the role also needs the table rights themselves.
-- This project gives new tables no read or write rights by default, so grant exactly these.
revoke all on table public.visits from anon, authenticated;
grant select, insert, update on table public.visits to authenticated;

create policy "Staff can read visits" on public.visits
  for select to authenticated using ((select public.is_staff()));
create policy "Staff can add visits" on public.visits
  for insert to authenticated with check ((select public.is_staff()));
create policy "Staff can change visits" on public.visits
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
-- No delete policy: in Phase 3 visits are deleted only by the 24-hour clean-up.

-- ---------------------------------------------------------------------------
-- site_settings: the "pause off-site waiting" switch per site. Staff only.
-- ---------------------------------------------------------------------------
create table public.site_settings (
  site text primary key check (site in ('A', 'B')),
  offsite_paused boolean not null default false,
  paused_at timestamptz
);

insert into public.site_settings (site) values ('A'), ('B');

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from anon, authenticated;
grant select, update on table public.site_settings to authenticated;

create policy "Staff can read site settings" on public.site_settings
  for select to authenticated using ((select public.is_staff()));
create policy "Staff can change site settings" on public.site_settings
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- change_signal: one row whose time is touched on every change to visits or settings.
-- It holds no visit data. Phones and staff screens listen to it, then re-read what
-- they are allowed to see (hard rule 5: patient pages never subscribe to visit rows).
-- ---------------------------------------------------------------------------
create table public.change_signal (
  id smallint primary key default 1 check (id = 1),
  changed_at timestamptz not null default now()
);

insert into public.change_signal (id) values (1);

alter table public.change_signal enable row level security;

revoke all on table public.change_signal from anon, authenticated;
grant select on table public.change_signal to anon, authenticated;

create policy "Anyone can see when something changed" on public.change_signal
  for select to anon, authenticated using (true);

create function public.touch_change_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.change_signal set changed_at = now() where id = 1;
  return null;
end;
$$;

revoke execute on function public.touch_change_signal() from public, anon, authenticated;

create trigger visits_changed
  after insert or update or delete on public.visits
  for each statement execute function public.touch_change_signal();

create trigger site_settings_changed
  after insert or update or delete on public.site_settings
  for each statement execute function public.touch_change_signal();

-- Live updates: only the signal table is published, never visits.
alter publication supabase_realtime add table public.change_signal;
