# Handoff: review the "I'm still here" prompt (Phase 3)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) and Supabase (PostgreSQL) concept prototype of a virtual emergency department waiting room. Patients follow their visit on their own phone with no login; a long random token in the link is the only way in. Staff sign in.

SPEC rules for this feature:
- Every 30 minutes while waiting off-site, an "I'm still here" button appears. No tap within 10 minutes of the prompt flags the patient on the staff screen.
- The tap only tells staff the patient is still following the visit. It is not a clinical reassessment, and neither screen may describe it as one.
- Patients can do exactly five things, each through its own narrow database function; "I'm still here" is allowed only while waiting. A patient's token reads only its own visit, through one function that returns only patient-safe fields.
- All times are demo placeholders (settings), not clinical deadlines.

What was built:
- Database change `20261111050000_still_here.sql`: new `record_still_here(token)` (sets `last_still_here_at` only while status = waiting; an existing trigger replaces any time with the database's `now()`, raises a version number and touches a one-row change signal). `get_patient_visit` was dropped and re-created to also return the visit's own `triaged_at`.
- Rule `lib/stillHere.ts`: due 30 minutes after the later of triage and the last tap; "missed" 10 minutes after that. Only while waiting and triaged.
- Patient prompt `components/patient/StillHerePrompt.tsx`; staff flag in `components/staff/VisitRow.tsx`.

Checked: 92 unit tests, type check, lint; the permissions check matched the expected list; no table without row-level security; tested in the browser with the times set to 1 minute (prompt appeared, flag appeared, tap cleared it).

## Find problems (do not just confirm)

1. Security: can a patient's token do anything new it should not, or learn anything about other visits? Is returning `triaged_at` to the patient's own phone a problem?
2. Correctness of the rule: wrong answers at the edges (exactly 30 or 40 minutes, a tap before triage, a visit reopened or called and then put back to waiting with Undo, a phone whose clock is wrong)?
3. The patient prompt: anything that could confuse a patient, fail for a screen-reader user, or keep showing after it should stop? Is the "thank you" logic sound?
4. The staff flag: could it show wrongly or fail to show? Is the wording clear without implying a health check?
5. Anything in the diff that breaks existing behaviour.

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff)

