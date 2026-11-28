-- Demo mode, part 4: a different day shape per site.
-- The simulator is the same as 20261120020000_demo_plan.sql, with one change: a "load" number
-- per site and per run. The load sets how many demo visits wait, how fast staff call back, and
-- two of the day-plan chances. The owner runs this file once in the Supabase SQL Editor.
--
-- The load:
-- - Hour weight, by 3-hour block in Toronto time (America/Toronto):
--     block    00-03 03-06 06-09 09-12 12-15 15-18 18-21 21-24
--     Site A    0.7   0.4   0.8   1.4   1.5   1.3   1.0   0.9   (busiest at midday)
--     Site B    0.6   0.4   0.6   0.9   1.1   1.4   1.6   1.4   (busiest in the evening)
-- - Day factor, 0.8 to 1.2, from hashtext(Toronto date || site). The same all day, new each day.
-- - load = hour weight x day factor.
-- What the load changes:
-- - Target waiting: round(9 x load), at least 2 and at most 15 (it was always 9).
-- - Recall gaps: the 18 and 12 minutes are divided by (load x site recall speed).
--   Recall speed: Site A 1.05, Site B 0.95.
-- - Site factors on the day plan: desk_offer_chance x0.93 at A, x1.03 at B;
--   arrive_chance (on-time return) x0.9 at A, x1.1 at B.
--
-- What does not change:
-- - The CTAS level stays random 4 or 5 in SQL (SPEC hard rule 2).
-- - At most 2 desk starts per tick, the 1 in 10 non-responders, the phone steps and every
--   other time limit.
-- - Every change still touches only demo visits (is_demo = true).
-- - security definer, search_path = '', and the same grants at the end.
-- supabase/checks/demo_site_profiles.sql shows the load per hour for each site today.

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
  v_local timestamp; -- now, in Toronto time
  v_load numeric; -- this site's load for this run (hour weight x day factor)
  v_target integer; -- how many demo visits to keep waiting at this site
  v_speed numeric; -- this site's recall speed
  v_long interval; -- the long recall gap (was 18 minutes)
  v_quick interval; -- the quick recall gap (was 12 minutes)
  v_offer_factor numeric; -- this site's factor on desk_offer_chance
  v_arrive_factor numeric; -- this site's factor on arrive_chance
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

  v_local := now() at time zone 'America/Toronto';

  foreach v_site in array array['A', 'B'] loop
    -- This site's load: hour weight by 3-hour block, times a day factor 0.8 to 1.2.
    v_load := (case when v_site = 'A'
                 then array[0.7, 0.4, 0.8, 1.4, 1.5, 1.3, 1.0, 0.9]
                 else array[0.6, 0.4, 0.6, 0.9, 1.1, 1.4, 1.6, 1.4] end
              )[1 + floor(extract(hour from v_local) / 3)::integer]
              * (0.8 + 0.4 * (abs(hashtext(v_local::date::text || v_site)::bigint) % 1001) / 1000.0);
    v_target := greatest(2, least(15, round(9 * v_load)::integer));
    v_speed := case when v_site = 'A' then 1.05 else 0.95 end;
    v_long := make_interval(secs => 18 * 60 / (v_load * v_speed));
    v_quick := make_interval(secs => 12 * 60 / (v_load * v_speed));
    v_offer_factor := case when v_site = 'A' then 0.93 else 1.03 end;
    v_arrive_factor := case when v_site = 'A' then 0.9 else 1.1 end;

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
    -- A patient who said "on my way" 4 minutes ago arrives (plan: arrive_chance, normally half
    -- of them, times this site's factor). Slack: 4 minutes instead of 5, for cron jitter.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'on_the_way' and confirmed_at <= now() - interval '4 minutes'
    loop
      if random() < coalesce(p.arrive_chance, 0.5) * v_arrive_factor then
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
    -- Recall when the last demo call is v_long old, or v_quick old part of the time
    -- (plan: quick_recall_chance, normally half). At load 1 and speed 1 these are 18 and 12
    -- minutes, the old fixed gaps; a busier hour shortens them, a quiet hour makes them longer.
    if (v_last_call is null
        or v_last_call <= now() - v_long
        or (v_last_call <= now() - v_quick and random() < coalesce(p.quick_recall_chance, 0.5)))
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

    -- 5. Desk starts. Keep about v_target demo visits waiting at this site, adding at most 2 per tick.
    -- Only a new "waiting" visit counts toward the target.
    -- Owner choice: no desk starts while the site is paused, so this whole step is skipped then.
    if not v_paused then
      select count(*) into v_waiting from public.visits
      where is_demo = true and site = v_site and status = 'waiting';
      v_added := 0;
      while v_waiting < v_target and v_added < 2 loop
        v_added := v_added + 1;
        v_lang := case when random() < coalesce(p.english_share, 0.7) then 'en'
          else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
        -- Plan: desk_offer_chance (normally 80%, times this site's factor) are offered a place: waiting.
        -- The rest split in half: declined, or not_eligible.
        if random() < coalesce(p.desk_offer_chance, 0.8) * v_offer_factor then
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
