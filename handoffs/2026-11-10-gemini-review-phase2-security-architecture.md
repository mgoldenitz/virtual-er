# Review request: Phase 2 security and architecture

Model: Gemini 3.1 Pro, High (or Gemini 3.6 Flash, High, if 3.1 Pro credits are still used up).

## Context

A concept demo of a "virtual ER waiting room" (Next.js 16 App Router, TypeScript, Supabase in
ca-central-1, hosted on Vercel in Montreal). Synthetic data only; no names, phone numbers or
health details are stored. Low-acuity patients wait off-site after triage and follow their visit
on their phone.

Security model (hard rules from the spec):
- A visit has a 6-character display code (staff-only lookup) and a long random access token
  (at least 128 bits). Only the token opens a visit on a patient's phone, through one database
  function that returns only patient-safe fields.
- Patients have no login. They may only: start a visit from home (a server route that uses the
  secret key; the browser never sets source or status), record that the called screen was shown
  (only while called), confirm "I'm on my way" (only while called). "I'm still here" and the survey
  come in later phases.
- Everything else, including the queue, is staff only through row-level security. Staff are
  Supabase users with `app_metadata.role = 'staff'`; public sign-up and anonymous sign-ins are off.
- Patient pages never subscribe to visit rows. Realtime publishes only a one-row `change_signal`
  table (a timestamp); screens re-read what they are allowed to see.
- Starting from home is limited twice: the database allows 10 starts per site per minute, and a
  Vercel firewall rule allows 20 requests per 10 minutes per IP on `/api/start-visit`.

