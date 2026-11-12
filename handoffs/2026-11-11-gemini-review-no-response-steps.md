# Handoff: review the no-response steps after "Call back" (Phase 3)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) and Supabase (PostgreSQL) concept prototype of a virtual emergency department waiting room. Patients follow their visit on their own phone with no login; a long random token in the link is the only way in. Staff sign in. Staff screens save a visit by sending only the changed fields, and only if the visit's version number still matches; a database trigger replaces every newly filled time with the database's `now()`, except `followup_paused_until`, which it keeps as sent.

SPEC rules for this feature (all times are demo settings in `lib/demoTimes.ts`, not clinical deadlines):
- 0 minutes after "Call back": the patient's called screen alerts.
- 10 minutes without "I'm on my way": a second alert on the patient screen; the staff screen flags "No reply 10 min after call-back. Phone the patient now." The demo stores no phone numbers, so staff record each simulated call with "Phoned, answered" or "Phoned, no answer". "Answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (default 10 minutes). After the pause the steps continue from the time since called_at; they do not restart. A visit with an answered call that still does not arrive is flagged "Answered the phone, not here yet: they haven't tapped 'I'm on my way' or arrived.", never "Review: unable to reach".
- 20 minutes: staff flag "Still no reply 20 min after call-back. Phone the patient again."; the patient screen shows "Please return now. Staff will review your visit if you do not respond."
- 30 minutes with no answered call: "Review: unable to reach". The visit stays in the line until a nurse confirms; then status unable_to_reach, closed_at set, it leaves the active line. Not recorded as left without being seen.
- Reopen an unable_to_reach visit: clears closed_at, status needs_reassessment (back to triage).
- "On the way, not arrived": a set time (default 30 minutes) after confirmed_at. Never removed automatically.
- Never rely on sound or colour alone; WCAG 2.2 AA is the target.

What was built:
- Rule `lib/followUp.ts`: `staffFollowUp` (which flag), `canRecordPhoneCall`, `wasAnswered`, `patientCallStep` (patient message). Tests in `lib/followUp.test.ts`.
- Steps in `lib/visitActions.ts`: `recordPhoneCall`, `confirmUnableToReach`, `reopenUnableToReach`, and triage again (`checkInHomeVisit` now also accepts a needs_reassessment visit; triage clears the call-back and phone fields).
- Staff: `components/staff/FollowUpPanel.tsx` (flag, phone buttons, "Confirm unable to reach" behind a disclosure), Reopen in `components/staff/RecentlyClosed.tsx`; Reopen opens the visit in the check-in form.
- Patient: `components/patient/CallReminder.tsx` on the called screen (assertive screen-reader announcement once per step).
- No database change.

- After the browser test: reopened visits are listed under "Back for reassessment" (in the Expected arrivals box) until triaged again, and the owner chose the flag wording above. Staff record calls with "Phoned, answered" and "Phoned, no answer" (kept on purpose: "Call back" already means sending the patient the come-back message).

Checked: 137 unit tests, type check, lint. Tested in a browser by the owner with the times shortened to 1, 2 and 3 minutes: the no-answer path (patient alert at 1 minute and "Please return now" at 2, both announced; staff Review flag; Confirm unable to reach; Reopen) and the answered path (phone flag, paused, phone again after the pause, then "answered, not here yet", no Review flag) worked as planned.

## Points Claude already knows about (judge each: real problem or acceptable for a demo, and the simplest fix)

1. The pause end (`followup_paused_until`) is worked out from the staff laptop's clock; the database keeps it as sent. A laptop with a badly wrong clock could make the pause far too short or far too long, and a long pause hides "Review: unable to reach". Alternative: a database change so the trigger sets it from the database clock.
2. The answered-call pause affects only the staff flags. The patient's phone still shows "Please return now" at 20 minutes after an answered call (the patient view does not receive the pause).
3. "Was any call answered?" is worked out as last_phone_result = answered OR followup_paused_until is set, because last_phone_result keeps only the latest result. This relies on triage clearing followup_paused_until.
4. `review_flagged_at` is never filled; the review flag is computed from called_at. Fill it or drop it?
5. The phone flags clear by number of calls, not by when the calls happened: two calls at 11 and 12 minutes mean "Phone a second time" never shows.
6. Flags that appear as time passes are not announced to staff screen-reader users (only shown as text and colour).
7. Triage again after Reopen wipes the first call-back (the dashboard's "call-back to arrival" average loses it) and starts a new place in line. (Found in testing and fixed: a reopened visit was in no list once the check-in form closed; it is now listed under "Back for reassessment".)
8. "30 minutes passed" (when "Confirm unable to reach" may be pressed) is judged by the staff laptop's clock against the database's called_at.
9. The database does not check which steps are allowed; any staff screen could save any status (planned for later in Phase 3).
10. Wording: could staff confuse "Call back" (sends the patient the come-back message) with the phone-call buttons "Phoned, answered" and "Phoned, no answer"? Suggest clearer words if so.

## Find problems (do not just confirm)

1. Correctness of `staffFollowUp` and `patientCallStep`: wrong answers at the edges (exactly 10, 20, 30 minutes; an answered call during the review step; Undo after Mark arrived putting a called visit back; a reopened and re-triaged visit; calls recorded before the pause ends)?
2. Does any path let a visit with an answered call be confirmed "unable to reach", or let a visit leave the line without a nurse confirming?
3. Staff screen: wording that is unclear or could be pressed by mistake; anything that fails for keyboard or screen-reader users.
4. Patient screen: could the reminder confuse a patient, show at the wrong time, keep showing after "I'm on my way", or be missed by a screen-reader user? Is an assertive announcement right here?
5. Anything in the diff that breaks existing behaviour (Undo, check-in from home, the line order, the 6-hour expiry of visits from home).

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem. Then one line per point in "Points Claude already knows about": real problem or acceptable, and the fix you would choose.

## The change (git diff)

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 3699e49..5046900 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -136,7 +136,7 @@ export default function StaffPage() {
               ))}
             </ol>
           )}
-          {visits && <RecentlyClosed key={site} visits={visits} site={site} onUndoResult={onUndoResult} />}
+          {visits && <RecentlyClosed key={site} visits={visits} site={site} onUndoResult={onUndoResult} onReopened={chooseHomeVisit} />}
           {visits && <ProgressAnnouncer visits={visits} site={site} />}
         </section>
       </div>
