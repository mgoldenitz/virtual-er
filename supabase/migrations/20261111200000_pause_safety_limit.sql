-- Phase 3: a safety limit on the "Phoned, answered" pause (Gemini review of the no-response
-- steps, 2026-11-11). Staff screens work out followup_paused_until themselves (the server's
-- time plus the pause setting in lib/demoTimes.ts, 10 minutes). If a screen could not learn
-- the server's time and its own clock is wrong, the pause could end at once, or so late that
-- the "Review: unable to reach" flag stays hidden. This keeps any newly set pause end
-- between the database's now() and 30 minutes after it. It changes no other field.
-- The pause setting in lib/demoTimes.ts must stay at 30 minutes or less.

create function public.visits_limit_pause()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.followup_paused_until is not null
     and (tg_op = 'INSERT' or new.followup_paused_until is distinct from old.followup_paused_until) then
    new.followup_paused_until := least(
      greatest(new.followup_paused_until, now()),
      now() + interval '30 minutes'
    );
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.visits_limit_pause() from public, anon, authenticated;

create trigger visits_limit_pause
  before insert or update on public.visits
  for each row execute function public.visits_limit_pause();