Known and accepted for now (please do not spend time on these unless you think the decision is wrong):
- Staff can read tokens, because "Show QR again" needs them.
- The database does not yet check which status changes staff may make (for example "Call back
  only while waiting"); that moves into the database in Phase 3.

Already checked: Claude's own security review of all Phase 2 changes found nothing at high
confidence (grants, row-level security, security definer functions, filter building, the
sign-in check, the secret key, token handling, XSS). Supabase's security advisor showed only
expected warnings. The secret key appears in no browser file of the production build.

## Questions

1. Security: can anyone without a staff account read or change a visit other than through the
   three patient functions? Can a patient's token reveal more than its own visit?
2. Security: anything in the sign-in check (`proxy.ts`, `lib/staffAccess.ts`) or the start route
   that could be bypassed or could leak a token or key?
3. Architecture: is the split sensible (screens in `app/`, saving and loading in `data/`, rules in
   `lib/`), and is the change-signal plus re-read design sound for a demo of a few dozen visits?
4. What would you change before real testers (3 to 5 people) use the live link?

Please answer with a short list: problem, why it matters, suggested fix, and how sure you are.
Say "no change needed" where something is fine.

## The code

### `supabase/migrations/20261110060756_tables_and_security.sql`

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
```

### `supabase/migrations/20261110061049_patient_functions.sql`

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
  -- Average minutes between the last 5 call-backs at this site, rounded to whole minutes
  -- so it cannot be used to work out exactly when other patients were called.
  -- Null with under 2 call-backs.
  average_gap_minutes integer,
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
        then round(extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1))::integer
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
-- Returns: saved, paused (off-site waiting is paused at this site), busy (10 or more
-- starts at this site in the last minute), or taken (code or token already used).
-- ---------------------------------------------------------------------------
create function public.start_home_visit(p_site text, p_language text, p_code text, p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One start at a time per site, so two requests at once cannot both pass the cap below.
  perform pg_advisory_xact_lock(hashtext('start_home_visit:' || p_site));
  if exists (select 1 from public.site_settings where site = p_site and offsite_paused) then
    return 'paused';
  end if;
  -- A demo-sized cap for the whole site. A per-device limit is added on Vercel.
  if (select count(*) from public.visits
      where site = p_site and source = 'home' and created_at > now() - interval '1 minute') >= 10 then
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

### `supabase/migrations/20261110090134_visit_version_and_database_times.sql`

```sql
-- Phase 2, part 3 (after Gemini 3.1 Pro's review of the storage plan):
-- 1. A version number on each visit that goes up on every change, so a staff screen working
--    from an older copy of a visit cannot overwrite a newer change (the app saves only
--    "where version = the version I read").
-- 2. The database's clock sets every time, never a device's clock, so a laptop with a wrong
--    clock cannot put patients in the wrong place in line.

alter table public.visits add column version integer not null default 1;

-- Runs before every insert and update of a visit.
-- Any time that is newly filled in is replaced with now(); a time cleared to empty (Undo)
-- stays empty. followup_paused_until is a time in the future, so it is left as given.
create function public.visits_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_at := now();
    if new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is not null then new.closed_at := now(); end if;
  else
    new.version := old.version + 1;
    new.created_at := old.created_at;
    if new.triaged_at is distinct from old.triaged_at and new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is distinct from old.offered_at and new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is distinct from old.last_still_here_at and new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is distinct from old.called_at and new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is distinct from old.seen_at and new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is distinct from old.review_flagged_at and new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is distinct from old.arrived_at and new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is distinct from old.closed_at and new.closed_at is not null then new.closed_at := now(); end if;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.visits_before_write() from public, anon, authenticated;

create trigger visits_before_write
  before insert or update on public.visits
  for each row execute function public.visits_before_write();
```

### `app/api/start-visit/route.ts`

```ts
// The server route a phone calls to start a visit from home (SPEC rule 5). The phone sends
// only a site and a language; this route makes the code and token, and the database function
// start_home_visit sets source = home and status = pre_arrival itself, refuses while off-site
// waiting is paused, and allows 10 starts per site per minute.

import { supabaseServer } from "@/data/supabaseServer";
import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
import { parseStartVisitRequest } from "@/lib/startVisitRequest";

const TRIES = 3; // a new code and token each time the database says "taken"
const MAX_BODY_CHARACTERS = 200;

function answer(body: { result: string; token?: string }, status: number): Response {
  // The answer carries the token, so it must never be kept by a cache.
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARACTERS) return answer({ result: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return answer({ result: "bad_request" }, 400);
  }
  const wanted = parseStartVisitRequest(body);
  if (!wanted) return answer({ result: "bad_request" }, 400);

  try {
    const supabase = supabaseServer();
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const token = makeAccessToken();
      const { data, error } = await supabase.rpc("start_home_visit", {
        p_site: wanted.site,
        p_language: wanted.language,
        p_code: makeDisplayCode(),
        p_token: token,
      });
      if (error) {
        // Written to the server log only (Vercel's runtime logs). Holds no token or key.
        console.error("start-visit: database refused", { code: error.code, message: error.message });
        break;
      }
      if (data === "saved") return answer({ result: "saved", token }, 200);
      if (data === "paused") return answer({ result: "paused" }, 409);
      if (data === "busy") return answer({ result: "busy" }, 429);
      if (data !== "taken") {
        console.error("start-visit: unexpected answer from start_home_visit", { answer: String(data).slice(0, 40) });
        break;
      }
    }
  } catch (problem) {
    // A missing setting or an unreachable database: the phone gets the same plain answer,
    // and the reason goes to the server log only.
    console.error("start-visit: could not reach the database", problem instanceof Error ? problem.message : "unknown");
  }
  return answer({ result: "error" }, 500);
}
```

### `lib/startVisitRequest.ts`

```ts
// Checks what a phone sends when it asks to start a visit from home: only a site and a
// language, and only values the app knows. Anything else is refused before the database is asked.

import type { Site } from "./visit";

/** Languages a visit can be started in. Two more are added in Phase 3. */
export const START_LANGUAGES = ["en"];

export type StartVisitRequest = { site: Site; language: string };

/** The site and language from the request body, or null if the body is not acceptable. */
export function parseStartVisitRequest(body: unknown): StartVisitRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { site, language } = body as Record<string, unknown>;
  if (site !== "A" && site !== "B") return null;
  if (typeof language !== "string" || !START_LANGUAGES.includes(language)) return null;
  // Only these two fields go on: the browser never sets the source, status, code or token.
  return { site, language };
}
```

### `lib/codes.ts`

```ts
// Makes the two visit identifiers from SPEC rule 1:
// a short display code people can read aloud, and a long secret access token.