diff --git a/components/patient/CallReminder.tsx b/components/patient/CallReminder.tsx
new file mode 100644
index 0000000..8387013
--- /dev/null
+++ b/components/patient/CallReminder.tsx
@@ -0,0 +1,46 @@
+"use client";
+
+// The extra message on the called screen when the patient has not tapped "I'm on my way":
+// a second alert 10 minutes after the call-back, then "Please return now" at 20 minutes
+// (lib/followUp.ts). Screen readers hear each one once, urgently.
+
+import { useEffect, useState } from "react";
+import { patientCallStep } from "@/lib/followUp";
+import type { PatientView } from "@/lib/patientView";
+import type { PatientText } from "@/lib/text";
+import { useNow } from "@/components/useNow";
+
+export function CallReminder({ view, t }: { view: PatientView; t: PatientText }) {
+  const now = useNow();
+  const step = now ? patientCallStep(view.status, view.calledAt, now) : "first";
+  const words =
+    step === "return_now" ? `${t.returnNow.lead} ${t.returnNow.text}` : step === "second_alert" ? t.secondAlert : "";
+  const spoken = step === "return_now" ? words : step === "second_alert" ? t.announce.secondAlert : "";
+  const [announcement, setAnnouncement] = useState("");
+
+  // Announce once each time the step changes (empty first, so a repeat is still heard).
+  useEffect(() => {
+    if (!spoken) return;
+    const timer = window.setTimeout(() => setAnnouncement(spoken), 300);
+    return () => {
+      window.clearTimeout(timer);
+      setAnnouncement("");
+    };
+  }, [spoken]);
+
+  return (
+    <>
+      <p aria-live="assertive" className="sr-only">
+        {announcement}
+      </p>
+      {words && (
+        <p
+          className="rounded-lg border-4 border-red-800 bg-white p-3 text-lg font-bold text-red-900"
+          data-testid={`call-reminder-${step}`}
+        >
+          {words}
+        </p>
+      )}
+    </>
+  );
+}
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index b3002ba..0fb623c 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -7,6 +7,7 @@ import Link from "next/link";
 import type { PatientView } from "@/lib/patientView";
 import { fill, textFor, type PatientText } from "@/lib/text";
 import { Button } from "@/components/Button";
+import { CallReminder } from "./CallReminder";
 
 type Props = { view: PatientView; language: string; onOnMyWay: () => void; sending: boolean };
 
@@ -42,6 +43,7 @@ function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
         {p.calledHeading}
       </h2>
       <p className="text-lg">{p.calledText}</p>