```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index c7382e1..9d8ce16 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -10,6 +10,7 @@ import { EmergencyLine } from "@/components/EmergencyLine";
 import { PatientShell } from "@/components/PatientShell";
 import { PatientStatus } from "@/components/patient/PatientStatus";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
+import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
 import { fill, textFor } from "@/lib/text";
 
 export default function PatientPage() {
@@ -103,6 +104,7 @@ export default function PatientPage() {
             {t.visitCode}: <strong className="font-mono tracking-widest">{view.code}</strong> ·{" "}
             {fill(t.siteName, { site: view.site })}
           </p>
+          {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} />}
           <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
new file mode 100644
index 0000000..0e9ed17
--- /dev/null
+++ b/components/patient/StillHerePrompt.tsx
@@ -0,0 +1,80 @@
+"use client";
+
+// The "I'm still here" prompt on the patient screen: shows 30 minutes after triage or after the
+// last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
+// still following the visit; the screen says it is not a health check.
+
+import { useEffect, useState } from "react";
+import { recordStillHere } from "@/data/patientVisit";
+import type { PatientView } from "@/lib/patientView";
+import { stillHereState } from "@/lib/stillHere";
+import { textFor } from "@/lib/text";
+import { Button } from "@/components/Button";
+import { useNow } from "@/components/useNow";
+
+/** How long the thank-you stays after a tap. */
+const THANKS_MS = 5 * 60_000;
+
+export function StillHerePrompt({ view, token }: { view: PatientView; token: string }) {
+  const now = useNow();
+  const [sending, setSending] = useState(false);
+  const [notSaved, setNotSaved] = useState(false);
+  const [announcement, setAnnouncement] = useState("");
+  const t = textFor(view.language);
+  const state = now ? stillHereState(view, now) : "not_due";
+  const showing = state !== "not_due";
+
+  // Tell screen readers once each time the prompt appears (politely; it is not urgent).
+  useEffect(() => {
+    if (!showing) return;
+    const timer = window.setTimeout(() => setAnnouncement(t.announce.stillHere), 300);
+    return () => {
+      window.clearTimeout(timer);
+      setAnnouncement("");
+    };
+  }, [showing, t.announce.stillHere]);
+
+  const tapped = view.lastStillHereAt ? new Date(view.lastStillHereAt).getTime() : null;
+  const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;
+
+  async function onTap() {
+    if (sending) return;
+    setSending(true);
+    const result = await recordStillHere(token);
+    setSending(false);
+    setNotSaved(result === "not_saved");
+  }
+
+  return (
+    <>
+      <p aria-live="polite" className="sr-only">
+        {announcement}
+      </p>
+      {showing && (
+        <section
+          aria-labelledby="still-here-heading"
+          className="space-y-3 rounded-xl border-4 border-brand bg-card p-4"
+          data-testid="still-here"
+        >
+          <h2 id="still-here-heading" className="text-xl font-bold">
+            {t.stillHere.heading}
+          </h2>
+          <p>{t.stillHere.meaning}</p>
+          <Button onClick={onTap} aria-disabled={sending} className="w-full text-lg">
+            {sending ? t.patient.sending : t.stillHere.button}
+          </Button>
+          {notSaved && (
+            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
+              {t.patient.notSaved}
+            </p>
+          )}
+        </section>
+      )}
+      {thanking && (
+        <p role="status" className="clean-card font-semibold" data-testid="still-here-thanks">
+          {t.stillHere.thanks} {t.stillHere.meaning}
+        </p>
+      )}
+    </>
+  );
+}
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index cdb8b7b..9382cf5 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -5,6 +5,8 @@
 import { useState } from "react";
 import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
 import { minutesBetween } from "@/lib/queue";
+import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
+import { stillHereState } from "@/lib/stillHere";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
 
@@ -20,7 +22,12 @@ const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
 const CHANGED = "The list just changed. Check this patient again.";
 
 function progress(visit: Visit, now: Date): string {
-  if (visit.status === "waiting") return "Waiting off-site";
+  if (visit.status === "waiting") {
+    // "I'm still here" only shows the patient is still following the visit; never a health check.
+    return visit.last_still_here_at
+      ? `Waiting off-site · last "I'm still here" ${minutesBetween(visit.last_still_here_at, now)} min ago`
+      : "Waiting off-site";
+  }
   const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
   const steps = [`Called ${sinceCall} min ago`];
   // seen_at means the called screen was displayed on the phone, not that the patient read it.
@@ -56,6 +63,12 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       <p className="mt-1 font-semibold" data-testid="progress">
         {progress(visit, now)}
       </p>
+      {stillHereState({ status: visit.status, triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at }, now) ===
+        "missed" && (
+        <p className="mt-2 rounded-lg border-2 border-red-800 bg-red-50 p-2 font-semibold text-red-900" data-testid="still-here-flag">
+          Missed &ldquo;I&apos;m still here&rdquo;: no tap within {STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.
+        </p>
+      )}
       <div className="mt-3 flex flex-wrap gap-2">
         {visit.status === "waiting" && (
           <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
diff --git a/data/patientVisit.ts b/data/patientVisit.ts
index 9cd8a6a..7333dd7 100644
--- a/data/patientVisit.ts
+++ b/data/patientVisit.ts
@@ -129,7 +129,10 @@ export function usePatientView(token: string | null): Shown | undefined {
 }
 
 /** Saved = the step was recorded; refused = not allowed now; not_saved = could not reach the database. */
-async function patientStep(step: "record_seen" | "confirm_on_my_way", token: string): Promise<ChangeResult> {
+async function patientStep(
+  step: "record_seen" | "confirm_on_my_way" | "record_still_here",
+  token: string,
+): Promise<ChangeResult> {
   try {
     const { data, error } = await supabaseBrowser().rpc(step, { p_token: token });
     if (error || typeof data !== "boolean") return "not_saved";
@@ -149,3 +152,8 @@ export function recordSeen(token: string): Promise<ChangeResult> {
 export function confirmOnMyWayByToken(token: string): Promise<ChangeResult> {
   return patientStep("confirm_on_my_way", token);
 }
+
+/** The patient taps "I'm still here". Only while waiting off-site. */
+export function recordStillHere(token: string): Promise<ChangeResult> {
+  return patientStep("record_still_here", token);
+}
diff --git a/lib/demoTimes.ts b/lib/demoTimes.ts
new file mode 100644
index 0000000..35de167
--- /dev/null
+++ b/lib/demoTimes.ts
@@ -0,0 +1,8 @@
+// The demo's timing settings in one place. They are placeholders, not clinical deadlines:
+// a hospital's clinical lead would set the real ones. Shorten them here when testing.
+
+/** How often the "I'm still here" prompt appears while a patient waits off-site. */
+export const STILL_HERE_EVERY_MINUTES = 30;
+
+/** How long the patient has to tap before staff see a flag. */
+export const STILL_HERE_ANSWER_WITHIN_MINUTES = 10;
diff --git a/lib/patientView.ts b/lib/patientView.ts
index ff6611e..947dab5 100644
--- a/lib/patientView.ts
+++ b/lib/patientView.ts
@@ -14,6 +14,8 @@ export type PatientView = {
   waitHigh: number | null;
   calledAt: string | null;
   lastStillHereAt: string | null;
+  /** When this visit was triaged; starts the "I'm still here" clock (lib/stillHere.ts). */
+  triagedAt: string | null;
   seen: boolean;
   closed: boolean;
   /** Started from home, never triaged, and past the 6 hours staff keep expecting it. */
diff --git a/lib/patientViewFromRow.test.ts b/lib/patientViewFromRow.test.ts
index 33d6235..c000e33 100644
--- a/lib/patientViewFromRow.test.ts
+++ b/lib/patientViewFromRow.test.ts
@@ -16,6 +16,13 @@ const waiting: PatientVisitRow = {
 };
 
 describe("patient view from a database row", () => {
+  it("passes the triage time through, and is empty before the database change has run", () => {
+    expect(patientViewFromRow({ ...waiting, triaged_at: "2026-11-10T12:00:00Z" }).triagedAt).toBe(
+      "2026-11-10T12:00:00Z",
+    );
+    expect(patientViewFromRow(waiting).triagedAt).toBeNull();
+  });
+
   it("uses the 15-minute default gap until there is call-back history", () => {
     const view = patientViewFromRow(waiting);
     expect(view.placeInLine).toBe(2);
diff --git a/lib/patientViewFromRow.ts b/lib/patientViewFromRow.ts
index 8968687..31166b1 100644
--- a/lib/patientViewFromRow.ts
+++ b/lib/patientViewFromRow.ts
@@ -19,6 +19,8 @@ export type PatientVisitRow = {
   seen: boolean;
   closed: boolean;
   expired: boolean;
+  /** Added in 20261111050000_still_here.sql; missing (undefined) before that change has run. */
+  triaged_at?: string | null;
 };
 
 export function patientViewFromRow(row: PatientVisitRow): PatientView {
@@ -36,6 +38,7 @@ export function patientViewFromRow(row: PatientVisitRow): PatientView {
     waitHigh: range?.high ?? null,
     calledAt: row.called_at,
     lastStillHereAt: row.last_still_here_at,
+    triagedAt: row.triaged_at ?? null,
     seen: row.seen,
     closed: row.closed,
     expired: row.expired,
diff --git a/lib/startPage.test.ts b/lib/startPage.test.ts
index 2a66613..e204627 100644
--- a/lib/startPage.test.ts
+++ b/lib/startPage.test.ts
@@ -12,6 +12,7 @@ const view = (over: Partial<PatientView>): PatientView => ({
   waitHigh: 20,
   calledAt: null,
   lastStillHereAt: null,
+  triagedAt: null,
   seen: false,
   closed: false,
   expired: false,
diff --git a/lib/stillHere.test.ts b/lib/stillHere.test.ts
new file mode 100644
index 0000000..b9e032c
--- /dev/null
+++ b/lib/stillHere.test.ts
@@ -0,0 +1,38 @@
+// Checks when the "I'm still here" prompt is due and when a tap counts as missed.
+
+import { describe, expect, it } from "vitest";
+import { stillHereState } from "./stillHere";
+
+const triaged = "2026-11-10T12:00:00Z";
+const at = (time: string) => new Date(`2026-11-10T${time}:00Z`);
+const waiting = { status: "waiting" as const, triagedAt: triaged, lastStillHereAt: null };
+
+describe("stillHereState", () => {
+  it("is not due for the first 30 minutes after triage", () => {
+    expect(stillHereState(waiting, at("12:29"))).toBe("not_due");
+  });
+
+  it("is due from 30 minutes, and missed from 40 minutes without a tap", () => {
+    expect(stillHereState(waiting, at("12:30"))).toBe("due");
+    expect(stillHereState(waiting, at("12:39"))).toBe("due");
+    expect(stillHereState(waiting, at("12:40"))).toBe("missed");
+  });
+
+  it("starts the clock again at each tap", () => {
+    const tapped = { ...waiting, lastStillHereAt: "2026-11-10T12:35:00Z" };
+    expect(stillHereState(tapped, at("12:40"))).toBe("not_due");
+    expect(stillHereState(tapped, at("13:05"))).toBe("due");
+    expect(stillHereState(tapped, at("13:15"))).toBe("missed");
+  });
+
+  it("ignores a tap older than triage (a reopened visit starts fresh)", () => {
+    const old = { ...waiting, lastStillHereAt: "2026-11-10T11:00:00Z" };
+    expect(stillHereState(old, at("12:10"))).toBe("not_due");
+  });
+
+  it("is never due unless waiting off-site and triaged", () => {
+    expect(stillHereState({ ...waiting, status: "called" }, at("14:00"))).toBe("not_due");
+    expect(stillHereState({ ...waiting, status: "declined" }, at("14:00"))).toBe("not_due");
+    expect(stillHereState({ ...waiting, triagedAt: null }, at("14:00"))).toBe("not_due");
+  });
+});
diff --git a/lib/stillHere.ts b/lib/stillHere.ts
new file mode 100644
index 0000000..29335a5
--- /dev/null
+++ b/lib/stillHere.ts
@@ -0,0 +1,36 @@
+// Decides when the "I'm still here" prompt shows on the patient's phone and when staff see
+// a missed tap. The clock starts at triage and starts again at every tap. Only while waiting
+// off-site. The tap only tells staff the patient is still following the visit; it is not a
+// reassessment (SPEC).
+
+import { STILL_HERE_ANSWER_WITHIN_MINUTES, STILL_HERE_EVERY_MINUTES } from "./demoTimes";
+import type { VisitStatus } from "./visit";
+
+/** not_due = nothing to show; due = show the prompt; missed = still showing, and staff are flagged. */
+export type StillHereState = "not_due" | "due" | "missed";
+
+type StillHereInput = {
+  status: VisitStatus;
+  triagedAt: string | null;
+  lastStillHereAt: string | null;
+};
+
+const MINUTE_MS = 60_000;
+
+/** The later of triage and the last tap, as milliseconds; null if the visit was never triaged. */
+function clockStart({ triagedAt, lastStillHereAt }: StillHereInput): number | null {
+  if (!triagedAt) return null;
+  const triaged = new Date(triagedAt).getTime();
+  const tapped = lastStillHereAt ? new Date(lastStillHereAt).getTime() : -Infinity;
+  return Math.max(triaged, tapped);
+}
+
+export function stillHereState(visit: StillHereInput, now: Date): StillHereState {
+  if (visit.status !== "waiting") return "not_due";
+  const start = clockStart(visit);
+  if (start === null) return "not_due";
+  const minutes = (now.getTime() - start) / MINUTE_MS;
+  if (minutes >= STILL_HERE_EVERY_MINUTES + STILL_HERE_ANSWER_WITHIN_MINUTES) return "missed";
+  if (minutes >= STILL_HERE_EVERY_MINUTES) return "due";
+  return "not_due";
+}
diff --git a/supabase/checks/permissions.sql b/supabase/checks/permissions.sql
index c614aaa..cd58608 100644
--- a/supabase/checks/permissions.sql
+++ b/supabase/checks/permissions.sql
@@ -3,11 +3,12 @@
 -- the public schema. Compare the result with the expected list below; anything extra is
 -- a hole to fix before going on. Update the expected list only on purpose.
 --
--- Expected after Phase 2:
+-- Expected after Phase 3's still-here change (20261111050000_still_here.sql):
 --   anon           table     change_signal       SELECT
 --   anon           function  confirm_on_my_way   EXECUTE
 --   anon           function  get_patient_visit   EXECUTE
 --   anon           function  record_seen         EXECUTE
+--   anon           function  record_still_here   EXECUTE
 --   authenticated  table     change_signal       SELECT
 --   authenticated  table     site_settings       SELECT, UPDATE
 --   authenticated  table     visits              INSERT, SELECT, UPDATE
@@ -15,12 +16,13 @@
 --   authenticated  function  get_patient_visit   EXECUTE
 --   authenticated  function  is_staff            EXECUTE
 --   authenticated  function  record_seen         EXECUTE
+--   authenticated  function  record_still_here   EXECUTE
 -- Also listed, and fine: rls_auto_enable, for both roles. Supabase made it when the project
 -- was created; it turns on row-level security for each new table. It is an event trigger
 -- function, which Postgres refuses to run as an ordinary call.
 -- Also expected: every table listed has row-level security on (see the second query).
--- Supabase's security advisor warns that anon can run get_patient_visit, record_seen and
--- confirm_on_my_way. That is on purpose (SPEC hard rule 5); each needs the visit's token.
+-- Supabase's security advisor warns that anon can run get_patient_visit, record_seen,
+-- confirm_on_my_way and record_still_here. That is on purpose (SPEC hard rule 5); each needs the visit's token.
 
 select grantee as role, 'table' as kind, table_name as name,
        string_agg(privilege_type, ', ' order by privilege_type) as rights
diff --git a/supabase/migrations/20261111050000_still_here.sql b/supabase/migrations/20261111050000_still_here.sql
new file mode 100644
index 0000000..55d3625
--- /dev/null
+++ b/supabase/migrations/20261111050000_still_here.sql
@@ -0,0 +1,98 @@
+-- Phase 3: the "I'm still here" tap (SPEC /patient and hard rule 5).
+-- 1. A new patient function, record_still_here: the phone's tap sets last_still_here_at,
+--    only while the visit is waiting off-site. The existing trigger puts in the database's
+--    own time, raises the version and touches the change signal.
+-- 2. get_patient_visit also returns triaged_at, the visit's own triage time, so the phone
+--    knows when the first prompt is due (lib/stillHere.ts). It shows only this visit's time.
+-- A function's list of returned columns cannot be changed in place, so it is dropped and
+-- made again (same body plus one column), and its rights are given again below.
+
+drop function public.get_patient_visit(text);
+
+create function public.get_patient_visit(p_token text)
+returns table (
+  code text,
+  site text,
+  language text,
+  status text,
+  place_in_line integer,
+  -- Average minutes between the last 5 call-backs at this site, rounded to whole minutes
+  -- so it cannot be used to work out exactly when other patients were called.
+  -- Null with under 2 call-backs.
+  average_gap_minutes integer,
+  called_at timestamptz,
+  last_still_here_at timestamptz,
+  seen boolean,
+  closed boolean,
+  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
+  expired boolean,
+  -- New: when this visit was triaged (the start of off-site waiting).
+  triaged_at timestamptz
+)
+language sql
+stable
+security definer
+set search_path = ''
+as $$
+  select
+    me.code,
+    me.site,
+    me.language,
+    me.status,
+    case when me.status = 'waiting' and me.triaged_at is not null then (
+      select count(*)::integer + 1
+      from public.visits other
+      where other.site = me.site
+        and other.status = 'waiting'
+        and other.triaged_at is not null
+        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
+    ) end,
+    case when me.status = 'waiting' then (
+      -- The average of the gaps between 6 call-backs is (last - first) / 5.
+      select case when count(*) >= 2
+        then round(extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1))::integer
+      end
+      from (
+        select other.called_at
+        from public.visits other
+        where other.site = me.site and other.called_at is not null
+        order by other.called_at desc
+        limit 6
+      ) last6
+    ) end,
+    me.called_at,
+    me.last_still_here_at,
+    me.seen_at is not null,
+    me.closed_at is not null,
+    me.status = 'pre_arrival' and me.triaged_at is null
+      and me.created_at <= now() - interval '6 hours',
+    me.triaged_at
+  from public.visits me
+  where me.access_token = p_token;
+$$;
+
+-- ---------------------------------------------------------------------------
+-- "I'm still here": only while waiting off-site (lib/stillHere.ts).
+-- It only tells staff the patient is still following the visit; it is not a reassessment.
+-- Returns true if it was recorded, false if the step is not allowed now.
+-- ---------------------------------------------------------------------------
+create function public.record_still_here(p_token text)
+returns boolean
+language plpgsql
+security definer
+set search_path = ''
+as $$
+begin
+  update public.visits
+  set last_still_here_at = now()
+  where access_token = p_token and status = 'waiting';
+  return found;
+end;
+$$;
+
+-- Who may call what. New functions are callable by everyone unless this is done.
+revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
+revoke execute on function public.record_still_here(text) from public, anon, authenticated;
+
+grant execute on function public.get_patient_visit(text) to anon, authenticated;
+grant execute on function public.record_still_here(text) to anon, authenticated;
```

