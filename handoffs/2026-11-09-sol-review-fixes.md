# Virtual Waiting Room: fixes after the Phase 1 core-loop review, for a second review

Next.js 16 App Router + TypeScript + Tailwind. Phase 1 has no server: visits live in the browser's localStorage and tabs sync through the `storage` event. Demo data only; this file contains no keys, tokens, passwords or patient data.

## What the first review found, and what was done

| # | Finding | Action |
|---|---------|--------|
| 1 | Patient isolation only cosmetic (all visits in localStorage) | Not changed: SPEC Phase 1 is deliberately in-browser; row-level security and a patient-only database function come in Phase 2 |
| 2 | Failed saves reported success | Fixed: store returns `"saved" \| "refused" \| "not_saved"`; screens show an error on `not_saved` |
| 3 | Two tabs can overwrite each other (read-modify-write) | Not changed for Phase 1; Phase 2 will use database-side conditional updates |
| 4 | Background tab sets seen_at | Fixed: recorded only while `document.visibilityState === "visible"`. Label "Seen" kept because SPEC names it |
| 5 | Corrupted storage crashes screens | Fixed: `lib/parseVisits.ts` checks the array and each entry's shape |
| 6 | Malformed `#t=` link crashes; hash change ignored | Fixed: safe decode, token shape check, `hashchange` listener |
| 7 | pre_arrival / needs_reassessment / declined shown as "ended" | Fixed: own heading and text per status (placeholder wording) |
| 8 | No confirm/undo on Mark arrived / Left / No-show | Fixed by owner's choice: 10-second Undo banner (`undoClose` in lib/visitActions.ts restores the earlier status and clears closed_at, arrived_at, removed_reason; the rule allows 15 s so a last-second click works) |
| 9 | Equal triage times give duplicate places | Fixed: one comparator `(triaged_at, id)` for both staff order and place |
| 10 | Wait label vs calculation | Not changed: label is SPEC wording, estimate is simulated |
| 11 | Call-back already active on page open is not announced | Fixed: announced once, 500 ms after the page is visible |
| 12 | Staff removal has no announcement or focus handling | Fixed: staff status region + focus moves to the list heading |
| 13 | amber-500 focus outline about 2.15:1 on white | Fixed: slate-950 |

All 32 unit tests pass; lint and type check are clean; the core loop was clicked through in two browser tabs.

## Questions for you

1. Do the fixes for 2, 4, 5, 6, 9, 11 and 12 actually close the problem, or do they leave a gap?
2. Did any fix introduce a new bug or change what the app does in the normal core loop?
3. Is a 10-second undo right for staff, including keyboard and screen-reader users (WCAG 2.2.1 timing)?
4. Are the reasons for not changing 1, 3, 4 (label) and 10 acceptable for a Phase 1 prototype?
5. Anything in the code below that breaks the project rules: one job per file, no file over 300 lines, rules in lib/ with tests?

Please answer as a short ranked list (High / Medium / Low), each with file and line.

## The changes (git diff)