+      {!confirmed && <CallReminder view={view} t={t} />}
       {confirmed ? (
         <p className="text-lg font-semibold" data-testid="confirmed">
           {p.confirmed}
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 91517de..4c4ad2f 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -124,7 +124,11 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
       </h2>
       {homeVisit && (
         <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 p-3">
-          <p>Started from home. The patient already has this visit on their phone.</p>
+          <p>
+            {homeVisit.source === "home" && homeVisit.triaged_at === null
+              ? "Started from home. The patient already has this visit on their phone."
+              : "Back for reassessment. The patient already has this visit on their phone. Their place in line starts again at this triage."}
+          </p>
           <Button variant="secondary" onClick={cancelHome}>
             Cancel: check in a new patient instead
           </Button>
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index 486c6d5..3f12f08 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -2,11 +2,12 @@
 
 // The staff "Expected arrivals" list: visits started from home that have not reached triage.
 // They are not in the waiting line. Staff pick one from the list, or type the code the patient
-// shows (short-code lookup is staff-only), to check it in after triage.
+// shows (short-code lookup is staff-only), to check it in after triage. The code box also finds
+// a reopened visit that needs reassessment; those are also listed under "Back for reassessment".
 
 import { useState, type FormEvent } from "react";
 import { findVisitByCode } from "@/data/staffActions";
-import { expectedArrivals, isExpected } from "@/lib/expectedArrivals";
+import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
 import { minutesBetween } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -17,6 +18,7 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
   const [typed, setTyped] = useState("");
   const [message, setMessage] = useState("");
   const expected = expectedArrivals(visits, site, now);
+  const reassess = backForReassessment(visits, site);
 
   const [looking, setLooking] = useState(false);
 
@@ -34,7 +36,7 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
     if (visit.site !== site) {
       return setMessage(`Visit ${visit.code} was started for Demo Site ${visit.site}. Switch site to check it in.`);
     }
-    if (!isExpected(visit, now)) {
+    if (!isExpected(visit, now) && visit.status !== "needs_reassessment") {
       return setMessage(
         visit.status === "pre_arrival"
           ? `Visit ${visit.code} was started more than 6 hours ago. Check the patient in as a new visit.`
@@ -72,6 +74,28 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
       <p role="status" className="min-h-6 font-semibold">
         {message}
       </p>
+      {reassess.length > 0 && (
+        <div className="space-y-2">
+          <h3 className="font-bold">Back for reassessment ({reassess.length})</h3>
+          <p className="text-sm text-slate-700">Reopened after &ldquo;unable to reach&rdquo;. Triage again before they rejoin the line.</p>
+          <ul className="space-y-2">
+            {reassess.map((visit) => (
+              <li
+                key={visit.id}
+                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-amber-800 bg-amber-50 p-3"
+                data-testid={`reassess-${visit.code}`}
+              >
+                <p>
+                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · needs reassessment
+                </p>
+                <Button variant="secondary" onClick={() => onChoose(visit)}>
+                  Triage again<span className="sr-only"> visit {visit.code}</span>
+                </Button>
+              </li>
+            ))}
+          </ul>
+        </div>
+      )}
       {expected.length > 0 && (
         <ul className="space-y-2">
           {expected.map((visit) => (
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
new file mode 100644
index 0000000..f53f1c6
--- /dev/null
+++ b/components/staff/FollowUpPanel.tsx
@@ -0,0 +1,109 @@
+"use client";
+
+// The no-response steps on one staff row after "Call back": the flag ("Phone this patient",
+// "Review: unable to reach" and so on), the simulated phone-call buttons, and the nurse's
+// confirmation of "unable to reach". The rule that picks the flag is in lib/followUp.ts.
+
+import { confirmUnableToReachFor, recordPhoneCallFor } from "@/data/staffActions";
+import { CALL_PHONE_AGAIN_MINUTES, CALL_REVIEW_MINUTES, CALL_SECOND_ALERT_MINUTES } from "@/lib/demoTimes";
+import { canRecordPhoneCall, staffFollowUp, type StaffFollowUp } from "@/lib/followUp";
+import { minutesBetween } from "@/lib/queue";
+import type { ChangeResult, Visit } from "@/lib/visit";
+import { Button } from "@/components/Button";
+
+type Props = {
+  visit: Visit;
+  now: Date;
+  saving: boolean;
+  /** The row's save helper: saves one change and shows what happened. */
+  act: (change: () => Promise<ChangeResult>, leftListMessage?: string) => void;
+};
+
+const AMBER = "border-amber-800 bg-amber-50 text-amber-950";
+const RED = "border-red-800 bg-red-50 text-red-900";
+
+const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
+
+/** The words and colour of each flag; null when there is nothing to flag. */
+function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): { text: string; tone: string } | null {
+  switch (followUp.kind) {
+    case "phone":
+      return { text: `No reply ${CALL_SECOND_ALERT_MINUTES} min after call-back. Phone the patient now.`, tone: AMBER };
+    case "phone_again":
+      return { text: `Still no reply ${CALL_PHONE_AGAIN_MINUTES} min after call-back. Phone the patient again.`, tone: AMBER };
+    case "paused":
+      return { text: `Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, tone: AMBER };
+    case "review":
+      return {
+        text: `Review: unable to reach. No answered call ${CALL_REVIEW_MINUTES} min after the call-back. Stays in the line until a nurse confirms.`,
+        tone: RED,
+      };
+    case "contacted_not_arrived":
+      return {
+        text: "Answered the phone, not here yet: they haven’t tapped ‘I’m on my way’ or arrived.",
+        tone: AMBER,
+      };
+    case "on_way_not_arrived": {
+      const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
+      return { text: `On the way, not arrived. Confirmed ${since} min ago.`, tone: AMBER };
+    }
+    default:
+      return null;
+  }
+}
+
+export function FollowUpPanel({ visit, now, saving, act }: Props) {
+  const followUp = staffFollowUp(visit, now);
+  const flag = flagFor(followUp, visit, now);
+  const canPhone = canRecordPhoneCall(visit, now);
+  if (!flag && !canPhone) return null;
+
+  return (
+    <div className="mt-2 space-y-2" data-testid="follow-up">
+      {flag && (
+        <p className={`rounded-lg border-2 p-2 font-semibold ${flag.tone}`} data-testid={`flag-${followUp.kind}`}>
+          {flag.text}
+        </p>
+      )}
+      {canPhone && (
+        <div className="space-y-2">
+          <p className="text-sm text-slate-700">
+            Simulated calls (the demo stores no phone numbers). Recorded so far: {visit.phone_attempts}
+            {visit.last_phone_result && ` (last: ${visit.last_phone_result === "answered" ? "answered" : "no answer"})`}.
+          </p>
+          <div className="flex flex-wrap gap-2">
+            <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "answered"))}>
+              Phoned, answered<span className="sr-only"> for visit {visit.code}</span>
+            </Button>
+            <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "no_answer"))}>
+              Phoned, no answer<span className="sr-only"> for visit {visit.code}</span>
+            </Button>
+          </div>
+        </div>
+      )}
+      {followUp.kind === "review" && (
+        <details>
+          <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
+            Confirm unable to reach
+          </summary>
+          <p className="mt-1 text-sm">
+            The visit leaves the off-site line. It is not recorded as left without being seen. Follow hospital policy outside the app.
+          </p>
+          <Button
+            variant="danger"
+            className="mt-2"
+            aria-disabled={saving}
+            onClick={() =>
+              act(
+                () => confirmUnableToReachFor(visit.id),
+                `Visit ${visit.code} confirmed unable to reach. Reopen is under Recently closed.`,
+              )
+            }
+          >
+            Yes, unable to reach<span className="sr-only"> for visit {visit.code}</span>
+          </Button>
+        </details>
+      )}
+    </div>
+  );
+}
diff --git a/components/staff/RecentlyClosed.tsx b/components/staff/RecentlyClosed.tsx
index d84c856..9a72c19 100644
--- a/components/staff/RecentlyClosed.tsx
+++ b/components/staff/RecentlyClosed.tsx
@@ -1,11 +1,12 @@
 "use client";
 
 // The staff "Recently closed" list: patients marked arrived, left or no-show at this site,
-// newest first, each with its own Undo button. There is no time limit, and older closures
+// newest first, each with its own Undo button; a visit confirmed "unable to reach" has a
+// Reopen button instead, which sends it back to triage. There is no time limit, and older closures
 // stay reachable with "Show older closures", so nobody has to hurry.
 
 import { useEffect, useRef, useState } from "react";
-import { undoCloseVisit } from "@/data/staffActions";
+import { reopenVisit, undoCloseVisit } from "@/data/staffActions";
 import { CLOSED_PAGE_SIZE, closedLabel, recentlyClosed } from "@/lib/recentlyClosed";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -15,9 +16,11 @@ type Props = {
   site: Site;
   /** Called after an Undo, with words for screen readers; `undone` is true when it worked. */
   onUndoResult: (message: string, undone: boolean) => void;
+  /** Called after a working Reopen, so the page can open the visit in the check-in form. */
+  onReopened: (visit: Visit) => void;
 };
 
-export function RecentlyClosed({ visits, site, onUndoResult }: Props) {
+export function RecentlyClosed({ visits, site, onUndoResult, onReopened }: Props) {
   // A failure note stays beside its own row, and the row (with its Undo button) stays too.
   const [notes, setNotes] = useState<Record<string, string>>({});
   const [savingId, setSavingId] = useState<string | null>(null);
@@ -44,15 +47,22 @@ export function RecentlyClosed({ visits, site, onUndoResult }: Props) {
   const undo = async (visit: Visit) => {
     if (savingId) return; // one Undo at a time, so a double press cannot send it twice
     setSavingId(visit.id);
-    const result = await undoCloseVisit(visit.id, visit);
+    const reopening = visit.status === "unable_to_reach";
+    const result = reopening ? await reopenVisit(visit.id) : await undoCloseVisit(visit.id, visit);
     setSavingId(null);
+    const verb = reopening ? "reopened" : "undone";
     const note =
       result === "saved"
         ? ""
         : result === "not_saved"
-          ? `Not saved: the database could not be reached, so visit ${visit.code} was not undone. Try again.`
-          : `Could not undo visit ${visit.code}: it changed since it was closed.`;
+          ? `Not saved: the database could not be reached, so visit ${visit.code} was not ${verb}. Try again.`
+          : `Could not ${reopening ? "reopen" : "undo"} visit ${visit.code}: it changed since it was closed.`;
     setNotes({ ...notes, [visit.id]: note });
+    if (result === "saved" && reopening) {
+      onUndoResult(`Reopened: visit ${visit.code} needs reassessment. Triage the patient again below.`, true);
+      onReopened(visit);
+      return;
+    }
     onUndoResult(result === "saved" ? `Undone: visit ${visit.code} is back on the list.` : note, result === "saved");
   };
 
@@ -61,7 +71,9 @@ export function RecentlyClosed({ visits, site, onUndoResult }: Props) {
       <h3 id="closed-heading" className="text-lg font-bold">
         Recently closed
       </h3>
-      <p className="text-sm text-slate-700">Pressed by mistake? Undo puts the patient back where they were.</p>
+      <p className="text-sm text-slate-700">
+        Pressed by mistake? Undo puts the patient back where they were. Reopen sends a patient who could not be reached back to triage.
+      </p>
       <ul ref={listRef} className="space-y-2">
         {closed.map((visit) => (
           <li key={visit.id} tabIndex={-1} className="rounded-lg border-2 border-slate-300 bg-white p-3" data-testid={`closed-${visit.code}`}>
@@ -70,7 +82,8 @@ export function RecentlyClosed({ visits, site, onUndoResult }: Props) {
                 <span className="font-mono font-bold tracking-widest">{visit.code}</span> {closedLabel(visit)}
               </p>
               <Button variant="secondary" aria-disabled={savingId !== null} onClick={() => undo(visit)}>
-                {savingId === visit.id ? "Saving…" : "Undo"}<span className="sr-only"> for visit {visit.code}</span>
+                {savingId === visit.id ? "Saving…" : visit.status === "unable_to_reach" ? "Reopen" : "Undo"}
+                <span className="sr-only"> for visit {visit.code}</span>
               </Button>
             </div>
             {notes[visit.id] && <p className="mt-2 font-semibold text-red-800">{notes[visit.id]}</p>}
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index b88810f..80e2d3d 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -1,6 +1,7 @@
 "use client";
 
 // One patient in the staff's off-site list: minutes waited, call-back progress and actions.
+// The no-response flags and phone-call buttons are in FollowUpPanel.
 
 import { useState } from "react";
 import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
@@ -9,6 +10,7 @@ import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
 import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
+import { FollowUpPanel } from "./FollowUpPanel";
 
 type Props = {
   visit: Visit;
@@ -70,6 +72,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
           Missed &ldquo;I&apos;m still here&rdquo;: no tap within {STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.
         </p>
       )}
+      <FollowUpPanel visit={visit} now={now} saving={saving} act={act} />
       <div className="mt-3 flex flex-wrap gap-2">
         {visit.status === "waiting" && (
           <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
diff --git a/data/staffActions.ts b/data/staffActions.ts
index 9b6bc26..1022a05 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -10,8 +10,11 @@ import {
   callBack,
   checkInAtDesk,
   checkInHomeVisit,
+  confirmUnableToReach,
   markArrived,
   markRemoved,
+  recordPhoneCall,
+  reopenUnableToReach,
   undoClose,
   type Closure,
   type DeskOutcome,
@@ -79,7 +82,7 @@ export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome):
   return null;
 }
 
-/** Check in, after triage, a visit the patient started from home. */
+/** Check in, after triage, a visit that already exists (started from home, or back for reassessment). */
 export const checkInVisitFromHome = (id: string, form: CheckInForm, outcome: DeskOutcome) =>
   changeVisit(id, (v) => (v.site === form.site ? checkInHomeVisit(v, form, outcome, new Date()) : null));
 
@@ -107,6 +110,13 @@ export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v,
 export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, new Date()));
 export const removeVisit = (id: string, reason: "left" | "no_show") =>
   changeVisit(id, (v) => markRemoved(v, reason, new Date()));
+/** Record one simulated phone call ("Phoned, answered" or "Phoned, no answer"). */
+export const recordPhoneCallFor = (id: string, result: "answered" | "no_answer") =>
+  changeVisit(id, (v) => recordPhoneCall(v, result, new Date()));
+/** A nurse confirms "Review: unable to reach"; the visit leaves the active line. */
+export const confirmUnableToReachFor = (id: string) => changeVisit(id, (v) => confirmUnableToReach(v, new Date()));
+/** Reopen an "unable to reach" visit; it goes back to triage (needs reassessment). */
+export const reopenVisit = (id: string) => changeVisit(id, (v) => reopenUnableToReach(v));
 /** Undo one closure; `closure` is the closure the Undo button belongs to. */
 export const undoCloseVisit = (id: string, closure: Closure) => changeVisit(id, (v) => undoClose(v, closure));
 
diff --git a/lib/demoTimes.ts b/lib/demoTimes.ts
index 35de167..eeb6587 100644
--- a/lib/demoTimes.ts
+++ b/lib/demoTimes.ts
@@ -6,3 +6,20 @@ export const STILL_HERE_EVERY_MINUTES = 30;
 
 /** How long the patient has to tap before staff see a flag. */
 export const STILL_HERE_ANSWER_WITHIN_MINUTES = 10;
+
+// No-response steps after "Call back" (SPEC /staff). Minutes are counted from called_at.
+
+/** Second alert on the patient's phone; staff see "Phone this patient". */
+export const CALL_SECOND_ALERT_MINUTES = 10;
+
+/** Staff see "Phone a second time"; the patient's phone shows "Please return now". */
+export const CALL_PHONE_AGAIN_MINUTES = 20;
+
+/** With no answered call, staff see "Review: unable to reach" (a nurse must confirm). */
+export const CALL_REVIEW_MINUTES = 30;
+
+/** After "Phoned, answered", the staff flags wait this long before the steps continue. */
+export const ANSWERED_PAUSE_MINUTES = 10;
+
+/** After "I'm on my way", staff see "On the way, not arrived" once this much time has passed. */
+export const ON_WAY_NOT_ARRIVED_MINUTES = 30;
diff --git a/lib/expectedArrivals.ts b/lib/expectedArrivals.ts
index af4ad71..a70a665 100644
--- a/lib/expectedArrivals.ts
+++ b/lib/expectedArrivals.ts
@@ -18,3 +18,14 @@ export function expectedArrivals(visits: Visit[], site: Site, now: Date): Visit[
     .filter((v) => v.site === site && isExpected(v, now))
     .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
 }
+
+/**
+ * Reopened visits at one site that wait for a nurse to triage them again ("unable to reach",
+ * then the patient came back). They are not in the waiting line and never expire, so they stay
+ * listed until triaged. Oldest first triage first.
+ */
+export function backForReassessment(visits: Visit[], site: Site): Visit[] {
+  return visits
+    .filter((v) => v.site === site && v.status === "needs_reassessment")
+    .sort((a, b) => ((a.triaged_at ?? "") < (b.triaged_at ?? "") ? -1 : (a.triaged_at ?? "") > (b.triaged_at ?? "") ? 1 : 0));
+}
diff --git a/lib/followUp.test.ts b/lib/followUp.test.ts
new file mode 100644
index 0000000..c05e4fd
--- /dev/null
+++ b/lib/followUp.test.ts
@@ -0,0 +1,145 @@
+// Checks the no-response steps after "Call back": staff flags, patient messages, phone calls,
+// confirming "unable to reach", and reopening.
+
+import { describe, expect, it } from "vitest";
+import { patientCallStep, staffFollowUp } from "./followUp";
+import {
+  callBack,
+  checkInAtDesk,
+  checkInHomeVisit,
+  confirmOnMyWay,
+  confirmUnableToReach,
+  recordPhoneCall,
+  reopenUnableToReach,
+} from "./visitActions";
+import type { Visit } from "./visit";
+
+const t0 = new Date("2026-11-11T20:00:00Z");
+const at = (min: number) => new Date(t0.getTime() + min * 60_000);
+const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
+
+/** A visit called back at t0. */
+const called = (): Visit => callBack(checkInAtDesk(input, "waiting", at(-60)), t0)!;
+const kind = (visit: Visit, min: number) => staffFollowUp(visit, at(min)).kind;
+/** Apply a phone call, failing the test if the step was refused. */
+const phoned = (visit: Visit, result: "answered" | "no_answer", min: number): Visit => {
+  const after = recordPhoneCall(visit, result, at(min));
+  if (!after) throw new Error("phone call refused");
+  return after;
+};
+
+describe("staff flags with no answer", () => {
+  it("follows 10, 20 and 30 minutes after the call-back", () => {
+    const v = called();
+    expect(kind(v, 9)).toBe("none");
+    expect(kind(v, 10)).toBe("phone");
+    expect(kind(v, 20)).toBe("phone_again");
+    expect(kind(v, 30)).toBe("review");
+  });
+
+  it("clears each phone flag once that many calls are recorded", () => {
+    const once = phoned(called(), "no_answer", 11);
+    expect(kind(once, 12)).toBe("none");
+    expect(kind(once, 20)).toBe("phone_again");
+    const twice = phoned(once, "no_answer", 21);
+    expect(kind(twice, 22)).toBe("none");
+    expect(kind(twice, 30)).toBe("review");
+  });
+
+  it("shows nothing for a visit that is not called", () => {
+    const waiting = checkInAtDesk(input, "waiting", t0);
+    expect(kind(waiting, 60)).toBe("none");
+  });
+});
+
+describe("an answered call", () => {
+  it("pauses the flags, then continues from the call-back time without restarting", () => {
+    const v = phoned(called(), "answered", 12);
+    expect(staffFollowUp(v, at(15))).toEqual({ kind: "paused", until: at(22).toISOString() });
+    expect(kind(v, 22)).toBe("phone_again");
+  });
+
+  it("is never flagged unable to reach, even after a later unanswered call", () => {
+    const answered = phoned(called(), "answered", 12);
+    expect(kind(answered, 31)).toBe("contacted_not_arrived");
+    const thenNoAnswer = phoned(answered, "no_answer", 25);
+    expect(thenNoAnswer.last_phone_result).toBe("no_answer");
+    expect(kind(thenNoAnswer, 40)).toBe("contacted_not_arrived");
+  });
+
+  it("answered inside the review step: paused, then contacted, not unable to reach", () => {
+    const v = phoned(called(), "answered", 32);
+    expect(kind(v, 35)).toBe("paused");
+    expect(kind(v, 42)).toBe("contacted_not_arrived");
+  });
+});
+
+describe("recordPhoneCall", () => {
+  it("counts attempts and keeps the latest result", () => {
+    const v = phoned(phoned(called(), "no_answer", 10), "no_answer", 21);
+    expect(v.phone_attempts).toBe(2);
+    expect(v.last_phone_result).toBe("no_answer");
+    expect(v.followup_paused_until).toBeNull();
+  });
+
+  it("is refused before the phone step and when the patient is not called", () => {
+    expect(recordPhoneCall(called(), "answered", at(9))).toBeNull();
+    const onTheWay = confirmOnMyWay(called(), at(5))!;
+    expect(recordPhoneCall(onTheWay, "answered", at(15))).toBeNull();
+  });
+});
+
+describe("on the way, not arrived", () => {
+  it("is flagged 30 minutes after the patient confirmed", () => {
+    const v = confirmOnMyWay(called(), at(5))!;
+    expect(kind(v, 34)).toBe("none");
+    expect(kind(v, 35)).toBe("on_way_not_arrived");
+  });
+});
+
+describe("confirm unable to reach and reopen", () => {
+  it("is allowed only while the review flag shows, and closes the visit", () => {
+    expect(confirmUnableToReach(called(), at(29))).toBeNull();
+    const v = confirmUnableToReach(called(), at(30))!;
+    expect(v.status).toBe("unable_to_reach");
+    expect(v.closed_at).toBe(at(30).toISOString());
+    expect(v.removed_reason).toBeNull();
+  });
+
+  it("is refused for a visit with an answered call", () => {
+    expect(confirmUnableToReach(phoned(called(), "answered", 12), at(40))).toBeNull();
+  });
+
+  it("reopening clears closed_at and sends the visit back to triage", () => {
+    const closed = confirmUnableToReach(called(), at(30))!;
+    const reopened = reopenUnableToReach(closed)!;
+    expect(reopened.status).toBe("needs_reassessment");
+    expect(reopened.closed_at).toBeNull();
+    expect(reopenUnableToReach(called())).toBeNull();
+  });
+
+  it("triage again starts a fresh wait with no call-back or phone history", () => {
+    const answeredThenLost = { ...phoned(called(), "no_answer", 11), status: "unable_to_reach" as const };
+    const reopened = reopenUnableToReach(answeredThenLost)!;
+    const again = checkInHomeVisit(reopened, { ctas_level: 5, language: "fr" }, "waiting", at(90))!;
+    expect(again.status).toBe("waiting");
+    expect(again.triaged_at).toBe(at(90).toISOString());
+    expect(again.called_at).toBeNull();
+    expect(again.phone_attempts).toBe(0);
+    expect(again.last_phone_result).toBeNull();
+    expect(again.followup_paused_until).toBeNull();
+  });
+});
+
+describe("patientCallStep", () => {
+  it("adds the second alert at 10 minutes and 'Please return now' at 20", () => {
+    const calledAt = t0.toISOString();
+    expect(patientCallStep("called", calledAt, at(9))).toBe("first");
+    expect(patientCallStep("called", calledAt, at(10))).toBe("second_alert");
+    expect(patientCallStep("called", calledAt, at(20))).toBe("return_now");
+  });
+
+  it("stops once the patient confirms", () => {
+    expect(patientCallStep("on_the_way", t0.toISOString(), at(25))).toBe("first");
+  });
+});
diff --git a/lib/followUp.ts b/lib/followUp.ts
new file mode 100644
index 0000000..abdf4d0
--- /dev/null
+++ b/lib/followUp.ts
@@ -0,0 +1,89 @@
+// The no-response steps after "Call back" (SPEC /staff): which flag staff see, and which
+// message the patient's called screen shows. Minutes always count from called_at; an answered
+// phone call pauses the staff flags, then they continue from that same clock (no restart).
+// All times are demo settings in lib/demoTimes.ts, not clinical deadlines.
+
+import {
+  CALL_PHONE_AGAIN_MINUTES,
+  CALL_REVIEW_MINUTES,
+  CALL_SECOND_ALERT_MINUTES,
+  ON_WAY_NOT_ARRIVED_MINUTES,
+} from "./demoTimes";
+import type { Visit, VisitStatus } from "./visit";
+
+/** What the staff row shows for a called-back visit. */
+export type StaffFollowUp =
+  | { kind: "none" }
+  /** "Phoned, answered" was recorded; flags wait until `until`. */
+  | { kind: "paused"; until: string }
+  /** "Phone this patient." */
+  | { kind: "phone" }
+  /** "Phone a second time." */
+  | { kind: "phone_again" }
+  /** "Review: unable to reach." A nurse must confirm before the visit leaves the line. */
+  | { kind: "review" }
+  /** A call was answered but the patient has still not confirmed or arrived. Never "unable to reach". */
+  | { kind: "contacted_not_arrived" }
+  /** Tapped "I'm on my way" a while ago and not marked arrived. Never removed automatically. */
+  | { kind: "on_way_not_arrived" };
+
+type FollowUpFields = Pick<
+  Visit,
+  "status" | "called_at" | "confirmed_at" | "phone_attempts" | "last_phone_result" | "followup_paused_until"
+>;
+
+const MINUTE_MS = 60_000;
+
+const minutesSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / MINUTE_MS;
+
+/**
+ * True if any call since this call-back was answered. last_phone_result holds only the latest
+ * result, but followup_paused_until is set only by an answered call (and cleared at triage),
+ * so a later "no answer" never turns an answered visit into "unable to reach".
+ */
+export function wasAnswered(visit: Pick<Visit, "last_phone_result" | "followup_paused_until">): boolean {
+  return visit.last_phone_result === "answered" || visit.followup_paused_until !== null;
+}
+
+export function staffFollowUp(visit: FollowUpFields, now: Date): StaffFollowUp {
+  if (visit.status === "on_the_way") {
+    const late = visit.confirmed_at !== null && minutesSince(visit.confirmed_at, now) >= ON_WAY_NOT_ARRIVED_MINUTES;
+    return late ? { kind: "on_way_not_arrived" } : { kind: "none" };
+  }
+  if (visit.status !== "called" || !visit.called_at) return { kind: "none" };
+  const pausedUntil = visit.followup_paused_until;
+  if (pausedUntil && now.getTime() < new Date(pausedUntil).getTime()) return { kind: "paused", until: pausedUntil };
+
+  const minutes = minutesSince(visit.called_at, now);
+  if (minutes >= CALL_REVIEW_MINUTES) {
+    return wasAnswered(visit) ? { kind: "contacted_not_arrived" } : { kind: "review" };
+  }
+  // Each phone flag clears once staff record that many calls (answered or not).
+  if (minutes >= CALL_PHONE_AGAIN_MINUTES) return visit.phone_attempts >= 2 ? { kind: "none" } : { kind: "phone_again" };
+  if (minutes >= CALL_SECOND_ALERT_MINUTES) return visit.phone_attempts >= 1 ? { kind: "none" } : { kind: "phone" };
+  return { kind: "none" };
+}
+
+/** Staff can record a simulated phone call from the "Phone this patient" step onwards, while called. */
+export function canRecordPhoneCall(visit: Pick<Visit, "status" | "called_at">, now: Date): boolean {
+  return (
+    visit.status === "called" &&
+    visit.called_at !== null &&
+    minutesSince(visit.called_at, now) >= CALL_SECOND_ALERT_MINUTES
+  );
+}
+
+/** What the patient's called screen adds: nothing yet, the second alert, or "Please return now". */
+export type PatientCallStep = "first" | "second_alert" | "return_now";
+
+/**
+ * Only while called and not yet confirmed. The patient's messages follow the clock alone;
+ * an answered phone call pauses only the staff flags (the patient view never sees it).
+ */
+export function patientCallStep(status: VisitStatus, calledAt: string | null, now: Date): PatientCallStep {
+  if (status !== "called" || !calledAt) return "first";
+  const minutes = minutesSince(calledAt, now);
+  if (minutes >= CALL_PHONE_AGAIN_MINUTES) return "return_now";
+  if (minutes >= CALL_SECOND_ALERT_MINUTES) return "second_alert";
+  return "first";
+}
diff --git a/lib/homeCheckIn.test.ts b/lib/homeCheckIn.test.ts
index af280b8..19e46e1 100644
--- a/lib/homeCheckIn.test.ts
+++ b/lib/homeCheckIn.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from "vitest";
+import { backForReassessment } from "./expectedArrivals";
 import { homeCheckInProblem } from "./homeCheckIn";
-import { checkInHomeVisit, startFromHome } from "./visitActions";
+import { callBack, checkInHomeVisit, confirmUnableToReach, reopenUnableToReach, startFromHome } from "./visitActions";
 
 const t0 = new Date("2026-11-09T20:00:00Z");
 const at = (min: number) => new Date(t0.getTime() + min * 60_000);
@@ -25,4 +26,20 @@ describe("home check-in problems", () => {
   it("says when it is gone", () => {
     expect(homeCheckInProblem(home, null, at(10))).toContain("no longer on this screen");
   });
+
+  it("has none for a reopened visit back for reassessment, however old", () => {
+    const waiting = checkInHomeVisit(home, { ctas_level: 4, language: "en" }, "waiting", at(5))!;
+    const lost = confirmUnableToReach(callBack(waiting, at(10))!, at(40))!;
+    const reopened = reopenUnableToReach(lost)!;
+    expect(homeCheckInProblem(lost, reopened, at(60 * 8))).toBeNull();
+  });
+
+  it("lists a reopened visit under Back for reassessment until it is triaged again", () => {
+    const waiting = checkInHomeVisit(home, { ctas_level: 4, language: "en" }, "waiting", at(5))!;
+    const reopened = reopenUnableToReach(confirmUnableToReach(callBack(waiting, at(10))!, at(40))!)!;
+    expect(backForReassessment([reopened, waiting], "A").map((v) => v.id)).toEqual(["h"]);
+    expect(backForReassessment([reopened], "B")).toEqual([]);
+    const again = checkInHomeVisit(reopened, { ctas_level: 4, language: "en" }, "waiting", at(60))!;
+    expect(backForReassessment([again], "A")).toEqual([]);
+  });
 });
diff --git a/lib/homeCheckIn.ts b/lib/homeCheckIn.ts
index 983f7c7..3217f49 100644
--- a/lib/homeCheckIn.ts
+++ b/lib/homeCheckIn.ts
@@ -1,4 +1,4 @@
-// While staff have a home visit open in the check-in form, it can change on another screen
+// While staff have a home visit (or a reopened visit back for reassessment) open in the check-in form, it can change on another screen
 // (checked in elsewhere) or expire. This says what changed, so staff never save twice.
 
 import { isExpected } from "./expectedArrivals";
@@ -24,6 +24,8 @@ export const STAFF_STATUS_LABEL: Record<VisitStatus, string> = {
  */
 export function homeCheckInProblem(chosen: Visit, live: Visit | null, now: Date): string | null {
   if (!live) return `Visit ${chosen.code} is no longer on this screen. No check-in was saved.`;
+  // A reopened visit back for reassessment can be triaged again (no 6-hour limit).
+  if (live.status === "needs_reassessment") return null;
   if (live.status !== "pre_arrival" || live.triaged_at) {
     return `Visit ${chosen.code} was already processed on another screen. Current status: ${STAFF_STATUS_LABEL[live.status]}. No additional check-in was saved.`;
   }
diff --git a/lib/recentlyClosed.test.ts b/lib/recentlyClosed.test.ts
index cd14e0c..92bcf17 100644
--- a/lib/recentlyClosed.test.ts
+++ b/lib/recentlyClosed.test.ts
@@ -1,6 +1,6 @@
 import { describe, expect, it } from "vitest";
 import { closedLabel, recentlyClosed } from "./recentlyClosed";
-import { checkInAtDesk, markArrived, markRemoved } from "./visitActions";
+import { callBack, checkInAtDesk, confirmUnableToReach, markArrived, markRemoved } from "./visitActions";
 
 const t0 = new Date("2026-11-09T20:00:00Z");
 const at = (min: number) => new Date(t0.getTime() + min * 60_000);
@@ -25,4 +25,10 @@ describe("recently closed list", () => {
     expect(closedLabel(markRemoved(desk("a"), "left", at(1))!)).toBe("removed: left");
     expect(closedLabel(markRemoved(desk("a"), "no_show", at(1))!)).toBe("removed: no-show");
   });
+
+  it("lists a visit confirmed unable to reach, so staff can reopen it", () => {
+    const lost = confirmUnableToReach(callBack(desk("g"), at(1))!, at(31))!;
+    expect(recentlyClosed([lost], "A").map((v) => v.id)).toEqual(["g"]);
+    expect(closedLabel(lost)).toBe("confirmed unable to reach");
+  });
 });
diff --git a/lib/recentlyClosed.ts b/lib/recentlyClosed.ts
index 451e1f0..3a89572 100644
--- a/lib/recentlyClosed.ts
+++ b/lib/recentlyClosed.ts
@@ -1,5 +1,6 @@
 // Which visits the staff "Recently closed" list shows, so staff can undo a mistaken
-// Mark arrived, Left or No-show without any time limit. The newest few show first;
+// Mark arrived, Left or No-show without any time limit, or reopen a visit confirmed
+// "unable to reach" when the patient comes back. The newest few show first;
 // older ones stay reachable with "Show older closures".
 
 import type { Site, Visit } from "./visit";
@@ -7,7 +8,7 @@ import type { Site, Visit } from "./visit";
 /** How many closures the list shows at first, and how many more each "Show older" press adds. */
 export const CLOSED_PAGE_SIZE = 5;
 
-/** Every visit at one site that left the off-site line by Mark arrived, Left or No-show, newest first. */
+/** Every visit at one site that left the off-site line by Mark arrived, Left, No-show or unable to reach, newest first. */
 export function recentlyClosed(visits: Visit[], site: Site): Visit[] {
   return visits
     .filter(
@@ -15,7 +16,7 @@ export function recentlyClosed(visits: Visit[], site: Site): Visit[] {
         v.site === site &&
         v.triaged_at !== null &&
         v.closed_at !== null &&
-        (v.status === "arrived" || v.status === "removed"),
+        (v.status === "arrived" || v.status === "removed" || v.status === "unable_to_reach"),
     )
     .sort((a, b) => (a.closed_at! < b.closed_at! ? 1 : a.closed_at! > b.closed_at! ? -1 : 0));
 }
@@ -23,5 +24,6 @@ export function recentlyClosed(visits: Visit[], site: Site): Visit[] {
 /** Plain words for how a visit was closed, for the list and screen readers. */
 export function closedLabel(visit: Visit): string {
   if (visit.status === "arrived") return "marked arrived";
+  if (visit.status === "unable_to_reach") return "confirmed unable to reach";
   return visit.removed_reason === "no_show" ? "removed: no-show" : "removed: left";
 }
diff --git a/lib/visitActions.ts b/lib/visitActions.ts
index 7dd327e..a35b2fa 100644
--- a/lib/visitActions.ts
+++ b/lib/visitActions.ts
@@ -2,7 +2,9 @@
 // and returns the updated visit, or null when the step is not allowed right now
 // (for example a second click after the list already changed).
 
+import { ANSWERED_PAUSE_MINUTES } from "./demoTimes";
 import { isExpected } from "./expectedArrivals";
+import { canRecordPhoneCall, staffFollowUp } from "./followUp";
 import { type Site, type Visit, type VisitStatus } from "./visit";
 
 export type DeskCheckIn = {
@@ -57,7 +59,17 @@ function blankVisit(input: NewVisit, source: "home" | "desk", nowIso: string): V
  * - not_eligible: not offered; waits on-site as usual.
  */
 function applyTriage(visit: Visit, ctas: 4 | 5, language: string, outcome: DeskOutcome, nowIso: string): Visit {
-  const triaged = { ...visit, ctas_level: ctas, language, triaged_at: nowIso };
+  // A visit back for reassessment starts a fresh wait: no call-back or phone calls carry over.
+  const fresh = {
+    called_at: null,
+    seen_at: null,
+    confirmed_at: null,
+    review_flagged_at: null,
+    phone_attempts: 0,
+    last_phone_result: null,
+    followup_paused_until: null,
+  };
+  const triaged = { ...visit, ...fresh, ctas_level: ctas, language, triaged_at: nowIso };
   if (outcome === "not_eligible") return { ...triaged, status: "not_eligible", closed_at: nowIso };
   const offered = { ...triaged, offered_at: nowIso };
   if (outcome === "declined") return { ...offered, status: "declined", closed_at: nowIso };
@@ -79,15 +91,23 @@ export function startFromHome(input: NewVisit, now: Date): Visit {
   return blankVisit(input, "home", now.toISOString());
 }
 
-/** A nurse checks in, after triage, a visit the patient started from home. Only before triage. */
+/** True if a nurse can triage this existing visit now (from home, or back for reassessment). */
+export function canTriageAgain(visit: Visit, now: Date): boolean {
+  return isExpected(visit, now) || visit.status === "needs_reassessment";
+}
+
+/**
+ * A nurse checks in, after triage, a visit that already exists: one the patient started from
+ * home (only while still expected: not triaged yet, under 6 hours old), or a reopened visit
+ * back for reassessment (its place in line starts again at this triage, SPEC rule 7).
+ */
 export function checkInHomeVisit(
   visit: Visit,
   triage: { ctas_level: 4 | 5; language: string },
   outcome: DeskOutcome,
   now: Date,
 ): Visit | null {
-  // Only while still expected: not triaged yet, and under 6 hours old.
-  if (!isExpected(visit, now)) return null;
+  if (!canTriageAgain(visit, now)) return null;
   return applyTriage(visit, triage.ctas_level, triage.language, outcome, now.toISOString());
 }
 
@@ -115,6 +135,33 @@ export function confirmOnMyWay(visit: Visit, now: Date): Visit | null {
   return { ...visit, status: "on_the_way", confirmed_at: now.toISOString() };
 }
 
+/**
+ * Staff record one simulated phone call (the demo stores no phone numbers). Only while called,
+ * from the "Phone this patient" step on. "Answered" pauses the staff flags for a set time.
+ */
+export function recordPhoneCall(visit: Visit, result: "answered" | "no_answer", now: Date): Visit | null {
+  if (!canRecordPhoneCall(visit, now)) return null;
+  const changed = { ...visit, phone_attempts: visit.phone_attempts + 1, last_phone_result: result };
+  if (result === "no_answer") return changed;
+  const until = new Date(now.getTime() + ANSWERED_PAUSE_MINUTES * 60_000).toISOString();
+  return { ...changed, followup_paused_until: until };
+}
+
+/**
+ * A nurse confirms "Review: unable to reach". Only while that flag shows. The visit leaves the
+ * active line; this is not recorded as left without being seen (SPEC).
+ */
+export function confirmUnableToReach(visit: Visit, now: Date): Visit | null {
+  if (staffFollowUp(visit, now).kind !== "review") return null;
+  return { ...visit, status: "unable_to_reach", closed_at: now.toISOString() };
+}
+
+/** The patient came back after "unable to reach": reopen, and send the visit back to triage. */
+export function reopenUnableToReach(visit: Visit): Visit | null {
+  if (visit.status !== "unable_to_reach") return null;
+  return { ...visit, status: "needs_reassessment", closed_at: null };
+}
+
 /** Staff mark the patient as back at the hospital. Ends virtual waiting. */
 export function markArrived(visit: Visit, now: Date): Visit | null {
   if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
```

## Response

Gemini 3.1 Pro, High, new chat, 2026-11-11 (pasted by the owner).

1. **`lib/followUp.ts` (staffFollowUp function):** If staff completely miss the 10-minute flag and record 0 calls, at 20 minutes the logic jumps straight to `{ kind: "phone_again" }`. Staff will see "Phone a second time" even though they never phoned a first time. **Fix:** Check `visit.phone_attempts === 0` to return the first `"phone"` flag instead, or generalize the 20-minute wording to urge a call regardless of history.
2. **`lib/followUp.ts` (`canRecordPhoneCall`) & `components/staff/FollowUpPanel.tsx`:** The `canRecordPhoneCall` function only checks if 10 minutes have passed; it does not check if the flag is currently paused. The phone buttons remain fully visible and clickable during a pause, allowing staff to repeatedly click "Phoned, answered" and endlessly push the pause deadline further into the future. **Fix:** Update `canRecordPhoneCall` to return `false` if `visit.followup_paused_until` is in the future.
3. **`lib/visitActions.ts` (Undo interactions):** If staff mark a "called" visit as "arrived", and then click Undo 35 minutes later, the visit reverts to `called`. Because the original `called_at` timestamp is restored, the 30-minute clock is instantly exceeded. The staff screen immediately flags "Review: unable to reach" and the patient screen instantly blares "Please return now". **Fix:** Acceptable for a demo, but realistically `undoClose` should shift `called_at` forward by the duration the visit was closed.

**2. Paths bypassing rules**

* Nothing found. `confirmUnableToReach` strictly requires `staffFollowUp(visit, now).kind === "review"`, which ensures an answered call (which returns `"contacted_not_arrived"`) can never be confirmed unable to reach. The visit only leaves the line upon manual staff confirmation.

**3. Staff screen wording or accessibility**

* Nothing found that isn't already covered in Claude's known points (#6 and #10). The disclosure `<details>` element and `aria-disabled` loading states are accessible and correctly implemented.

**4. Patient screen reminder**

* **`components/patient/CallReminder.tsx`:** The component uses `useNow()`, which relies on the patient device's local clock. If the patient's phone clock is set 10 minutes fast, the "Please return now" alert and the assertive screen-reader announcement will fire prematurely, confusing the patient. **Fix:** Calculate a server-time offset when the visit is fetched, and apply that offset inside `useNow()`.
*(Note: `CallReminder` correctly unmounts when the patient taps "I'm on my way", and React's `useEffect` cleanup perfectly handles screen-reader announcement changes).*

**5. Breaks to existing behaviour**

* **`lib/visitActions.ts` (applyTriage function):** The `fresh` object created to wipe history for reopened visits clears `called_at` and phone history, but misses `last_still_here_at`. When a reopened patient rejoins the waiting line, their tap timestamp from their *previous* wait remains in the database. The staff screen will instantly (and falsely) flag them for missing the "I'm still here" prompt. **Fix:** Add `last_still_here_at: null` to the `fresh` object.

### Points Claude already knows about

1. **Laptop clock for pause end:** Real problem. A fast laptop clock creates a pause that instantly expires, or a slow one pauses forever. **Fix:** Have the Postgres database trigger set `followup_paused_until` using `now() + interval '10 minutes'`.
2. **Answered-call pause missing on patient view:** Real problem. Shouting "Please return now" at a patient who just spoke to a nurse creates immediate confusion. **Fix:** Update `patientCallStep` to check `wasAnswered(visit)` and suppress the `return_now` escalation if true.
3. **`wasAnswered` relies on triage clearing fields:** Acceptable. Triage safely clears the fields, and `last_phone_result` retains the latest state. **Fix:** Leave as is.
4. **`review_flagged_at` never filled:** Acceptable, it's just a dead column. **Fix:** Drop the column from the database.
5. **Phone flags clear by number of calls, not timing:** Acceptable for a demo. It prevents locking staff out if they click the button twice by mistake. **Fix:** Leave as is.
6. **Flags not announced to staff SR users:** Real problem. Staff using screen readers will miss the critical 10/20/30-minute escalations as they appear. **Fix:** Add `aria-live="polite"` to the flag container in `FollowUpPanel`.
7. **Triage again wipes first call-back stats:** Acceptable. A reopened visit is practically a brand-new wait, and keeping multi-hour interrupted wait times would skew dashboard averages. **Fix:** Leave as is.
8. **30 minutes passed judged by laptop clock:** Real problem (same root as #1 and #4 above). Fast/slow laptops will cause premature or delayed removals. **Fix:** Apply a server-synced time offset to the client clock.
9. **Database doesn't check allowed steps:** Acceptable for Phase 3, since the UI and `visitActions.ts` guards prevent accidental clicks. **Fix:** Add state-machine guards via Postgres triggers in Phase 4.
10. **Wording: "Call back" vs phone buttons:** Real problem. Staff will absolutely mix up "Call back" with the simulated phone calls. **Fix:** Rename "Call back" to "Page to desk" or "Recall patient".

## Claude's check (2026-11-11)

New findings:
- 1 (20-minute flag when nobody phoned): **accepted, fixed** (`0860b96`). With no call recorded, the 20-minute flag now ends "Phone the patient now." instead of "again"; the owner's wording is kept otherwise.
- 2 (phone buttons stay during a pause): **not accepted.** Each press stands for a real call; a second answered call is a new contact and rightly restarts the pause. Hiding the buttons would stop staff recording a call they really made during the pause. The save helper already ignores a second press while one is saving.
- 3 (Undo after a long time brings back old called_at): **not accepted.** The patient really was called that long ago and is not here, so the Review flag and "Please return now" are true, not a fault. Moving called_at would hide how long the patient has been called.
- 4 (patient phone clock): **known, accepted limit**, same as for "I'm still here" (owner, 2026-11-11). A server-time offset would fix this and point 8 together; listed as a decision for the owner.
- 5 (old "I'm still here" tap after reopening): **not accepted, the claim is wrong.** `lib/stillHere.ts` starts the clock at the later of triage and the last tap, so a tap from before the new triage is ignored; `lastTapThisWait` hides it on the staff row (fixed in the earlier review).

Known points:
- 1 and 8 (laptop clock): agree they are real. The fix needs a database change the owner runs; decision for the owner (see below).
- 2 (patient "Please return now" after an answered call): a choice, not a fault: a nurse who spoke to the patient would also ask them to come back, and the message does not say nobody called. Needs a database change (the patient function would have to say a call was answered). Decision for the owner.
- 3, 5, 7, 9: agree, left as they are.
- 4: agree it is unused. Dropping it changes SPEC's data list; decide at the Phase 4 dashboard work, when it is clear nothing needs it.
- 6: **accepted, fixed** (`0860b96`): each row has a polite status region that reads the new flag once, with the visit code, without the minute counts (so it is not read again every minute). The region stays in place so it is not re-created when a flag appears.
- 10: owner decided on 2026-11-11 to keep "Phoned, answered / no answer" for now; renaming "Call back" is the owner's call.

Checks after the fixes: 137 tests, type check and lint pass.