## Response

From Gemini 3.1 Pro (pasted by the owner, 2026-11-11):

1. Security: nothing found. `record_still_here` only changes the token's own visit while waiting; returning the patient's own `triaged_at` is safe.
2. Rule edge cases (`lib/stillHere.ts`): (a) if a called patient is put back to waiting with Undo long after the last tap, the old tap time makes them "missed" at once; fix: reset `last_still_here_at` to now on Undo. (b) The prompt uses the phone's clock (`useNow()`); a fast clock shows it early, a slow one never, while staff still see "missed"; fix: work out the difference between the server's clock and the phone's and correct for it.
3. Patient prompt (`StillHerePrompt.tsx`): after a tap, the prompt stays on screen until the next 15-second read, so patients tap again; fix: hide it locally as soon as the tap is saved.
4. Staff flag (`VisitRow.tsx`): a reopened visit keeps the old `last_still_here_at`, so the row shows a stale "last 'I'm still here' 120 min ago"; fix: show it only if it is at or after `triaged_at`.
5. Nothing in the diff breaks existing behaviour; the frontend works before the database change runs.

## Claude's check (2026-11-11)

1. Agreed.
2. (a) Not possible as described: Undo only reverses arrived or removed, and a called visit is restored to called or on the way (`statusBeforeClose` in `lib/visitActions.ts`), never to waiting. A reopened visit gets a new `triaged_at`, which restarts the clock. The only real case is Undo of a removal of a waiting patient: the prompt shows at once and staff see "missed" if the last tap was long ago, which is accurate (no tap for that long). Not changed; resetting `last_still_here_at` would record a tap the patient never made. (b) Partly right: a wrong phone clock shifts when that phone's prompt appears, but the staff flag uses the staff laptop's clock and the database's times, so staff are still told. Phones set their clocks from the network. Accepted as a known limit (logged in docs/progress.md), not fixed.
3. Not correct: after the tap, `patientStep` in `data/patientVisit.ts` re-reads the visit before the button leaves "Sending…", so the prompt changes to "Thank you." straight away (seen in the owner's browser test). Not changed.
4. Correct. Fixed: `lastTapThisWait` in `lib/stillHere.ts` (with a test) gives the last tap only if it came after the latest triage; the staff row uses it.
5. Agreed.

93 unit tests, type check and lint pass. Review closed; file archived.