/** Letters and digits with no look-alikes (no O/0, I/1, L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Crockford base32: case-insensitive, no I, L, O or U. */
const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

type RandomBytes = (length: number) => Uint8Array;

const browserRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length));

/** 6-character display code. Not a secret; it never opens a visit for a patient. */
export function makeDisplayCode(randomBytes: RandomBytes = browserRandomBytes): string {
  let code = "";
  while (code.length < 6) {
    // Reject bytes that would bias the result (256 is not a multiple of 31).
    const limit = 256 - (256 % CODE_ALPHABET.length);
    for (const byte of randomBytes(12)) {
      if (byte < limit && code.length < 6) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

/** Display code that is not already used by an existing visit. */
export function makeUniqueDisplayCode(
  taken: Set<string>,
  randomBytes: RandomBytes = browserRandomBytes,
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = makeDisplayCode(randomBytes);
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free display code");
}

/** Access token: 16 random bytes (128 bits) as 26 Crockford base32 characters. */
export function makeAccessToken(randomBytes: RandomBytes = browserRandomBytes): string {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += TOKEN_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += TOKEN_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Token split into groups of 4, so a typed link is easier to copy from paper. */
export function groupToken(token: string): string {
  return token.match(/.{1,4}/g)?.join("-") ?? token;
}

/** Undo grouping and typing slips: drop spaces/hyphens, upper-case, and map look-alikes. */
export function normalizeToken(typed: string): string {
  return typed
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** True only for something shaped like a token from makeAccessToken (26 Crockford characters). */
export function isAccessToken(token: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(token);
}

/** A display code as staff typed it: spaces and hyphens dropped, upper-case. */
export function normalizeDisplayCode(typed: string): string {
  return typed.replace(/[\s-]/g, "").toUpperCase();
}
```

### `data/supabaseServer.ts`

```ts
// The Supabase connection that uses the secret key. It runs only on the server (the first
// line makes the build fail if a browser file ever imports it), and only the start-a-visit
// route uses it. The secret key is read from .env.local (or Vercel's settings), never from code.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
    if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local (see .env.example).");
    // No sign-in is kept or refreshed: this connection acts as the server itself, not as a person.
    client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
```

### `proxy.ts`

```ts
// Runs before /staff, /dashboard and /login load (Next.js 16 calls this file "proxy";
// older versions called it middleware). It keeps the staff sign-in fresh and sends anyone
// who is not a signed-in staff account to the login screen. The database's row-level
// security is the real lock; this only stops the staff screens opening empty.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseSettings } from "@/data/supabaseSettings";
import { staffAccess, type StaffClaims } from "@/lib/staffAccess";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseSettings();

  // A new connection for every request, reading and refreshing the sign-in cookies.
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Checks the sign-in token's signature (nothing else may run between these two steps,
  // or staff can be signed out at random, per Supabase's guide).
  const { data } = await supabase.auth.getClaims();
  const access = staffAccess(request.nextUrl.pathname, (data?.claims ?? null) as StaffClaims);
  if (access === "allow") return response;

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", request.nextUrl.pathname);
  if (access === "not_staff") login.searchParams.set("reason", "not_staff");
  const redirect = NextResponse.redirect(login);
  // Keep any refreshed sign-in cookies on the redirect too.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/staff/:path*", "/dashboard/:path*", "/login"],
};
```

### `lib/staffAccess.ts`

```ts
// Who may open the staff screens (/staff and /dashboard): only a signed-in staff account.
// This is the quick check made before a page loads; the database's row-level security is
// the real lock, so a page opened anyway would still show no visit data.

/** The parts of a sign-in token this check reads. Supabase sets app_metadata; users cannot. */
export type StaffClaims = { app_metadata?: Record<string, unknown> } | null | undefined;

export type StaffAccess = "allow" | "sign_in" | "not_staff";

const STAFF_PATHS = ["/staff", "/dashboard"];

/** True for /staff, /dashboard and any page under them. */
export function isStaffPath(pathname: string): boolean {
  return STAFF_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** True only when the account is marked role = staff (the same mark is_staff() checks). */
export function isStaffAccount(claims: StaffClaims): boolean {
  return claims?.app_metadata?.role === "staff";
}

/** Let the page open, send the visitor to sign in, or tell them the account is not staff. */
export function staffAccess(pathname: string, claims: StaffClaims): StaffAccess {
  if (!isStaffPath(pathname)) return "allow";
  if (!claims) return "sign_in";
  return isStaffAccount(claims) ? "allow" : "not_staff";
}

/**
 * Where to go after signing in. Only a staff page is allowed, so a link like
 * /login?next=https://elsewhere.example cannot send staff to another site.
 */
export function pageAfterSignIn(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && isStaffPath(next.split(/[?#]/)[0])) {
    return next;
  }
  return "/staff";
}
```

### `data/supabaseBrowser.ts`

```ts
// The one Supabase connection used by screens in the browser. It uses only the publishable
// key, so what it can see is decided by row-level security: everything for signed-in staff,
// and for patients only the token functions.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSettings } from "./supabaseSettings";

let client: SupabaseClient | undefined;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = supabaseSettings();
    client = createBrowserClient(url, publishableKey);
  }
  return client;
}
```

### `data/patientVisit.ts`

```ts
// Everything a patient's phone may do, each as one narrow call that takes the token
// (SPEC rule 5). Patient screens use only this file. Reading the visit and the two patient
// steps go to the database functions; starting from home goes through the server route
// app/api/start-visit.

import { useCallback, useSyncExternalStore } from "react";
import { isAccessToken } from "@/lib/codes";
import { afterFailedRead } from "@/lib/failedRead";
import type { PatientView } from "@/lib/patientView";
import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
import type { ChangeResult, Site } from "@/lib/visit";
import { keepFresh } from "./keepFresh";
import { saveToken } from "./savedToken";
import { supabaseBrowser } from "./supabaseBrowser";

/** saved = started and remembered on this phone; paused and busy = refused for now. */
export type StartResult = "saved" | "paused" | "busy" | "not_saved";

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * The phone sends only the site and language to the server route, which makes the code and
 * token and asks the database; the database sets source = home and status = pre_arrival.
 */
export async function startVisitFromHome(site: Site, language: string): Promise<StartResult> {
  try {
    const response = await fetch("/api/start-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, language }),
    });
    // 429 = too many starts: from the route's own cap, or from Vercel's per-device firewall rule,
    // whose answer is not in the route's format.
    if (response.status === 429) return "busy";
    const answer: unknown = await response.json();
    const { result, token } = (answer ?? {}) as { result?: unknown; token?: unknown };
    if (result === "paused" || result === "busy") return result;
    if (result !== "saved" || typeof token !== "string" || !isAccessToken(token)) return "not_saved";
    saveToken(token);
    return "saved";
  } catch {
    return "not_saved";
  }
}

/** A visit, null if the token matches no visit, or "unavailable" if it could not be read. */
type Shown = PatientView | null | "unavailable";

const REREAD_MS = 15_000; // in case a live update was missed

// What each token last showed, kept in memory only (nothing about the visit is saved on the phone).
type Entry = {
  shown?: Shown;
  key: string;
  failures: number;
  latestRead: number;
  watchers: number;
  stopReading?: () => void;
};
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function entryFor(token: string): Entry {
  let entry = entries.get(token);
  if (!entry) {
    entry = { key: "", failures: 0, latestRead: 0, watchers: 0 };
    entries.set(token, entry);
  }
  return entry;
}

async function readFromDatabase(token: string): Promise<PatientView | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("get_patient_visit", { p_token: token });
    if (error || !Array.isArray(data)) return "failed";
    return data.length === 0 ? null : patientViewFromRow(data[0] as PatientVisitRow);
  } catch {
    return "failed";
  }
}

/** Read the visit again and tell the screens if anything changed. */
async function refreshPatientView(token: string): Promise<void> {
  const entry = entryFor(token);
  const thisRead = ++entry.latestRead;
  const read = await readFromDatabase(token);
  if (thisRead !== entry.latestRead) return; // a newer read has started; its answer wins
  entry.failures = read === "failed" ? entry.failures + 1 : 0;
  const next = read === "failed" ? afterFailedRead(entry.shown, entry.failures) : read;
  // Keep the same object until the view really changes, so React does not redraw for nothing.
  const key = JSON.stringify(next);
  if (entry.shown !== undefined && key === entry.key) return;
  entry.key = key;
  entry.shown = next;
  listeners.forEach((tell) => tell());
}

/**
 * While a screen is showing this token: read now, on every live update, every 15 seconds, and
 * when the tab comes back.
 * There is one timer per token however many parts of the screen are listening.
 */
function watch(token: string | null, onChange: () => void): () => void {
  if (!token) return () => {};
  listeners.add(onChange);
  const entry = entryFor(token);
  entry.watchers++;
  if (!entry.stopReading) {
    entry.stopReading = keepFresh(() => refreshPatientView(token), () => entry.failures > 0, REREAD_MS);
  }
  return () => {
    listeners.delete(onChange);
    entry.watchers--;
    if (entry.watchers === 0 && entry.stopReading) {
      entry.stopReading();
      entry.stopReading = undefined;
    }
  };
}

/**
 * The patient view for one token, read through the database function get_patient_visit.
 * Returns undefined while loading, null if the token matches no visit, and "unavailable"
 * if the visit could not be read (so the screen never says "no visit" because of an error).
 */
export function usePatientView(token: string | null): Shown | undefined {
  const subscribe = useCallback((onChange: () => void) => watch(token, onChange), [token]);
  const getSnapshot = useCallback(() => (token ? entries.get(token)?.shown : null), [token]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/** Saved = the step was recorded; refused = not allowed now; not_saved = could not reach the database. */
async function patientStep(step: "record_seen" | "confirm_on_my_way", token: string): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser().rpc(step, { p_token: token });
    if (error || typeof data !== "boolean") return "not_saved";
    await refreshPatientView(token); // show the result straight away
    return data ? "saved" : "refused";
  } catch {
    return "not_saved";
  }
}

/** Record that the called screen was shown. Only while called, and only once. */
export function recordSeen(token: string): Promise<ChangeResult> {
  return patientStep("record_seen", token);
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWayByToken(token: string): Promise<ChangeResult> {
  return patientStep("confirm_on_my_way", token);
}
```

### `data/staffActions.ts`

```ts
// What staff screens can do to visits. Each action applies a rule from lib/visitActions to
// the copy of the visit on screen, then saves only the changed fields to the database, and
// only if nobody else changed the visit in the meantime (its version number still matches).
// The database sets every time itself, so the device clock never decides line order.

import { changedFields } from "@/lib/changedFields";
import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
import type { ChangeResult, Site, Visit } from "@/lib/visit";
import {
  callBack,
  checkInAtDesk,
  checkInHomeVisit,
  markArrived,
  markRemoved,
  undoClose,
  type Closure,
  type DeskOutcome,
} from "@/lib/visitActions";
import { supabaseBrowser } from "./supabaseBrowser";
import { cachedVisit, loadVisits, putVisit, readVisitList, type StoredVisit } from "./visitCache";

export type CheckInForm = { site: Site; ctas_level: 4 | 5; language: string };

const CODE_TRIES = 3;
const ALREADY_USED = "23505"; // the database's error code for "this code or token is already used"

/** Apply one rule to one visit and save it. */
async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Promise<ChangeResult> {
  const before = cachedVisit(id);
  const after = before ? step(before) : null;
  if (!before || !after) {
    void loadVisits();
    return "refused";
  }
  const changed = changedFields(before, after);
  if (Object.keys(changed).length === 0) return "refused"; // nothing to save
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update(changed)
      .eq("id", id)
      .eq("version", before.version)
      .select();
    if (error || !Array.isArray(data)) return "not_saved";
    if (data.length === 0) {
      // Someone else (another staff screen, or the patient) changed this visit first.
      void loadVisits();
      return "refused";
    }
    putVisit(data[0] as StoredVisit);
    return "saved";
  } catch {
    return "not_saved";
  }
}

/**
 * Create a desk visit after triage. Returns the new visit so the slip can be shown,
 * or null if it could not be saved.
 */
export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Promise<Visit | null> {
  try {
    for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
      const taken = new Set((readVisitList().visits ?? []).map((v) => v.code));
      const visit = checkInAtDesk(
        { id: crypto.randomUUID(), code: makeUniqueDisplayCode(taken), access_token: makeAccessToken(), ...form },
        outcome,
        new Date(),
      );
      const { data, error } = await supabaseBrowser().from("visits").insert(visit).select();
      if (error?.code === ALREADY_USED) continue; // an older visit not on this screen has the code
      if (error || !Array.isArray(data) || data.length === 0) return null;
      putVisit(data[0] as StoredVisit);
      return data[0] as StoredVisit;
    }
  } catch {
    // Could not reach the database.
  }
  return null;
}

/** Check in, after triage, a visit the patient started from home. */
export const checkInVisitFromHome = (id: string, form: CheckInForm, outcome: DeskOutcome) =>
  changeVisit(id, (v) => (v.site === form.site ? checkInHomeVisit(v, form, outcome, new Date()) : null));

/**
 * Staff-only lookup of a visit by the short code the patient reads out or shows. It asks the
 * database, so a visit started from home a moment ago is found. Returns "failed" if the
 * database could not be asked.
 */
export async function findVisitByCode(typed: string): Promise<Visit | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .eq("code", normalizeDisplayCode(typed))
      .maybeSingle();
    if (error) return "failed";
    if (data) putVisit(data as StoredVisit);
    return (data as StoredVisit | null) ?? null;
  } catch {
    return "failed";
  }
}

