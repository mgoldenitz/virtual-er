# Gemini 3.1 Pro (High): answer on the Phase 2 security review handoff

Pasted by the owner on 2026-11-10. The owner gave `handoffs/2026-11-10-astra-security-review-phase2.md`
(written for GPT-6 Astra) to Gemini 3.1 Pro, High. This is not the Astra review; that one is still
open. The keep-alive job was not in the handoff file, so this review does not cover it.

Gemini found nothing to change in any of the five areas. Each point is followed by Claude's check
against the code.

## 1. Access without a staff sign-in, and keeping visits apart

Gemini: row-level security blocks `anon` from the tables; anyone not signed in can only call the
narrow security definer functions, and each needs the 128-bit token. Nothing sends codes or tokens
out. No change. Certainty: high.

Check: matches the code and `supabase/checks/permissions.sql`.

## 2. Staff checks

Gemini: `app_metadata.role` cannot be changed by the user. `proxy.ts` guards the screens;
`pageAfterSignIn` refuses `//` addresses, so no open redirect. Row-level security reads the signed
token, so the database blocks non-staff even if the screen check were skipped. No change.

Check: `lib/staffAccess.ts:34` refuses anything that does not start with one `/` or that is not a
staff page.

## 3. Security definer functions and the start route

Gemini: the functions use `set search_path = ''`. `start_home_visit` is closed to `anon` and
`authenticated` and open only to `service_role`, so it can only be reached through the
rate-limited server route. No change.

Check: `supabase/migrations/20261110061049_patient_functions.sql:147` (revoke) and `:152` (grant to
`service_role` only); every function has `set search_path = ''`.

## 4. Token or secret key leaks

Gemini: the token sits after `#` in the address, which browsers never send on. The start route
answers with `Cache-Control: no-store`. A duplicate token is caught inside `start_home_visit` and
returns `'taken'`, so no token ends up in Vercel's error logs. `import "server-only"` keeps the
secret key out of the browser. No change.

Check: `app/api/start-visit/route.ts:15` (`no-store`), `patient_functions.sql:136-137`
(`unique_violation` gives `'taken'`), `data/supabaseServer.ts:5` (`server-only`).

## 5. Accepted trade-offs

Gemini: for 3 to 5 testers with made-up data, the single `change_signal` row will not slow writes,
the rounded average gap is not a privacy problem, and staff need the token for the QR code.
`pg_advisory_xact_lock` closes the gap in the per-site start limit. No change.

Check: `patient_functions.sql:123` takes the lock per site before counting.

## Result

Nothing to change. Still open: the GPT-6 Astra (High) review itself.
