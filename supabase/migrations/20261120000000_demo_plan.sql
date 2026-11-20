-- Demo mode, part 3: the daily day plan (docs/2026-11-20-claude-features-plan.md, feature 2).
-- Once a day the route app/api/demo-plan asks Claude for the chances the simulator uses, checks
-- them (lib/demoPlan.ts) and saves them with set_demo_plan. The simulator reads them in place of
-- its old fixed numbers. The owner runs this file once in the Supabase SQL Editor.
--
-- What does not change:
-- - The CTAS level stays random 4 or 5 in SQL. Claude never sets it (SPEC hard rule 2).
-- - The recall minutes (12 and 18), the target of 9 waiting, at most 2 desk starts per tick,
--   the 1 in 10 non-responders, the phone steps and every time limit (SPEC.md line 118).
-- - Every change still touches only demo visits (is_demo = true).
-- - The service_role key still may not read or change demo_settings, so it cannot switch the
--   simulator on. It may only call set_demo_plan, which changes the 8 chances and nothing else.
--
-- The defaults are the old fixed numbers, so the simulator acts the same until a plan comes.
-- The ranges here are the same as PLAN_LIMITS in lib/demoPlan.ts. Keep the two the same.

-- 1. The plan columns. Each check refuses a number outside its range, from any caller.
alter table public.demo_settings
  add column seen_chance numeric(3,2) not null default 0.70 check (seen_chance between 0.30 and 0.95),
  add column on_my_way_chance numeric(3,2) not null default 0.70 check (on_my_way_chance between 0.30 and 0.95),
  add column still_here_chance numeric(3,2) not null default 0.70 check (still_here_chance between 0.30 and 0.95),
  add column arrive_chance numeric(3,2) not null default 0.50 check (arrive_chance between 0.20 and 0.90),
  add column quick_recall_chance numeric(3,2) not null default 0.50 check (quick_recall_chance between 0.30 and 0.70),
  add column home_start_chance numeric(3,2) not null default 0.10 check (home_start_chance between 0.02 and 0.30),
  add column desk_offer_chance numeric(3,2) not null default 0.80 check (desk_offer_chance between 0.50 and 0.95),
  add column english_share numeric(3,2) not null default 0.70 check (english_share between 0.30 and 0.90),
  add column plan_set_at timestamptz;

