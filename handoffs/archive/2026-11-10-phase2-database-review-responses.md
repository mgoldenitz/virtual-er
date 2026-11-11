Gemini Pro 3.1: "1. Critical: Missing base grants lock out all staff (Addresses Q1: Grants and policies)
While non-staff are securely blocked, legitimate staff are also completely locked out because the authenticated role was never granted basic table privileges. Row-Level Security policies only filter access rather than granting it, meaning PostgREST will instantly reject all staff queries with a "Permission denied" error before your RLS policies are even evaluated.SQL: revoke all on table public.visits from anon; (Missing subsequent grant select, insert, update on table public.visits to authenticated;)

2. Critical: Row-lock contention serializes all writes (Addresses Q4: Postgres mistakes)
Updating a single, shared row on every table mutation forces every database transaction to funnel into and queue for the exact same row-level lock. Under ER traffic, this single choke point will block and serialize all database writes (inserts, updates, deletes) across the entire system.SQL: update public.change_signal set changed_at = now() where id = 1;

3. High: Rate-limit race condition (Addresses Q3: Race conditions in functions)
The 30-starts-per-minute cap is vulnerable to a race condition because the aggregate COUNT(*) check does not lock rows against concurrent transactions. If an abuser script triggers the server route simultaneously, multiple transactions will read the same acceptable count (e.g., 29) and insert concurrently, easily blowing past the cap.SQL: if (select count(*) from public.visits where site = p_site and source = 'home' and created_at > now() - interval '1 minute') >= 30 then

4. Medium: Precise timestamp leak via float math (Addresses Q2: Patient function leaks)
While a wrong token safely returns zero rows, the average gap calculation returns a high-precision floating-point number that leaks exact transition times of other visits. A patient continuously polling this endpoint can observe microscopic mathematical changes to deduce the exact millisecond when other patients are called, inadvertently mapping out ER staff activity.SQL: then extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1)

5. First Recommended Change (Addresses Q5: Priorities)
The very first change must be eliminating the change_signal row-update bottleneck to prevent immediate database locking and cascading timeouts. You should replace it by either inserting append-only transient rows into a signal table with a TTL, or bypassing the table entirely using PostgreSQL pg_notify and Supabase Realtime Broadcast.SQL: create trigger visits_changed after insert or update or delete on public.visits for each statement execute function public.touch_change_signal();"

Grok Fast: "The design takes several things for granted that are fragile or incomplete under real conditions.1. “Anon has zero table rights + security-definer functions = patients are safely isolated”This is the core security claim, and it is only true if every privilege, default grant, search_path, and future migration stays perfect.

The design assumes:
No one will ever grant table-level privileges to anon or authenticated by accident.
Future functions will never be created without the explicit revoke/grant pattern.
security definer + search_path = '' is enough forever.
Supabase’s default privileges and any future extension/package won’t re-introduce rights.
A single migration that forgets the revoke, or a new helper function that is left executable, re-opens the table. The design treats the current two migration files as a permanent security perimeter; they are not.2. “Only the change_signal is published, therefore patients never see visit data via realtime”This assumes:
The publication membership is the only thing that matters.
No one will ever add visits (or a view) to the publication later.
Clients never receive row-level data through some other channel (e.g. a future broadcast, presence, or a misconfigured channel).
The signal itself cannot be used as a side channel (e.g. timing of updates correlated with known actions).
The signal is a pure presence/absence of change. An observer who can also call get_patient_visit (or who colludes with someone who can) can still correlate. The design treats “no visit rows in the publication” as equivalent to “no information leakage via realtime.”3. “Place-in-line and average-gap calculations leak nothing useful”get_patient_visit deliberately returns:
exact ordinal among currently waiting patients at the same site (ordered by triaged_at, id),
average minutes between the last ≤6 callbacks at the site.
This assumes that revealing the current length of the off-site queue and the recent service rate is harmless. In a real ER it is not: it is operational intelligence. An attacker (or a curious patient) with a valid token can poll and reconstruct:
how many people are waiting,
how fast people are being called,
whether the line is growing or shrinking.
The design treats these aggregates as “patient-safe” because they are not other people’s codes or tokens. They are still sensitive operational data.4. “Token = 128 bits of Crockford base32 ⇒ guessing is impossible”The token alphabet is restricted and the length is fixed. 128 bits is strong against pure brute force, but the design assumes:
Tokens are never logged, never appear in URLs that get shared, never end up in browser history, crash reports, analytics, or server logs.
The server route that creates them never leaks them.
There is no timing or error-oracle difference between “token does not exist” and “token exists but status is wrong.”
record_seen and confirm_on_my_way both return a boolean that is effectively “did this token match a row in the right state.” That is a mild oracle. Combined with any future endpoint that behaves differently on existence, it becomes useful.5. “Staff can re-show the QR (i.e. the token) later” is treated as a hard requirement without frictionBecause staff must be able to re-display the access token, the design gives authenticated staff full read access to the token column. That assumes:
Staff accounts are never compromised.
Staff devices are never shared or left unlocked.
Audit logs will be enough after the fact.
No one will ever build a “lookup by code → show token” UI that becomes a high-value target.
The moment staff can read tokens, the token is no longer a pure patient secret; it is a staff secret as well. The design accepts this without compensating controls (short-lived tokens, re-issuance, audit of every token reveal, etc.).6. “Rate limit of 30 home starts per site per minute + Vercel firewall is enough”start_home_visit only checks a site-wide count of home visits created in the last minute. It assumes:
Attackers cannot rotate IPs or devices fast enough to matter.
The Vercel firewall rule (not yet written) will be perfect and will stay in place.
Creating many pre_arrival rows is only a mild nuisance, not a storage, index, or cleanup problem.
Thirty per minute per site is still 43 200 per day. With two sites that is a large number of rows that must later be cleaned up, and the index on (site, status, triaged_at, id) will feel it.7. “Statement-level triggers + one-row signal is sufficient and race-free”The design assumes that touching a single row on every change is both correct and scalable. Under concurrent load:
Multiple statements can fire the trigger in the same transaction or close together.
The signal becomes a hot row that every listener and every writer contends on.
There is no guarantee that a client that sees a new changed_at will then see the data that caused it (the subsequent get_patient_visit can race with further updates).
This is acceptable for a prototype; it is not something to take for granted for production.8. “App-level status checks in the WHERE clause prevent double-application of steps”Staff updates are expected to include the expected current status in the WHERE. That assumes every code path does it, every future feature does it, and no one ever writes a bulk or admin update that skips the check. The database itself does not enforce state-machine transitions; the application does. Application assumptions are the first things that break under concurrent staff screens or buggy deploys.9. “No personal data + 6-character codes = nothing sensitive”The codes are not secrets, the tokens are. But the combination of code + site + status + place-in-line + timing still forms a trackable visit. The design assumes that because there is no name or health-card number, re-identification risk is zero. In a small community hospital that is not true; patterns of waiting, calling, and arrival times can still be identifying.10. “Phases 3/4 features (24 h deletion, still-here, survey) can be added later without changing the security model”The current functions and policies are written as if the table schema and the patient surface will stay essentially the same. Adding survey scores, still-here timestamps, and automatic deletion will require new functions, new grants, and new policies. Each of those is another opportunity to re-introduce the privileges the current design carefully removed.Highest-leverage assumption to challenge first