export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v, new Date()));
export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, new Date()));
export const removeVisit = (id: string, reason: "left" | "no_show") =>
  changeVisit(id, (v) => markRemoved(v, reason, new Date()));
/** Undo one closure; `closure` is the closure the Undo button belongs to. */
export const undoCloseVisit = (id: string, closure: Closure) => changeVisit(id, (v) => undoClose(v, closure));

/** Read the list again now (the "Try again" button). */
export { loadVisits as reloadVisits } from "./visitCache";
```

### `data/visitCache.ts`

```ts
// The staff screens' copy of the visits: read from the database (row-level security lets only
// signed-in staff do this), held in memory, and read again on every live update, on a timer,
// when the tab comes back, and after every staff action. Nothing here is saved in the browser.

import { ACTIVE_STATUSES, type Visit } from "@/lib/visit";
import { keepFresh } from "./keepFresh";
import { supabaseBrowser } from "./supabaseBrowser";

/** A visit as the database holds it: the version goes up by one on every change. */
export type StoredVisit = Visit & { version: number };

/** `visits` is null until the first read works; `outOfDate` is true when the last read failed. */
export type VisitList = { visits: StoredVisit[] | null; outOfDate: boolean };

export const EMPTY_LIST: VisitList = { visits: null, outOfDate: false };

