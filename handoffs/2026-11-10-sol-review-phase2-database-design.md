# Virtual Waiting Room: review the Phase 2 database design before it runs

This is a concept prototype. Low-acuity emergency patients (CTAS 4 or 5) can wait off-site after triage, follow their place in line on their phone, and come back when called. Phase 1 kept invented data in browser storage. Phase 2 moves it to Supabase (Postgres with row-level security, realtime, and Supabase Auth for staff), deployed on Vercel with Next.js. This file contains no keys, tokens, passwords, project IDs or patient data.

## Rules the design must meet (from the project spec)

1. No real personal or health information. A visit has a 6-character display code (not secret) and a long random access token (at least 128 bits). Only the token opens a visit on a patient's phone. Only logged-in staff can look up a visit by its code.
2. A patient's token can read only its own visit, through one database function that returns only the fields a patient may see. Patients can do exactly five things, each through its own narrow function or server route:
   - start a visit from home: a rate-limited server route that itself sets source = home and status = pre_arrival; refused while off-site waiting is paused; never grants a place in line
   - record that the called screen was shown: sets seen_at once, only while called
   - confirm "I'm on my way": only while called
   - tap "I'm still here": only while waiting (Phase 3, not in these files)
   - submit a survey score once: after close, only if the visit waited off-site and arrived (Phase 4, not in these files)
   Everything else, including the queue, is staff only.
3. Patient pages learn about changes from a signal that holds no visit data, then re-read through the function. They never subscribe to visit rows.
4. Place in line is ordered by triage time, never by creation time.
5. Staff need to show a patient's QR code again later, so staff must be able to read the token.

## Design choices

- **Staff:** a logged-in user whose `app_metadata.role` is `staff`. Only the project owner can set that, so turning on sign-ups by mistake would not make anyone staff. Public sign-up will be off.
- **Patients:** the `anon` role has no rights on `visits` or `site_settings`. It can call `get_patient_visit`, `record_seen` and `confirm_on_my_way` (all `security definer`, `search_path = ''`).
- **Start from home:** `start_home_visit` can be called only by `service_role`, which is held by a Next.js server route. The route makes the code and token in TypeScript and retries if they are already taken. The function checks the pause switch and a cap of 30 starts per site per minute. A per-device limit is planned as a Vercel firewall rule.
- **Live updates:** only the one-row `change_signal` table is in the realtime publication. A statement-level trigger on `visits` and `site_settings` touches it. Staff screens also listen to it and then re-read visits.
- **Staff changes:** made straight on `visits` under row-level security. The app checks the expected current status in the `where` clause, so a double click or two screens can't both apply the same step.
- **Not yet:** the 24-hour deletion, daily_stats, "I'm still here" and the survey come in Phases 3 and 4.

## The SQL

### 20261110000100_tables_and_security.sql

```sql
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

revoke all on table public.visits from anon;

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

revoke all on table public.site_settings from anon;

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
```

### 20261110000200_patient_functions.sql

```sql
-- Phase 2, part 2: everything a patient's phone may do, each as one narrow function
-- (hard rule 5). A phone proves which visit is its own only with the long access token.
-- These functions run with the table owner's rights ("security definer"), so they can
-- reach the visits table that patients cannot, and they return or change only what
-- the rule allows. Each mirrors a rule in lib/ (named in its comment).

-- ---------------------------------------------------------------------------
-- Read my visit: the patient-safe fields only (lib/patientView.ts PatientView).
-- Place in line counts patients still waiting at the same site who were triaged earlier
-- (ties broken by id, like lib/queue.ts). The wait range itself is worked out in
-- lib/queue.ts from place_in_line and average_gap_minutes, so that rule stays tested.
-- ---------------------------------------------------------------------------
create function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 5 call-backs at this site; null with under 2 call-backs.
  average_gap_minutes double precision,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    me.code,
    me.site,
    me.language,
    me.status,
    case when me.status = 'waiting' and me.triaged_at is not null then (
      select count(*)::integer + 1
      from public.visits other
      where other.site = me.site
        and other.status = 'waiting'
        and other.triaged_at is not null
        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
    ) end,
    case when me.status = 'waiting' then (
      -- The average of the gaps between 6 call-backs is (last - first) / 5.
      select case when count(*) >= 2
        then extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1)
      end
      from (
        select other.called_at
        from public.visits other
        where other.site = me.site and other.called_at is not null
        order by other.called_at desc
        limit 6
      ) last6
    ) end,
    me.called_at,
    me.last_still_here_at,
    me.seen_at is not null,
    me.closed_at is not null,
    me.status = 'pre_arrival' and me.triaged_at is null
      and me.created_at <= now() - interval '6 hours'
  from public.visits me
  where me.access_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- The called screen was shown: sets seen_at once, only while called (lib markSeen).
-- Returns true if it was recorded, false if the step is not allowed now.
-- ---------------------------------------------------------------------------
create function public.record_seen(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set seen_at = now()
  where access_token = p_token and status = 'called' and seen_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- "I'm on my way": only while called (lib confirmOnMyWay).
-- ---------------------------------------------------------------------------
create function public.confirm_on_my_way(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now()
  where access_token = p_token and status = 'called';
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Start a visit from home. Only the app's server route may call this (it holds the
-- server-only key); browsers cannot. The function itself sets source = home and
-- status = pre_arrival, so it never grants a place in line (hard rule 7).
-- The server route makes the code and token with lib/codes.ts and retries on "taken".
-- Returns: saved, paused (off-site waiting is paused at this site), busy (too many
-- starts at this site in the last minute), or taken (code or token already used).
-- ---------------------------------------------------------------------------
create function public.start_home_visit(p_site text, p_language text, p_code text, p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.site_settings where site = p_site and offsite_paused) then
    return 'paused';
  end if;
  -- A demo-sized cap for the whole site. A per-device limit is added on Vercel.
  if (select count(*) from public.visits
      where site = p_site and source = 'home' and created_at > now() - interval '1 minute') >= 30 then
    return 'busy';
  end if;
  insert into public.visits (code, access_token, site, source, language, status)
  values (p_code, p_token, p_site, 'home', p_language, 'pre_arrival');
  return 'saved';
exception
  when unique_violation then
    return 'taken';
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. New functions are callable by everyone unless this is done.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
revoke execute on function public.record_seen(text) from public, anon, authenticated;
revoke execute on function public.confirm_on_my_way(text) from public, anon, authenticated;
revoke execute on function public.start_home_visit(text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;
grant execute on function public.record_seen(text) to anon, authenticated;
grant execute on function public.confirm_on_my_way(text) to anon, authenticated;
grant execute on function public.start_home_visit(text, text, text, text) to service_role;
```

## Questions for you

1. Can a patient (`anon`), or a logged-in user who is not staff, read or change any visit other than through the three patient functions? Look for gaps in the grants, policies, `security definer` functions and realtime.
2. Do any of the patient functions leak more than they should? For example, could a guessed or wrong token tell someone anything, or could place in line or the average gap reveal something about other visits?
3. Are there race conditions or abuse paths in `start_home_visit`, `record_seen` or `confirm_on_my_way`?
4. Is anything here a Supabase or Postgres mistake? For example, default privileges, the realtime publication with row-level security, or trigger permissions.
5. What is the one change you would make first?

Please rank your findings by severity. Keep each to two or three sentences, and quote the line of SQL it is about.
