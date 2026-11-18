-- Demo mode, part 1 (SPEC "Demo mode"): the on and off switch, and the makers of random
-- codes and tokens for demo visits. The owner runs this file once in the Supabase SQL Editor.
-- 1. demo_settings: one row that says whether the demo simulator is running.
-- 2. demo_new_token and demo_new_code: make a random access token and a display code for a
--    demo visit. Each one tries again if the value is already used in public.visits.
-- The simulator itself is in 20261118000100_demo_simulator.sql.

-- ---------------------------------------------------------------------------
-- The switch. One row only (id = 1). running = false means the simulator does nothing.
-- ---------------------------------------------------------------------------
create table public.demo_settings (
  id smallint primary key default 1 check (id = 1),
  running boolean not null default false
);

insert into public.demo_settings (id, running) values (1, false);

alter table public.demo_settings enable row level security;

-- No policies. Patients (anon) and logged-in staff (authenticated) get no access at all.
revoke all on table public.demo_settings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- A new access token for a demo visit: 26 characters from the Crockford alphabet, the same
-- kind the access_token check on visits allows (128 random bits, lib/codes.ts makeAccessToken).
-- get_byte(b, i) % 32 picks one of 32 characters with equal chance, because 256 is a multiple of 32.
-- ---------------------------------------------------------------------------
create function public.demo_new_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea;
  candidate text;
begin
  loop
    b := extensions.gen_random_bytes(26);
    candidate := '';
    for i in 0..25 loop
      candidate := candidate || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    -- Try again if a visit already has this token.
    exit when not exists (select 1 from public.visits where access_token = candidate);
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.demo_new_token() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A new display code for a demo visit: 6 characters from the 31 letters and digits the code
-- check on visits allows (no O, 0, I, 1 or L). floor(random() * 31) picks one of the 31.
-- ---------------------------------------------------------------------------
create function public.demo_new_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, floor(random() * 31)::integer + 1, 1);
    end loop;
    -- Try again if a visit already has this code.
    exit when not exists (select 1 from public.visits where code = candidate);
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.demo_new_code() from public, anon, authenticated, service_role;