-- 2. set_demo_plan: saves the 8 chances. A number outside its range fails the check above, so
-- nothing is saved. It never touches the running switch or any visit.
create or replace function public.set_demo_plan(
  p_seen_chance numeric,
  p_on_my_way_chance numeric,
  p_still_here_chance numeric,
  p_arrive_chance numeric,
  p_quick_recall_chance numeric,
  p_home_start_chance numeric,
  p_desk_offer_chance numeric,
  p_english_share numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.demo_settings
  set seen_chance = p_seen_chance,
      on_my_way_chance = p_on_my_way_chance,
      still_here_chance = p_still_here_chance,
      arrive_chance = p_arrive_chance,
      quick_recall_chance = p_quick_recall_chance,
      home_start_chance = p_home_start_chance,
      desk_offer_chance = p_desk_offer_chance,
      english_share = p_english_share,
      plan_set_at = now()
  where id = 1;
end;
$$;

-- Only the server's secret key (service_role) may call it. Browsers (anon, authenticated) may not.
revoke execute on function public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  to service_role;

-- 3. The simulator, the same as 20261118000200_demo_simulator_fixes.sql, but each chance now
-- comes from the plan (p.seen_chance and so on). Search for "coalesce(p." to see each change.
create or replace function public.simulate_demo_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site text;
  v_paused boolean;
  v_last_call timestamptz;
  v_waiting bigint;
  v_added integer;
  v_lang text;
  v_status text;
  r record;
  p record; -- today's day plan (the chances), read once per run
begin
  -- If another run is still going, stop. The lock ends with this run's transaction.
  if not pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick')) then
    return;
  end if;
  -- Do nothing unless the owner has switched the simulator on.
  if coalesce((select running from public.demo_settings where id = 1), false) is false then
    return;
  end if;
  -- The day plan. A missing row cannot happen (id 1 always exists), but each value falls back
  -- to the simulator's old fixed number anyway.
  select seen_chance, on_my_way_chance, still_here_chance, arrive_chance, quick_recall_chance,
         home_start_chance, desk_offer_chance, english_share
  into p from public.demo_settings where id = 1;

  foreach v_site in array array['A', 'B'] loop
    -- The off-site pause for this site. A missing or empty value counts as paused (fail safe).
    select offsite_paused into v_paused from public.site_settings where site = v_site;
    v_paused := coalesce(v_paused, true);

    -- 1. Patient side. About 1 in 10 demo visits is a non-responder: it never taps anything.
    -- First, the called screen is shown (plan: seen_chance, normally 70% of the time).
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'called' and seen_at is null and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < coalesce(p.seen_chance, 0.7) then
        perform public.record_seen(r.access_token);
      end if;
    end loop;

    -- Then "I'm on my way" for a called screen that was shown (plan: on_my_way_chance, normally 70%).
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'called' and seen_at is not null and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < coalesce(p.on_my_way_chance, 0.7) then
        perform public.confirm_on_my_way(r.access_token);
      end if;
    end loop;

    -- "I'm still here" for a waiting patient whose last prompt, or triage, was 29 minutes ago.
    -- Slack: 29 instead of 30, for cron jitter.
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'waiting' and coalesce(last_still_here_at, triaged_at) <= now() - interval '29 minutes'
        and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      -- Plan: still_here_chance, normally 70%.
      if random() < coalesce(p.still_here_chance, 0.7) then
        perform public.record_still_here(r.access_token);
      end if;
    end loop;

    -- 2. Staff side. Staff arrivals, simulated phone calls and unable-to-reach.
    -- A patient who said "on my way" 4 minutes ago arrives (plan: arrive_chance, normally half of them).
    -- Slack: 4 minutes instead of 5, for cron jitter.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'on_the_way' and confirmed_at <= now() - interval '4 minutes'
    loop
      if random() < coalesce(p.arrive_chance, 0.5) then
        update public.visits set status = 'arrived', arrived_at = now(), closed_at = now()
        where id = r.id and is_demo = true;
      end if;
    end loop;

    -- Simulated phone calls with no answer: the first 9 minutes after the call-back,
    -- the second 19 minutes after it. A call that was answered is never repeated.
    -- Slack: 1 minute less than 10 and 20, for cron jitter.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'called' and last_phone_result is distinct from 'answered'
        and ((phone_attempts = 0 and called_at <= now() - interval '9 minutes')
          or (phone_attempts = 1 and called_at <= now() - interval '19 minutes'))
    loop
      update public.visits set phone_attempts = phone_attempts + 1, last_phone_result = 'no_answer'
      where id = r.id and is_demo = true;
    end loop;

    -- No answered call 29 minutes after the call-back, and at least 2 phone attempts: unable to reach.
    -- Slack: 29 instead of 30, for cron jitter. The 2-attempt rule means a call that was never
    -- tried twice is not closed as unable to reach.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'called' and called_at <= now() - interval '29 minutes'
        and last_phone_result is distinct from 'answered'
        and phone_attempts >= 2
    loop
      update public.visits set status = 'unable_to_reach', closed_at = now()
      where id = r.id and is_demo = true;
    end loop;

    -- 3. Recall. Call the longest-waiting demo patient when the last demo call is old enough.
    v_last_call := (select max(called_at) from public.visits where is_demo = true and site = v_site);
    -- Recall when the last demo call is 18 minutes old, or 12 minutes old part of the time
    -- (plan: quick_recall_chance, normally half). The 12 and 18 minutes stay fixed (SPEC.md line 118).
    -- With 5-minute ticks this gives gaps of 15 or 20 minutes, so the phone shows about 120 to 190.
    if (v_last_call is null
        or v_last_call <= now() - interval '18 minutes'
        or (v_last_call <= now() - interval '12 minutes' and random() < coalesce(p.quick_recall_chance, 0.5)))
       and exists (select 1 from public.visits where is_demo = true and site = v_site and status = 'waiting')
    then
      update public.visits set status = 'called', called_at = now()
      where is_demo = true and id = (
        select id from public.visits
        where is_demo = true and site = v_site and status = 'waiting'
        order by triaged_at, id
        limit 1);
    end if;

    -- 4. Home starts. Nothing joins the line while the site is paused.
    if not v_paused then
      -- A home visit 9 minutes old reaches triage: it joins the line, CTAS 4 or 5 at random.
      -- Slack: 9 minutes instead of 10, for cron jitter.
      -- If the trigger refuses the move (VWR02, the site is paused), this site's home starts stop.
      for r in select id from public.visits where is_demo = true and site = v_site
          and status = 'pre_arrival' and created_at <= now() - interval '9 minutes'
      loop
        begin
          update public.visits
          set status = 'waiting', ctas_level = case when random() < 0.5 then 4 else 5 end,
              triaged_at = now(), offered_at = now()
          where id = r.id and is_demo = true;
        exception when sqlstate 'VWR02' then
          v_paused := true;
        end;
        exit when v_paused;
      end loop;
      -- Plan: home_start_chance (normally 1 time in 10), a new visit starts from home (not yet in the line).
      -- Skipped if the site was found paused just above.
      if not v_paused and random() < coalesce(p.home_start_chance, 0.1) then
        v_lang := case when random() < coalesce(p.english_share, 0.7) then 'en'
          else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
        insert into public.visits (code, access_token, site, source, status, language, is_demo)
        values (public.demo_new_code(), public.demo_new_token(), v_site, 'home', 'pre_arrival', v_lang, true);
      end if;
    end if;

    -- 5. Desk starts. Keep about 9 demo visits waiting at this site, adding at most 2 per tick.
    -- Only a new "waiting" visit counts toward the 9.
    -- Owner choice: no desk starts while the site is paused, so this whole step is skipped then.
    if not v_paused then
      select count(*) into v_waiting from public.visits
      where is_demo = true and site = v_site and status = 'waiting';
      v_added := 0;
      while v_waiting < 9 and v_added < 2 loop
        v_added := v_added + 1;
        v_lang := case when random() < coalesce(p.english_share, 0.7) then 'en'
          else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
        -- Plan: desk_offer_chance (normally 80%) are offered a place: waiting.
        -- The rest split in half: declined, or not_eligible.
        if random() < coalesce(p.desk_offer_chance, 0.8) then
          v_status := 'waiting';
        elsif random() < 0.5 then
          v_status := 'declined';
        else
          v_status := 'not_eligible';
        end if;
        begin
          insert into public.visits
            (code, access_token, site, source, ctas_level, language, status, triaged_at, offered_at, closed_at, is_demo)
          values (
            public.demo_new_code(), public.demo_new_token(), v_site, 'desk',
            case when random() < 0.5 then 4 else 5 end, v_lang, v_status,
            now(),
            case when v_status in ('waiting', 'declined') then now() end,
            case when v_status in ('declined', 'not_eligible') then now() end,
            true);
        exception when sqlstate 'VWR02' then
          -- The trigger refused a waiting visit, so the site is paused. Stop this site's desk starts.
          v_paused := true;
        end;
        exit when v_paused;
        if v_status = 'waiting' then
          v_waiting := v_waiting + 1;
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- Only pg_cron (which runs as the owner) may call it. The app's roles may not call it.
revoke execute on function public.simulate_demo_tick() from public, anon, authenticated, service_role;

-- The service_role key may still not read or change demo_settings directly (the new columns too).
revoke all on table public.demo_settings from service_role;