The belief that “patients only ever touch three security-definer functions and therefore cannot see or affect other visits” is durable. It is true only while the grant/revoke discipline and the absence of other entry points remain perfect. That is an operational and process assumption, not a cryptographic one. Everything else (queue visibility, token re-display to staff, rate limits, signal-based realtime) is secondary to whether that isolation actually holds under change."

Claude Code's response: "I checked every point from both reviews against the SQL and the live database. I fixed four problems in the draft, added a permissions check, and saved it (commit 670bd66). Nothing has run on Supabase yet.

Gemini 3.1 Pro
1. Staff locked out: correct, fixed. I read the project's default permissions and confirmed it: new tables give logged-in users no read or write rights. The draft now grants staff exactly read, add and change on visits, and read and change on site_settings. It grants nothing else.
2. The one-row signal will jam all writes: I disagree, no change. Every change is a single quick statement, so the signal row is held for about a millisecond. An emergency department makes a few changes a minute, and Postgres handles thousands of these a second. Gemini's alternative, Supabase broadcast, adds more security setup to get right. I'll look at it again if the Phase 2 tests show any delay.
3. Two requests at once could beat the 30-a-minute cap: correct, fixed. Starting a visit from home now takes a short lock per site, so starts at a site happen one at a time.
4. The call-back average was precise enough to work out exact call times: fair, fixed. It's now rounded to whole minutes. The wait range shown to patients was already rounded to 5 minutes, so patients see no difference.

Grok
- "The security only holds while every future change is perfect": the most useful point. I added supabase/checks/permissions.sql. It lists exactly what patients and logged-in users can touch, and every table that's missing row-level security. I'll run it after every database change, along with Supabase's own security advisor, and compare it to the expected list written in the file.
- 43,200 junk visits a day are possible: fair. I lowered the cap from 30 to 10 starts per site per minute. That's still plenty for 3 to 5 testers. The per-device limit on Vercel is the real protection, and 24-hour deletion arrives in Phase 3.
- Tokens could leak through links and logs: already handled.
  - The link carries the token after a #, which browsers never send to a server.
  - The app removes it from the address bar as soon as the page opens.
  - The database calls will send the token inside the request, not in the web address.
- Place in line and wait figures reveal queue information: no change. SPEC requires showing them. Rounding the average (Gemini's point 4) removes the precise part.
- Staff can read tokens: no change, SPEC requires it. "Show QR again" needs the token. I'll flag this for GPT-6 Astra's security review at the end of the phase.
- The signal as a side channel, re-identification, and later phases: no change. All it reveals is "something changed somewhere," and there are no names or real patients. The permissions check above covers new functions in later phases.

One decision for you (Grok's point 8)
Today the app decides which steps are allowed, for example "Call back only while waiting." The database only checks that the values are valid. I could also make the database enforce the allowed steps, so a buggy screen couldn't make an impossible change.
- Add it later (my recommendation): stopping double clicks is already planned. Staff screens will only change a visit if it's still in the expected status. It also fits better once Phase 3 adds the other steps (the unable-to-reach review, reopening a visit). Astra can judge whether it's needed.
- Add it now: about 40 more lines of SQL, with one more review round.

Your call. If you're happy with "later", reply "approved, run it" and I'll:
1. run the two setup files on Supabase
2. run the permissions check and the security advisor
3. show you the results."
