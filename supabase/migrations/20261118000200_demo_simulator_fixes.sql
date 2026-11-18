-- Demo mode, part 2b: fixes to the simulator (SPEC "Demo mode").
-- This file replaces simulate_demo_tick from 20261118000100_demo_simulator.sql, which already ran.
-- The owner runs this file once in the Supabase SQL Editor. Do not run the cron.schedule line of
-- 20261118000100 again: the job already exists.
--
-- What it fixes, in short:
-- 1. Each time limit gets 1 minute of slack, because each cron tick runs a few ms late.
-- 2. A call-back counts as unable to reach only after 2 phone attempts.
-- 3. A pause that the trigger refuses (error code VWR02) stops the run for that site. It no longer
--    fails the whole tick.
-- 4. No desk starts while a site is paused (owner choice).
-- 5. The app's roles may not call the function. The service_role key may not read demo_settings.
--
-- Correction: the comment in 20261118000000_demo_settings.sql says 128 random bits. That is wrong.
-- demo_new_token gives 130 random bits (26 bytes, 5 bits each), not 128. lib/codes.ts
-- makeAccessToken uses 16 bytes, which is 128 bits.
--
-- Every change still touches only demo visits (is_demo = true). Nothing is removed.

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
begin
  -- If another run is still going, stop. The lock ends with this run's transaction.
  if not pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick')) then
    return;
  end if;
  -- Do nothing unless the owner has switched the simulator on.
  if coalesce((select running from public.demo_settings where id = 1), false) is false then
    return;
  end if;

  foreach v_site in array array['A', 'B'] loop
    -- The off-site pause for this site. A missing or empty value counts as paused (fail safe).
    select offsite_paused into v_paused from public.site_settings where site = v_site;
    v_paused := coalesce(v_paused, true);

    -- 1. Patient side. About 1 in 10 demo visits is a non-responder: it never taps anything.
    -- First, the called screen is shown (about 70% of the time).
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'called' and seen_at is null and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < 0.7 then
        perform public.record_seen(r.access_token);
      end if;
    end loop;

    -- Then "I'm on my way" for a called screen that was shown (about 70% of the time).
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'called' and seen_at is not null and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < 0.7 then
        perform public.confirm_on_my_way(r.access_token);
      end if;
    end loop;

    -- "I'm still here" for a waiting patient whose last prompt, or triage, was 29 minutes ago.
    -- Slack: 29 instead of 30, for cron jitter.
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'waiting' and coalesce(last_still_here_at, triaged_at) <= now() - interval '29 minutes'
        and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < 0.7 then
        perform public.record_still_here(r.access_token);
      end if;
    end loop;

    -- 2. Staff side. Staff arrivals, simulated phone calls and unable-to-reach.
    -- A patient who said "on my way" 4 minutes ago arrives (about half of them).
    -- Slack: 4 minutes instead of 5, for cron jitter.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'on_the_way' and confirmed_at <= now() - interval '4 minutes'
    loop
      if random() < 0.5 then
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
    -- Recall when the last demo call is 18 minutes old, or 12 minutes old about half the time.
    -- With 5-minute ticks this gives gaps of 15 or 20 minutes, so the phone shows about 120 to 190.
    if (v_last_call is null
        or v_last_call <= now() - interval '18 minutes'
        or (v_last_call <= now() - interval '12 minutes' and random() < 0.5))
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
      -- About 1 time in 10, a new visit starts from home (not yet in the line).
      -- Skipped if the site was found paused just above.
      if not v_paused and random() < 0.1 then
        v_lang := case when random() < 0.7 then 'en'
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
        v_lang := case when random() < 0.7 then 'en'
          else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
        -- 80% are offered a place: waiting. The other 20% split in half: declined, or not_eligible.
        if random() < 0.8 then
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

-- The service_role key may not read or change the on switch in demo_settings.
revoke all on table public.demo_settings from service_role;
