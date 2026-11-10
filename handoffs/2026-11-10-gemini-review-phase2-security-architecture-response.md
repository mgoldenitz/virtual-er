# Gemini 3.1 Pro (High): answer on the Phase 2 security and architecture review

Pasted by the owner on 2026-11-10. Gemini's points, each followed by Claude's check against the code.

## 1. Anyone can watch the change signal's time; the average gap hints at call-back times

Gemini: `change_signal` is readable by `anon`, so anyone can see exactly when the system changes.
`average_gap_minutes` in `get_patient_visit` is rounded to whole minutes, but polling it could hint
at when recent call-backs happened. Fix: keep `anon` access (Realtime needs it); add noise only if
the times are sensitive.

Check: true, and it is by design. SPEC rule 5 asks for a signal that "holds no visit data", which it
does: only a time, no codes, tokens or patient details. The average gap is what the wait range is
built from, and it is only shown to a token holder. With synthetic data and two demo sites, no
change. Raise with Astra as an accepted trade-off.

## 2. Sign-in check: add security headers

Gemini: `proxy.ts` and `pageAfterSignIn` are sound (no open redirect; the secret key stays on the
server). Suggests standard security headers (`X-Frame-Options`, `X-Content-Type-Options`).

Check: correct that the app sends none (`next.config.ts` has no `headers()`). The useful one is
blocking other sites from showing the app inside a frame: a hostile page could frame the signed-in
staff screen and trick a click on "Call back" or "Remove from list" (clickjacking). Proposed (waits
for the owner): add `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` to every
page in `next.config.ts`.

## 3. The one-row signal can make writes wait on each other

Gemini: every change updates row `id = 1`, so simultaneous writes queue on that row. Fine for a
demo; for real scale use `pg_notify` or Supabase Realtime Broadcast.

Check: agreed, and already in the progress log ("Supabase Realtime Broadcast could replace it").
No change at demo size.

## 4. Before testers: per-IP limit on starting a visit; token storage

Gemini: add an IP limit on `/api/start-visit` before sharing the link; make sure the saved token is
not logged.

Check: both already done. The Vercel firewall rule (20 per 10 minutes per IP) is live and was read
back on 2026-11-10. The token is kept in `localStorage` only (`data/savedToken.ts`); nothing logs it
(the only `console` calls are the start route's error lines, which hold no token or key). No change.