```diff
diff --git a/app/page.tsx b/app/page.tsx
index 3469859..82c6f17 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -5,7 +5,7 @@ import Link from "next/link";
 import { EmergencyLine } from "@/components/EmergencyLine";
 
 const linkStyle =
-  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-amber-500";
+  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
 
 export default function StartPage() {
   return (
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index b9a038e..b57530a 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -12,18 +12,45 @@ import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
 
 export default function PatientPage() {
   const [token, setToken] = useState<string | null | undefined>(undefined);
+  const [problem, setProblem] = useState("");
+
   // Reading the link and browser storage can only happen in the browser, after the first render.
-  // eslint-disable-next-line react-hooks/set-state-in-effect
-  useEffect(() => setToken(takeTokenFromLink()), []);
+  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
+  useEffect(() => {
+    const readLink = () => {
+      setToken(takeTokenFromLink());
+      setProblem("");
+    };
+    readLink();
+    window.addEventListener("hashchange", readLink);
+    return () => window.removeEventListener("hashchange", readLink);
+  }, []);
 
   const view = usePatientView(token ?? null);
   const loading = token === undefined || view === undefined;
 
-  // The first time the called screen is shown, record seen_at (shown, not necessarily read).
+  // The first time the called screen is actually on screen, record seen_at
+  // (shown, not necessarily read). A tab in the background waits until it is brought forward.
   useEffect(() => {
-    if (token && view?.status === "called" && !view.seen) recordSeen(token);
+    if (!token || view?.status !== "called" || view.seen) return;
+    const recordIfVisible = () => {
+      if (document.visibilityState === "visible") recordSeen(token);
+    };
+    recordIfVisible();
+    document.addEventListener("visibilitychange", recordIfVisible);
+    return () => document.removeEventListener("visibilitychange", recordIfVisible);
   }, [token, view?.status, view?.seen]);
 
+  function onOnMyWay() {
+    if (!token) return;
+    const result = confirmOnMyWayByToken(token);
+    setProblem(
+      result === "not_saved"
+        ? "Your answer was not saved, so staff have not been told. Please try again, or come back to the desk."
+        : "",
+    );
+  }
+
   return (
     <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
       <h1 className="text-xl font-bold">Virtual Waiting Room</h1>
@@ -47,8 +74,13 @@ export default function PatientPage() {
             Visit code: <strong className="font-mono tracking-widest">{view.code}</strong> · Demo
             Site {view.site}
           </p>
-          <PatientStatus view={view} onOnMyWay={() => token && confirmOnMyWayByToken(token)} />
-          <StatusAnnouncer status={view.status} />
+          <PatientStatus view={view} onOnMyWay={onOnMyWay} />
+          {problem && (
+            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
+              {problem}
+            </p>
+          )}
+          <StatusAnnouncer key={token} status={view.status} />
         </>
       )}
     </main>
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 806de36..b453c16 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -2,11 +2,13 @@
 
 // The staff screen: check patients in, see who is waiting off-site, call them back.
 
-import { useState } from "react";
+import { useCallback, useRef, useState } from "react";
+import { undoCloseVisit } from "@/data/staffActions";
 import { useVisits } from "@/data/useVisits";
 import { activeLine } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { CheckInPanel } from "@/components/staff/CheckInPanel";
+import { UndoBanner, type Closed } from "@/components/staff/UndoBanner";
 import { VisitRow } from "@/components/staff/VisitRow";
 import { VisitSlip } from "@/components/staff/VisitSlip";
 import { useNow } from "@/components/useNow";
@@ -16,6 +18,29 @@ export default function StaffPage() {
   const now = useNow();
   const [site, setSite] = useState<Site>("A");
   const [slip, setSlip] = useState<Visit | null>(null);
+  const [announcement, setAnnouncement] = useState("");
+  const [justClosed, setJustClosed] = useState<Closed | null>(null);
+  const listHeading = useRef<HTMLHeadingElement>(null);
+
+  // A patient just left the list: say so, offer Undo, and move keyboard focus from the
+  // vanished row to the list heading, so the next Tab lands on the Undo button.
+  const onLeftList = (closed: Closed) => {
+    setAnnouncement(closed.message);
+    setJustClosed(closed);
+    listHeading.current?.focus();
+  };
+  const hideUndo = useCallback(() => setJustClosed(null), []);
+  const onUndo = (closed: Closed) => {
+    const result = undoCloseVisit(closed.id, closed.previous);
+    setJustClosed(null);
+    setAnnouncement(
+      result === "saved"
+        ? `Undone: visit ${closed.code} is back on the list.`
+        : result === "not_saved"
+          ? `Not saved: this browser could not undo visit ${closed.code}. Try again.`
+          : `Could not undo visit ${closed.code}: the time to undo has passed or the visit changed.`,
+    );
+  };
 
   const line = visits ? activeLine(visits, site) : [];
   // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
@@ -32,6 +57,7 @@ export default function StaffPage() {
             onChange={(e) => {
               setSite(e.target.value as Site);
               setSlip(null);
+              setJustClosed(null);
             }}
             className="min-h-11 rounded-lg border-2 border-slate-400 px-3"
           >
@@ -51,9 +77,13 @@ export default function StaffPage() {
         </div>
 
         <section aria-labelledby="list-heading" className="space-y-3">
-          <h2 id="list-heading" className="text-xl font-bold">
+          <h2 id="list-heading" ref={listHeading} tabIndex={-1} className="text-xl font-bold">
             Waiting off-site ({line.length})
           </h2>
+          <p role="status" className="min-h-6 font-semibold">
+            {announcement}
+          </p>
+          {justClosed && <UndoBanner closed={justClosed} onUndo={onUndo} onExpire={hideUndo} />}
           {visits === null || now === null ? (
             <p>Loading…</p>
           ) : line.length === 0 ? (
@@ -61,7 +91,13 @@ export default function StaffPage() {
           ) : (
             <ol className="space-y-3">
               {line.map((visit) => (
-                <VisitRow key={visit.id} visit={visit} now={now} onShowSlip={setSlip} />
+                <VisitRow
+                  key={visit.id}
+                  visit={visit}
+                  now={now}
+                  onShowSlip={setSlip}
+                  onLeftList={onLeftList}
+                />
               ))}
             </ol>
           )}
diff --git a/components/Button.tsx b/components/Button.tsx
index 54c4fe3..d582343 100644
--- a/components/Button.tsx
+++ b/components/Button.tsx
@@ -19,7 +19,7 @@ export function Button({
   return (
     <button
       type={type}
-      className={`min-h-11 rounded-lg px-4 py-2 text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50 ${styles[variant]} ${className}`}
+      className={`min-h-11 rounded-lg px-4 py-2 text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:opacity-50 ${styles[variant]} ${className}`}
       {...props}
     />
   );
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 4a73be2..93eb9ef 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -1,7 +1,7 @@
 "use client";
 
 // The main part of the patient screen, which changes with the visit's status:
-// Waiting, Please head back now, or Ready at the desk.
+// Waiting, Please head back now, Ready at the desk, and the states before and after those.
 
 import type { PatientView } from "@/lib/patientView";
 import { Button } from "@/components/Button";
@@ -59,18 +59,44 @@ function Called({ view, onOnMyWay }: Props) {
   );
 }
 
-function Closed({ view }: { view: PatientView }) {
-  const arrived = view.status === "arrived";
+// Heading and message for every status that has no place-in-line or call-back screen.
+// Placeholder wording until the Phase 3 wording review.
+const OTHER: Record<string, { heading: string; text: string }> = {
+  pre_arrival: {
+    heading: "Status: Checked in from home, not yet triaged",
+    text: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
+  },
+  needs_reassessment: {
+    heading: "Please go to the triage desk",
+    text: "A nurse will check you again before you rejoin the line.",
+  },
+  arrived: {
+    heading: "Status: Ready at the desk",
+    text: "Staff have marked you as back. Please stay in the waiting area until staff call you.",
+  },
+  declined: {
+    heading: "Status: Waiting in the emergency department",
+    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
+  },
+  not_eligible: {
+    heading: "Status: Waiting in the emergency department",
+    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
+  },
+};
+
+const ENDED = {
+  heading: "Your off-site wait has ended",
+  text: "Please check with the emergency department desk.",
+};
+
+function OtherStatus({ view }: { view: PatientView }) {
+  const { heading, text } = OTHER[view.status] ?? ENDED;
   return (
     <section aria-labelledby="status-heading" className="space-y-3">
       <h2 id="status-heading" className="text-2xl font-bold">
-        {arrived ? "Status: Ready at the desk" : "Your off-site wait has ended"}
+        {heading}
       </h2>
-      <p className="text-lg">
-        {arrived
-          ? "Staff have marked you as back. Please stay in the waiting area until staff call you."
-          : "Please check with the emergency department desk."}
-      </p>
+      <p className="text-lg">{text}</p>
     </section>
   );
 }
@@ -80,5 +106,5 @@ export function PatientStatus({ view, onOnMyWay }: Props) {
   if (view.status === "called" || view.status === "on_the_way") {
     return <Called view={view} onOnMyWay={onOnMyWay} />;
   }
-  return <Closed view={view} />;
+  return <OtherStatus view={view} />;
 }
diff --git a/components/patient/StatusAnnouncer.tsx b/components/patient/StatusAnnouncer.tsx
index 6cd237f..96e8344 100644
--- a/components/patient/StatusAnnouncer.tsx
+++ b/components/patient/StatusAnnouncer.tsx
@@ -3,21 +3,28 @@
 // Tells screen readers about status changes only (never the wait range or countdowns):
 // an assertive message for the call-back, a polite one for everything else.
 
-import { useState } from "react";
+import { useEffect, useRef, useState } from "react";
 import type { VisitStatus } from "@/lib/visit";
 
+const CALLED = "You have been called back. Please head back to the emergency department now.";
+
 const MESSAGES: Partial<Record<VisitStatus, string>> = {
-  called: "You have been called back. Please head back to the emergency department now.",
+  called: CALLED,
   on_the_way: "Thank you. Staff know you are on your way.",
   arrived: "Staff have marked you as back at the emergency department.",
   removed: "Your off-site wait has ended.",
+  unable_to_reach: "Your off-site wait has ended.",
+  needs_reassessment: "Please go to the triage desk.",
 };
 
 export function StatusAnnouncer({ status }: { status: VisitStatus }) {
-  // The status already on screen when the page opened is not announced.
   const [previous, setPrevious] = useState(status);
   const [polite, setPolite] = useState("");
   const [urgent, setUrgent] = useState("");
+  const current = useRef(status);
+  useEffect(() => {
+    current.current = status;
+  }, [status]);
 
   // Update the messages while rendering, the moment the status changes.
   if (status !== previous) {
@@ -27,6 +34,25 @@ export function StatusAnnouncer({ status }: { status: VisitStatus }) {
     else setPolite(text);
   }
 
+  // Routine statuses already on screen when the page opened are not announced, but a call-back is:
+  // once, shortly after the page is on screen (screen readers miss text present at load).
+  const [openedWith] = useState(status);
+  useEffect(() => {
+    if (openedWith !== "called") return;
+    let done = false;
+    const announce = () => {
+      if (done || document.visibilityState !== "visible" || current.current !== "called") return;
+      done = true;
+      setUrgent(CALLED);
+    };
+    const timer = window.setTimeout(announce, 500);
+    document.addEventListener("visibilitychange", announce);
+    return () => {
+      window.clearTimeout(timer);
+      document.removeEventListener("visibilitychange", announce);
+    };
+  }, [openedWith]);
+
   return (
     <>
       <p aria-live="polite" className="sr-only">
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 6a662ea..d6236ed 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -33,6 +33,10 @@ export function CheckInPanel({ site, onCreated }: Props) {
       return;
     }
     const visit = createDeskVisit({ site, ctas_level: ctas, language }, outcome);
+    if (!visit) {
+      setMessage("Not saved: this browser could not store the visit. Nothing was recorded. Try again.");
+      return;
+    }
     setCtas(null);
     setTicked({});
     setMessage(
diff --git a/components/staff/UndoBanner.tsx b/components/staff/UndoBanner.tsx
new file mode 100644
index 0000000..401363a
--- /dev/null
+++ b/components/staff/UndoBanner.tsx
@@ -0,0 +1,32 @@
+"use client";
+
+// After Mark arrived, Left or No-show: says what happened and offers Undo for 10 seconds.
+
+import { useEffect } from "react";
+import { UNDO_BANNER_SECONDS } from "@/lib/visitActions";
+import type { VisitStatus } from "@/lib/visit";
+import { Button } from "@/components/Button";
+
+/** A visit that just left the list, and the status it had before. */
+export type Closed = { id: string; code: string; previous: VisitStatus; message: string };
+
+type Props = { closed: Closed; onUndo: (closed: Closed) => void; onExpire: () => void };
+
+export function UndoBanner({ closed, onUndo, onExpire }: Props) {
+  useEffect(() => {
+    const timer = window.setTimeout(onExpire, UNDO_BANNER_SECONDS * 1000);
+    return () => window.clearTimeout(timer);
+  }, [closed, onExpire]);
+
+  return (
+    <div
+      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-slate-800 bg-slate-100 p-3"
+      data-testid="undo-banner"
+    >
+      <p className="font-semibold">{closed.message}</p>
+      <Button variant="secondary" onClick={() => onUndo(closed)}>
+        Undo<span className="sr-only"> for visit {closed.code}</span>
+      </Button>
+    </div>
+  );
+}
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index 25e8799..3a0bf20 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -4,11 +4,22 @@
 
 import { useState } from "react";
 import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
+import type { ChangeResult } from "@/data/visitStore";
+import type { Closed } from "@/components/staff/UndoBanner";
 import { minutesBetween } from "@/lib/queue";
 import type { Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
 
-type Props = { visit: Visit; now: Date; onShowSlip: (visit: Visit) => void };
+type Props = {
+  visit: Visit;
+  now: Date;
+  onShowSlip: (visit: Visit) => void;
+  /** Called after a change that takes this patient off the list, so the page can offer Undo. */
+  onLeftList: (closed: Closed) => void;
+};
+
+const NOT_SAVED = "Not saved: this browser could not store the change. Try again.";
+const CHANGED = "The list just changed. Check this patient again.";
 
 function progress(visit: Visit, now: Date): string {
   if (visit.status === "waiting") return "Waiting off-site";
@@ -19,9 +30,15 @@ function progress(visit: Visit, now: Date): string {
   return steps.join(" · ");
 }
 
-export function VisitRow({ visit, now, onShowSlip }: Props) {
+export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   const [note, setNote] = useState("");
-  const act = (ok: boolean) => setNote(ok ? "" : "The list just changed. Check this patient again.");
+  /** Show what happened. `leftListMessage` is announced when the patient leaves the list. */
+  const act = (result: ChangeResult, leftListMessage?: string) => {
+    if (result === "saved" && leftListMessage) {
+      onLeftList({ id: visit.id, code: visit.code, previous: visit.status, message: leftListMessage });
+    }
+    setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
+  };
   const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;
 
   return (
@@ -39,7 +56,7 @@ export function VisitRow({ visit, now, onShowSlip }: Props) {
         {visit.status === "waiting" && (
           <Button onClick={() => act(callBackVisit(visit.id))}>Call back</Button>
         )}
-        <Button variant="secondary" onClick={() => act(markVisitArrived(visit.id))}>
+        <Button variant="secondary" onClick={() => act(markVisitArrived(visit.id), `Visit ${visit.code} marked arrived.`)}>
           Mark arrived
         </Button>
         <Button variant="secondary" onClick={() => onShowSlip(visit)}>
@@ -51,10 +68,10 @@ export function VisitRow({ visit, now, onShowSlip }: Props) {
           Remove from list
         </summary>
         <div className="mt-2 flex flex-wrap gap-2">
-          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "left"))}>
+          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "left"), `Visit ${visit.code} removed: left.`)}>
             Left
           </Button>
-          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "no_show"))}>
+          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "no_show"), `Visit ${visit.code} removed: no-show.`)}>
             No-show
           </Button>
         </div>
diff --git a/components/staff/VisitSlip.tsx b/components/staff/VisitSlip.tsx
index 5a32943..2044954 100644
--- a/components/staff/VisitSlip.tsx
+++ b/components/staff/VisitSlip.tsx
@@ -43,7 +43,7 @@ export function VisitSlip({ code, token, onClose }: Props) {
             href={scanLink}
             target="_blank"
             rel="noopener"
-            className="inline-block text-blue-800 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-amber-500"
+            className="inline-block text-blue-800 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950"
           >
             Demo: open the patient screen in a new tab
           </a>
diff --git a/data/patientVisit.ts b/data/patientVisit.ts
index 5a3b658..d4f4d76 100644
--- a/data/patientVisit.ts
+++ b/data/patientVisit.ts
@@ -5,22 +5,22 @@
 import { useCallback, useSyncExternalStore } from "react";
 import { patientViewFor, type PatientView } from "@/lib/patientView";
 import { confirmOnMyWay, markSeen } from "@/lib/visitActions";
-import { readVisits, subscribeToVisits, updateVisit } from "./visitStore";
+import { readVisits, subscribeToVisits, updateVisit, type ChangeResult } from "./visitStore";
 
 function idForToken(token: string): string | null {
   return readVisits().find((v) => v.access_token === token)?.id ?? null;
 }
 
 /** Record that the called screen was shown. Only while called, and only once. */
-export function recordSeen(token: string): boolean {
+export function recordSeen(token: string): ChangeResult {
   const id = idForToken(token);
-  return id ? updateVisit(id, (v) => markSeen(v, new Date())) : false;
+  return id ? updateVisit(id, (v) => markSeen(v, new Date())) : "refused";
 }
 
 /** The patient taps "I'm on my way". Only while called. */
-export function confirmOnMyWayByToken(token: string): boolean {
+export function confirmOnMyWayByToken(token: string): ChangeResult {
   const id = idForToken(token);
-  return id ? updateVisit(id, (v) => confirmOnMyWay(v, new Date())) : false;
+  return id ? updateVisit(id, (v) => confirmOnMyWay(v, new Date())) : "refused";
 }
 
 // Cache so React gets the same object until the view really changes.
diff --git a/data/savedToken.ts b/data/savedToken.ts
index e5d5ad4..b5668fb 100644
--- a/data/savedToken.ts
+++ b/data/savedToken.ts
@@ -1,7 +1,7 @@
 // Remembers this phone's visit token in browser storage, so reopening the site
 // brings the visit back without the patient typing anything.
 
-import { normalizeToken } from "@/lib/codes";
+import { isAccessToken, normalizeToken } from "@/lib/codes";
 
 const TOKEN_KEY = "vwr.patientToken";
 
@@ -21,19 +21,28 @@ export function saveToken(token: string): void {
   }
 }
 
+function decodeLinkPart(text: string): string | null {
+  try {
+    return decodeURIComponent(text);
+  } catch {
+    return null; // broken %-codes, for example a link cut short when typed
+  }
+}
+
 /**
  * Take a token from the link's #t=... part (never sent to a server), save it,
  * and remove it from the address bar. Falls back to the token saved earlier.
+ * A link whose token is damaged opens no visit (null), rather than an older saved one.
  */
 export function takeTokenFromLink(): string | null {
-  const match = window.location.hash.match(/[#&]t=([^&]+)/);
-  if (match) {
-    const token = normalizeToken(decodeURIComponent(match[1]));
-    saveToken(token);
-    window.history.replaceState(null, "", window.location.pathname);
-    return token;
-  }
-  return loadSavedToken();
+  const match = window.location.hash.match(/[#&]t=([^&]*)/);
+  if (!match) return loadSavedToken();
+  window.history.replaceState(null, "", window.location.pathname);
+  const decoded = decodeLinkPart(match[1]);
+  const token = decoded === null ? null : normalizeToken(decoded);
+  if (token === null || !isAccessToken(token)) return null;
+  saveToken(token);
+  return token;
 }
 
 /** The link printed on the desk slip and carried by the QR code. */
diff --git a/data/staffActions.ts b/data/staffActions.ts
index 43af838..2391469 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -2,20 +2,24 @@
 // behind staff login; the screens keep calling these same functions.
 
 import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
-import type { Site, Visit } from "@/lib/visit";
+import type { Site, Visit, VisitStatus } from "@/lib/visit";
 import {
   callBack,
   checkInAtDesk,
   markArrived,
   markRemoved,
+  undoClose,
   type DeskOutcome,
 } from "@/lib/visitActions";
 import { addVisit, readVisits, updateVisit } from "./visitStore";
 
 export type CheckInForm = { site: Site; ctas_level: 4 | 5; language: string };
 
-/** Create a desk visit after triage. Returns the new visit so the slip can be shown. */
-export function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Visit {
+/**
+ * Create a desk visit after triage. Returns the new visit so the slip can be shown,
+ * or null if this browser could not save it.
+ */
+export function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Visit | null {
   const taken = new Set(readVisits().map((v) => v.code));
   const visit = checkInAtDesk(
     {
@@ -27,11 +31,12 @@ export function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Visit
     outcome,
     new Date(),
   );
-  addVisit(visit);
-  return visit;
+  return addVisit(visit) === "saved" ? visit : null;
 }
 
 export const callBackVisit = (id: string) => updateVisit(id, (v) => callBack(v, new Date()));
 export const markVisitArrived = (id: string) => updateVisit(id, (v) => markArrived(v, new Date()));
 export const removeVisit = (id: string, reason: "left" | "no_show") =>
   updateVisit(id, (v) => markRemoved(v, reason, new Date()));
+export const undoCloseVisit = (id: string, previous: VisitStatus) =>
+  updateVisit(id, (v) => undoClose(v, previous, new Date()));
diff --git a/data/visitStore.test.ts b/data/visitStore.test.ts
new file mode 100644
index 0000000..671c3f1
--- /dev/null
+++ b/data/visitStore.test.ts
@@ -0,0 +1,44 @@
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { checkInAtDesk, callBack } from "@/lib/visitActions";
+import { addVisit, readVisits, updateVisit } from "./visitStore";
+
+const visit = checkInAtDesk(
+  { id: "v1", code: "ABC234", access_token: "T", site: "A", ctas_level: 4, language: "en" },
+  "waiting",
+  new Date(Date.UTC(2026, 10, 9, 20, 0)),
+);
+
+function fakeBrowser(setItemWorks: () => boolean) {
+  const saved = new Map<string, string>();
+  vi.stubGlobal("window", {
+    localStorage: {
+      getItem: (key: string) => saved.get(key) ?? null,
+      setItem: (key: string, value: string) => {
+        if (!setItemWorks()) throw new Error("QuotaExceededError");
+        saved.set(key, value);
+      },
+    },
+  });
+}
+
+afterEach(() => vi.unstubAllGlobals());
+
+describe("saving visits", () => {
+  it("reports saved, and refused for a step that is not allowed", () => {
+    fakeBrowser(() => true);
+    expect(addVisit(visit)).toBe("saved");
+    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("saved");
+    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("refused");
+    expect(updateVisit("missing", (v) => v)).toBe("refused");
+  });
+
+  it("reports not_saved when the browser refuses to store, and keeps the old status", () => {
+    let works = true;
+    fakeBrowser(() => works);
+    addVisit(visit);
+    works = false;
+    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("not_saved");
+    expect(readVisits()[0].status).toBe("waiting");
+    expect(addVisit({ ...visit, id: "v2" })).toBe("not_saved");
+  });
+});
diff --git a/data/visitStore.ts b/data/visitStore.ts
index 2c59bef..ea9ee09 100644
--- a/data/visitStore.ts
+++ b/data/visitStore.ts
@@ -2,8 +2,16 @@
 // Every tab of the same browser shares it, and other tabs hear about changes
 // through the browser's "storage" event, so two tabs stay in sync without a server.
 
+import { parseVisits } from "@/lib/parseVisits";
 import type { Visit } from "@/lib/visit";
 
+/**
+ * What happened when something tried to change a visit:
+ * saved, refused (the visit is gone or the step is not allowed now, for example a double click),
+ * or not_saved (this browser could not store it, for example storage is full or blocked).
+ */
+export type ChangeResult = "saved" | "refused" | "not_saved";
+
 const STORAGE_KEY = "vwr.visits.v1";
 const listeners = new Set<() => void>();
 
@@ -23,40 +31,34 @@ export function readVisits(): Visit[] {
   const raw = safeGet();
   if (raw !== cachedRaw) {
     cachedRaw = raw;
-    try {
-      cachedVisits = raw ? (JSON.parse(raw) as Visit[]) : [];
-    } catch {
-      cachedVisits = [];
-    }
+    cachedVisits = parseVisits(raw);
   }
   return cachedVisits;
 }
 
-function writeVisits(visits: Visit[]): void {
+function writeVisits(visits: Visit[]): ChangeResult {
   try {
     window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
   } catch {
-    // Storage blocked (private mode, full disk): the demo can't save, but must not crash.
+    // Storage blocked (private mode, full disk): report it so the screen never claims success.
+    return "not_saved";
   }
   listeners.forEach((notify) => notify()); // the "storage" event only reaches other tabs
+  return "saved";
 }
 
-export function addVisit(visit: Visit): void {
-  writeVisits([...readVisits(), visit]);
+export function addVisit(visit: Visit): ChangeResult {
+  return writeVisits([...readVisits(), visit]);
 }
 
-/**
- * Apply one rule (from lib/visitActions) to one visit.
- * Returns false when the visit is gone or the rule refused, for example a double click.
- */
-export function updateVisit(id: string, step: (visit: Visit) => Visit | null): boolean {
+/** Apply one rule (from lib/visitActions) to one visit. */
+export function updateVisit(id: string, step: (visit: Visit) => Visit | null): ChangeResult {
   const visits = readVisits();
   const current = visits.find((v) => v.id === id);
-  if (!current) return false;
+  if (!current) return "refused";
   const next = step(current);
-  if (!next) return false;
-  writeVisits(visits.map((v) => (v.id === id ? next : v)));
-  return true;
+  if (!next) return "refused";
+  return writeVisits(visits.map((v) => (v.id === id ? next : v)));
 }
 
 /** Call `onChange` whenever visits change in this tab or another tab. Returns an unsubscribe. */
diff --git a/lib/codes.test.ts b/lib/codes.test.ts
index 5cbdacd..a8a50a8 100644
--- a/lib/codes.test.ts
+++ b/lib/codes.test.ts
@@ -2,6 +2,7 @@ import { describe, expect, it } from "vitest";
 import {
   CODE_ALPHABET,
   groupToken,
+  isAccessToken,
   makeAccessToken,
   makeDisplayCode,
   makeUniqueDisplayCode,
@@ -44,3 +45,14 @@ describe("access token", () => {
     expect(normalizeToken(typed)).toBe(token);
   });
 });
+
+describe("checking a token from a link", () => {
+  it("accepts a real token, grouped or not, and refuses anything else", () => {
+    const token = makeAccessToken();
+    expect(isAccessToken(token)).toBe(true);
+    expect(isAccessToken(normalizeToken(groupToken(token)))).toBe(true);
+    for (const bad of ["", "ABC", token + "0", token.slice(1) + "U", "%%%"]) {
+      expect(isAccessToken(bad)).toBe(false);
+    }
+  });
+});
diff --git a/lib/codes.ts b/lib/codes.ts
index 2f8ccfe..28fc905 100644
--- a/lib/codes.ts
+++ b/lib/codes.ts
@@ -68,3 +68,8 @@ export function normalizeToken(typed: string): string {
     .replace(/O/g, "0")
     .replace(/[IL]/g, "1");
 }
+
+/** True only for something shaped like a token from makeAccessToken (26 Crockford characters). */
+export function isAccessToken(token: string): boolean {
+  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(token);
+}
diff --git a/lib/parseVisits.test.ts b/lib/parseVisits.test.ts
new file mode 100644
index 0000000..779edfa
--- /dev/null
+++ b/lib/parseVisits.test.ts
@@ -0,0 +1,26 @@
+import { describe, expect, it } from "vitest";
+import { parseVisits } from "./parseVisits";
+import { checkInAtDesk } from "./visitActions";
+
+const good = checkInAtDesk(
+  { id: "v1", code: "ABC234", access_token: "T", site: "A", ctas_level: 4, language: "en" },
+  "waiting",
+  new Date(Date.UTC(2026, 10, 9, 20, 0)),
+);
+
+describe("reading saved visits", () => {
+  it("reads a normal saved list", () => {
+    expect(parseVisits(JSON.stringify([good]))).toEqual([good]);
+  });
+
+  it("treats nothing saved, broken text, null and non-lists as an empty list", () => {
+    for (const raw of [null, "", "{not json", "null", "{}", "42", '"text"']) {
+      expect(parseVisits(raw)).toEqual([]);
+    }
+  });
+
+  it("skips entries that are not visits instead of crashing", () => {
+    const raw = JSON.stringify([null, 7, { id: "x" }, { ...good, status: "made_up" }, { ...good, triaged_at: 5 }, good]);
+    expect(parseVisits(raw)).toEqual([good]);
+  });
+});
diff --git a/lib/parseVisits.ts b/lib/parseVisits.ts
new file mode 100644
index 0000000..45ccd68
--- /dev/null
+++ b/lib/parseVisits.ts
@@ -0,0 +1,44 @@
+// Checks the visit list read back from browser storage, so a damaged or hand-edited
+// entry is skipped instead of crashing the staff or patient screen.
+
+import { ALL_STATUSES, type Visit } from "./visit";
+
+const TIME_FIELDS = [
+  "created_at",
+  "triaged_at",
+  "offered_at",
+  "last_still_here_at",
+  "called_at",
+  "seen_at",
+  "confirmed_at",
+  "review_flagged_at",
+  "arrived_at",
+  "closed_at",
+  "followup_paused_until",
+] as const;
+
+function isVisit(value: unknown): value is Visit {
+  if (typeof value !== "object" || value === null) return false;
+  const v = value as Record<string, unknown>;
+  return (
+    typeof v.id === "string" &&
+    typeof v.code === "string" &&
+    typeof v.access_token === "string" &&
+    (v.site === "A" || v.site === "B") &&
+    ALL_STATUSES.includes(v.status as Visit["status"]) &&
+    typeof v.created_at === "string" &&
+    TIME_FIELDS.every((field) => v[field] === null || typeof v[field] === "string")
+  );
+}
+
+/** The saved text as a list of visits. Anything unreadable becomes an empty list or is skipped. */
+export function parseVisits(raw: string | null): Visit[] {
+  if (!raw) return [];
+  let data: unknown;
+  try {
+    data = JSON.parse(raw);
+  } catch {
+    return [];
+  }
+  return Array.isArray(data) ? data.filter(isVisit) : [];
+}
diff --git a/lib/queue.test.ts b/lib/queue.test.ts
index bdfdb9f..e41e1b0 100644
--- a/lib/queue.test.ts
+++ b/lib/queue.test.ts
@@ -57,3 +57,14 @@ describe("wait range", () => {
     expect(minutesBetween(at(10).toISOString(), at(0))).toBe(0);
   });
 });
+
+describe("ties in triage time", () => {
+  it("gives two patients triaged at the same moment different places, matching the staff order", () => {
+    const visits = [visit("b", 5), visit("a", 5)];
+    const places = visits.map((v) => placeInLine(visits, v));
+    expect(places.sort()).toEqual([1, 2]);
+    const staffOrder = activeLine(visits, "A").map((v) => v.id);
+    expect(staffOrder).toEqual(["a", "b"]);
+    expect(placeInLine(visits, visits[1])).toBe(1); // "a" is first in both
+  });
+});
diff --git a/lib/queue.ts b/lib/queue.ts
index 96c82df..5f2e234 100644
--- a/lib/queue.ts
+++ b/lib/queue.ts
@@ -3,8 +3,16 @@
 
 import { ACTIVE_STATUSES, type Site, type Visit } from "./visit";
 
-const byTriage = (a: Visit, b: Visit) =>
-  (a.triaged_at ?? "").localeCompare(b.triaged_at ?? "");
+/**
+ * Triage time first; two patients triaged at the same moment are put in a fixed order by id,
+ * so the staff list and each patient's place always agree.
+ */
+function byTriage(a: Visit, b: Visit): number {
+  const at = a.triaged_at ?? "";
+  const bt = b.triaged_at ?? "";
+  if (at !== bt) return at < bt ? -1 : 1;
+  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
+}
 
 /** Visits still in the off-site line at one site, oldest triage first. */
 export function activeLine(visits: Visit[], site: Site): Visit[] {
@@ -21,7 +29,7 @@ export function placeInLine(visits: Visit[], visit: Visit): number | null {
       v.site === visit.site &&
       v.status === "waiting" &&
       v.triaged_at !== null &&
-      v.triaged_at < visit.triaged_at!,
+      byTriage(v, visit) < 0,
   ).length;
   return ahead + 1;
 }
diff --git a/lib/visit.ts b/lib/visit.ts
index 27faf1d..c1dda2e 100644
--- a/lib/visit.ts
+++ b/lib/visit.ts
@@ -42,5 +42,19 @@ export type Visit = {
   is_demo: boolean;
 };
 
+/** Every status, for checking data read back from storage. */
+export const ALL_STATUSES: VisitStatus[] = [
+  "pre_arrival",
+  "waiting",
+  "called",
+  "on_the_way",
+  "arrived",
+  "unable_to_reach",
+  "needs_reassessment",
+  "removed",
+  "declined",
+  "not_eligible",
+];
+
 /** Statuses that are still in the off-site line (not yet closed). */
 export const ACTIVE_STATUSES: VisitStatus[] = ["waiting", "called", "on_the_way"];
diff --git a/lib/visitActions.test.ts b/lib/visitActions.test.ts
index 0cc4c6d..4d9ba36 100644
--- a/lib/visitActions.test.ts
+++ b/lib/visitActions.test.ts
@@ -6,6 +6,7 @@ import {
   markArrived,
   markRemoved,
   markSeen,
+  undoClose,
 } from "./visitActions";
 
 const t0 = new Date("2026-11-09T20:00:00Z");
@@ -84,3 +85,34 @@ describe("core loop", () => {
     expect(v.closed_at).toBe(later(5).toISOString());
   });
 });
+
+describe("undo after Mark arrived, Left or No-show", () => {
+  const sec = (s: number) => new Date(later(5).getTime() + s * 1000);
+  const waiting = checkInAtDesk(input, "waiting", t0);
+  const onTheWay = confirmOnMyWay(callBack(waiting, later(1))!, later(2))!;
+
+  it("puts an arrived visit back to its earlier status and clears closed_at", () => {
+    const arrived = markArrived(onTheWay, sec(0))!;
+    const undone = undoClose(arrived, "on_the_way", sec(9))!;
+    expect(undone.status).toBe("on_the_way");
+    expect(undone.closed_at).toBeNull();
+    expect(undone.arrived_at).toBeNull();
+    expect(undone.confirmed_at).toBe(onTheWay.confirmed_at); // the rest of the history stays
+  });
+
+  it("puts a removed visit back and forgets the removal reason", () => {
+    const removed = markRemoved(waiting, "no_show", sec(0))!;
+    const undone = undoClose(removed, "waiting", sec(9))!;
+    expect(undone.status).toBe("waiting");
+    expect(undone.removed_reason).toBeNull();
+    expect(undone.closed_at).toBeNull();
+  });
+
+  it("refuses once the undo time is over, for open visits, and for a closed earlier status", () => {
+    const arrived = markArrived(waiting, sec(0))!;
+    expect(undoClose(arrived, "waiting", sec(16))).toBeNull();
+    expect(undoClose(waiting, "waiting", sec(1))).toBeNull();
+    expect(undoClose(arrived, "declined", sec(1))).toBeNull();
+    expect(undoClose(checkInAtDesk(input, "declined", sec(0)), "waiting", sec(1))).toBeNull();
+  });
+});
diff --git a/lib/visitActions.ts b/lib/visitActions.ts
index 5e7c104..3584c63 100644
--- a/lib/visitActions.ts
+++ b/lib/visitActions.ts
@@ -2,7 +2,7 @@
 // and returns the updated visit, or null when the step is not allowed right now
 // (for example a second click after the list already changed).
 
-import type { Site, Visit } from "./visit";
+import { ACTIVE_STATUSES, type Site, type Visit, type VisitStatus } from "./visit";
 
 export type DeskCheckIn = {
   id: string;
@@ -94,3 +94,20 @@ export function markRemoved(visit: Visit, reason: "left" | "no_show", now: Date)
   if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
   return { ...visit, status: "removed", removed_reason: reason, closed_at: now.toISOString() };
 }
+
+/** How long the staff screen shows the Undo banner after Mark arrived, Left or No-show. */
+export const UNDO_BANNER_SECONDS = 10;
+/** The rule allows a little longer than the banner, so a last-second click still works. */
+const UNDO_LIMIT_SECONDS = UNDO_BANNER_SECONDS + 5;
+
+/**
+ * Staff press Undo after Mark arrived, Left or No-show: the visit goes back to the status it had
+ * just before (waiting, called or on the way) and is open again. Only shortly after closing.
+ */
+export function undoClose(visit: Visit, previous: VisitStatus, now: Date): Visit | null {
+  if (visit.status !== "arrived" && visit.status !== "removed") return null;
+  if (!visit.closed_at || !ACTIVE_STATUSES.includes(previous)) return null;
+  const secondsSinceClosed = (now.getTime() - new Date(visit.closed_at).getTime()) / 1000;
+  if (secondsSinceClosed > UNDO_LIMIT_SECONDS) return null;
+  return { ...visit, status: previous, arrived_at: null, removed_reason: null, closed_at: null };
+}
diff --git a/vitest.config.ts b/vitest.config.ts
new file mode 100644
index 0000000..04c57a4
--- /dev/null
+++ b/vitest.config.ts
@@ -0,0 +1,8 @@
+// Test settings: lets tests use the same "@/..." import shortcut as the app (see tsconfig.json).
+
+import { fileURLToPath } from "node:url";
+import { defineConfig } from "vitest/config";
+
+export default defineConfig({
+  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
+});
```
