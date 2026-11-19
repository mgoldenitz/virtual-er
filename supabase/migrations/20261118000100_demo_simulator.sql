-- Demo mode, part 2 (SPEC "Demo mode"): the simulator. It plays the staff and the patients at
-- Demo Site A and B. The owner runs this file once in the Supabase SQL Editor. The last line
-- makes pg_cron run simulate_demo_tick every 5 minutes.
-- The function reads and changes ONLY visits with is_demo = true, and it makes only the moves
-- the app allows (the same list as lib/allowedSteps.ts). It does nothing unless
-- demo_settings.running is true. Check: supabase/checks/demo_tick.sql.

create function public.simulate_demo_tick()
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

    -- "I'm still here" for a waiting patient whose last prompt, or triage, was 30 minutes ago.
    for r in select access_token from public.visits where is_demo = true and site = v_site
        and status = 'waiting' and coalesce(last_still_here_at, triaged_at) <= now() - interval '30 minutes'
        and abs(hashtext(id::text)::bigint) % 10 <> 0
    loop
      if random() < 0.7 then
        perform public.record_still_here(r.access_token);
      end if;
    end loop;

    -- 2. Staff side. Staff arrivals, simulated phone calls and unable-to-reach.
    -- A patient who said "on my way" 5 minutes ago arrives (about half of them).
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'on_the_way' and confirmed_at <= now() - interval '5 minutes'
    loop
      if random() < 0.5 then
        update public.visits set status = 'arrived', arrived_at = now(), closed_at = now()
        where id = r.id and is_demo = true;
      end if;
    end loop;

    -- Simulated phone calls with no answer: the first 10 minutes after the call-back,
    -- the second 20 minutes after it. A call that was answered is never repeated.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'called' and last_phone_result is distinct from 'answered'
        and ((phone_attempts = 0 and called_at <= now() - interval '10 minutes')
          or (phone_attempts = 1 and called_at <= now() - interval '20 minutes'))
    loop
      update public.visits set phone_attempts = phone_attempts + 1, last_phone_result = 'no_answer'
      where id = r.id and is_demo = true;
    end loop;

    -- No answered call 30 minutes after the call-back: unable to reach.
    for r in select id from public.visits where is_demo = true and site = v_site
        and status = 'called' and called_at <= now() - interval '30 minutes'
        and last_phone_result is distinct from 'answered'
    loop
      update public.visits set status = 'unable_to_reach', closed_at = now()
      where id = r.id and is_demo = true;
    end loop;

    -- 3. Recall. The owner writes this rule (see the TODO below).
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
      -- A home visit 10 minutes old reaches triage: it joins the line, CTAS 4 or 5 at random.
      for r in select id from public.visits where is_demo = true and site = v_site
          and status = 'pre_arrival' and created_at <= now() - interval '10 minutes'
      loop
        update public.visits
        set status = 'waiting', ctas_level = case when random() < 0.5 then 4 else 5 end,
            triaged_at = now(), offered_at = now()
        where id = r.id and is_demo = true;
      end loop;
      -- About 1 time in 10, a new visit starts from home (not yet in the line).
      if random() < 0.1 then
        v_lang := case when random() < 0.7 then 'en'
          else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
        insert into public.visits (code, access_token, site, source, status, language, is_demo)
        values (public.demo_new_code(), public.demo_new_token(), v_site, 'home', 'pre_arrival', v_lang, true);
      end if;
    end if;

    -- 5. Desk starts. Keep about 9 demo visits waiting at this site, adding at most 2 per tick.
    -- Only a new "waiting" visit counts toward the 9.
    select count(*) into v_waiting from public.visits
    where is_demo = true and site = v_site and status = 'waiting';
    v_added := 0;
    while v_waiting < 9 and v_added < 2 loop
      v_added := v_added + 1;
      v_lang := case when random() < 0.7 then 'en'
        else (array['fr', 'zh', 'ar', 'ur'])[1 + floor(random() * 4)::integer] end;
      -- 80% are offered a place: waiting, or not_eligible while the site is paused.
      -- The other 20% split in half: declined, or not_eligible.
      if random() < 0.8 then
        v_status := case when v_paused then 'not_eligible' else 'waiting' end;
      elsif random() < 0.5 then
        v_status := 'declined';
      else
        v_status := 'not_eligible';
      end if;
      insert into public.visits
        (code, access_token, site, source, ctas_level, language, status, triaged_at, offered_at, closed_at, is_demo)
      values (
        public.demo_new_code(), public.demo_new_token(), v_site, 'desk',
        case when random() < 0.5 then 4 else 5 end, v_lang, v_status,
        now(),
        case when v_status in ('waiting', 'declined') then now() end,
        case when v_status in ('declined', 'not_eligible') then now() end,
        true);
      if v_status = 'waiting' then
        v_waiting := v_waiting + 1;
      end if;
    end loop;
  end loop;
end;
$$;

-- Only pg_cron (which runs as the owner) may call it.
revoke execute on function public.simulate_demo_tick() from public, anon, authenticated, service_role;

-- Every 5 minutes. The function does nothing while demo_settings.running is false.
select cron.schedule('simulate-demo', '*/5 * * * *', 'select public.simulate_demo_tick()');