const LIST_HOURS = 24; // plus everyone still in the line, however long ago they were triaged
const REREAD_MS = 15_000; // in case a live update was missed

let list: VisitList = EMPTY_LIST;
let visitsKey = "";
let latestLoad = 0;
const listeners = new Set<() => void>();

export function readVisitList(): VisitList {
  return list;
}

/** One visit from the copy on screen (with the version staff were looking at), or null. */
export function cachedVisit(id: string): StoredVisit | null {
  return list.visits?.find((v) => v.id === id) ?? null;
}

function show(visits: StoredVisit[] | null, outOfDate: boolean): void {
  // Keep the same list object until the visits really change: screens compare lists to
  // announce changes, and React does not redraw for nothing.
  const key = JSON.stringify(visits);
  const sameVisits = key === visitsKey;
  if (sameVisits && outOfDate === list.outOfDate) return;
  visitsKey = key;
  list = { visits: sameVisits ? list.visits : visits, outOfDate };
  listeners.forEach((tell) => tell());
}

/** Read the visits again: everyone still in the line, plus anything made or closed in the last 24 hours. */
export async function loadVisits(): Promise<void> {
  const thisLoad = ++latestLoad;
  const since = new Date(Date.now() - LIST_HOURS * 3_600_000).toISOString();
  let rows: StoredVisit[] | null = null;
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte."${since}",closed_at.gte."${since}"`);
    if (!error && Array.isArray(data)) rows = data as StoredVisit[];
  } catch {
    // Treated like any other failed read below.
  }
  if (thisLoad !== latestLoad) return; // a newer read or a saved change has happened since; it wins
  if (rows) show(rows, false);
  else show(list.visits, true); // keep what was on screen, marked as possibly out of date
}

/** Put one freshly saved or freshly read visit into the copy straight away, then read everything again. */
export function putVisit(visit: StoredVisit): void {
  const others = (list.visits ?? []).filter((v) => v.id !== visit.id);
  latestLoad++; // a read that started before this change must not put the old row back
  show([...others, visit], list.outOfDate);
  void loadVisits();
}

let stopReading: (() => void) | null = null;

/**
 * While any staff screen is open: read now, on every live update, every 15 seconds, and when
 * the tab comes back.
 * There is one timer however many parts of the screen are listening.
 */
export function watchVisits(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!stopReading) stopReading = keepFresh(loadVisits, () => list.outOfDate, REREAD_MS);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && stopReading) {
      stopReading();
      stopReading = null;
    }
  };
}
```

### `data/changeSignal.ts`

```ts
// Live updates: listens for the database's "something changed" signal and tells the screens
// to read again. The signal is one row holding only a time (the change_signal table), so
// nothing about any visit travels over this connection (SPEC rule 5). There is one
// connection per browser tab however many lists are listening.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabaseBrowser";

const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;

function tellEveryone(): void {
  listeners.forEach((tell) => tell());
}

/** Call `tell` whenever something changed in the database. Returns a function that stops listening. */
export function onChangeSignal(tell: () => void): () => void {
  listeners.add(tell);
  if (!channel) {
    try {
      channel = supabaseBrowser()
        .channel("change-signal")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "change_signal" }, tellEveryone)
        .subscribe((status) => {
          // Connected, or connected again after a drop: a signal may have been missed meanwhile.
          if (status === "SUBSCRIBED") tellEveryone();
        });
    } catch {
      // No live connection: the screens still read again on their timer.
    }
  }
  return () => {
    listeners.delete(tell);
    if (listeners.size === 0 && channel) {
      void supabaseBrowser().removeChannel(channel);
      channel = null;
    }
  };
}
```

### `data/keepFresh.ts`

```ts
// Keeps one thing re-read from the database while a screen is showing it: now, as soon as
// the database signals a change (live updates), when the tab comes back or the connection
// returns, and on a timer in case a signal was missed. Used by the patient's visit and the
// staff list. Only one read runs at a time.

import { onChangeSignal } from "./changeSignal";

const RETRY_MS = 5_000; // sooner while reads are failing

/**
 * `read` reads once (it must never throw); `failing` says whether the last read failed.
 * Returns a function that stops the timer.
 */
export function keepFresh(read: () => Promise<void>, failing: () => boolean, everyMs: number): () => void {
  let stopped = false;
  let reading = false;
  let again = false; // something asked for a read while one was already on its way
  let timer: ReturnType<typeof setTimeout> | undefined;

  const readNow = async () => {
    if (stopped) return;
    if (reading) {
      again = true; // the read on its way may have started before this change, so read once more after it
      return;
    }
    reading = true;
    clearTimeout(timer);
    await read();
    reading = false;
    if (stopped) return;
    if (again && !failing()) {
      again = false;
      void readNow();
      return;
    }
    again = false;
    timer = setTimeout(readNow, failing() ? RETRY_MS : everyMs);
  };
  const onBack = () => {
    if (document.visibilityState === "visible") void readNow();
  };

  void readNow();
  document.addEventListener("visibilitychange", onBack);
  window.addEventListener("online", onBack);
  const stopListening = onChangeSignal(() => void readNow());
  return () => {
    stopped = true;
    stopListening();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}
```
