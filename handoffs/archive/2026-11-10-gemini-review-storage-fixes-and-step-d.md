# Review request: fixes after the steps A to C review, and step D

Project: concept prototype of an emergency department virtual waiting room (Next.js 16, React 19, Supabase). Demo data only. No keys, tokens or passwords are in this file.

This follows the review in handoffs/2026-11-10-gemini-review-steps-a-to-c-supabase-storage-response.md. The change below (a git diff) does two things:

- Fixes from that review: one re-read timer per list in the new file data/keepFresh.ts (one read at a time), no empty saves, line order compares the moments first and uses the text only inside the same millisecond, and the patient screen re-reads every 15 seconds.
- Step D: the old browser storage for visits is deleted (visitStore, parseVisits, useStorageProblem, patientViewFor). Deleted files are listed by name only.

Checks: type check, lint, 72 unit tests (fewer than before because the deleted files had tests). In a browser: one read per 15 seconds on each screen, both screens recover by themselves after a blocked database, and the start, patient and staff pages load with no errors. The full loop with a real visit was NOT re-run after these changes.

## Questions

1. data/keepFresh.ts: any way the timer can stop for good, run twice, or keep running after the screen closes? Is skipping a read while another is on its way safe when the tab comes back into view?
2. watch() in data/patientVisit.ts and watchVisits() in data/visitCache.ts: is the counting of listeners right, including React running effects twice in development?
3. byTriage in lib/queue.ts: any input where the new comparison gives a wrong or unstable order?
4. Was anything deleted in step D that the app still needs?

## The change

```diff
diff --git a/data/keepFresh.ts b/data/keepFresh.ts
new file mode 100644
index 0000000..f68f429
--- /dev/null
+++ b/data/keepFresh.ts
@@ -0,0 +1,37 @@
+// Keeps one thing re-read from the database while a screen is showing it: now, on a timer,
+// and when the tab comes back or the connection returns. Used by the patient's visit and the
+// staff list until live updates are built. Only one read runs at a time.
+
+const RETRY_MS = 5_000; // sooner while reads are failing
+
+/**
+ * `read` reads once (it must never throw); `failing` says whether the last read failed.
+ * Returns a function that stops the timer.
+ */
+export function keepFresh(read: () => Promise<void>, failing: () => boolean, everyMs: number): () => void {
+  let stopped = false;
+  let reading = false;
+  let timer: ReturnType<typeof setTimeout> | undefined;
+
+  const readNow = async () => {
+    if (stopped || reading) return; // a read already on its way will bring the fresh answer
+    reading = true;
+    clearTimeout(timer);
+    await read();
+    reading = false;
+    if (!stopped) timer = setTimeout(readNow, failing() ? RETRY_MS : everyMs);
+  };
+  const onBack = () => {
+    if (document.visibilityState === "visible") void readNow();
+  };
+
+  void readNow();
+  document.addEventListener("visibilitychange", onBack);
+  window.addEventListener("online", onBack);
+  return () => {
+    stopped = true;
+    clearTimeout(timer);
+    document.removeEventListener("visibilitychange", onBack);
+    window.removeEventListener("online", onBack);
+  };
+}
diff --git a/data/patientVisit.ts b/data/patientVisit.ts
index 6e3a797..6f9ae9e 100644
--- a/data/patientVisit.ts
+++ b/data/patientVisit.ts
@@ -9,6 +9,7 @@ import { afterFailedRead } from "@/lib/failedRead";
 import type { PatientView } from "@/lib/patientView";
 import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
 import type { ChangeResult, Site } from "@/lib/visit";
+import { keepFresh } from "./keepFresh";
 import { saveToken } from "./savedToken";
 import { supabaseBrowser } from "./supabaseBrowser";
 
@@ -41,18 +42,24 @@ export async function startVisitFromHome(site: Site, language: string): Promise<
 /** A visit, null if the token matches no visit, or "unavailable" if it could not be read. */
 type Shown = PatientView | null | "unavailable";
 
-const REREAD_MS = 30_000; // until live updates arrive in the next step
-const RETRY_MS = 5_000; // sooner while reads are failing
+const REREAD_MS = 15_000; // until live updates arrive in the next step
 
 // What each token last showed, kept in memory only (nothing about the visit is saved on the phone).
-type Entry = { shown?: Shown; key: string; failures: number; latestRead: number };
+type Entry = {
+  shown?: Shown;
+  key: string;
+  failures: number;
+  latestRead: number;
+  watchers: number;
+  stopReading?: () => void;
+};
 const entries = new Map<string, Entry>();
 const listeners = new Set<() => void>();
 
 function entryFor(token: string): Entry {
   let entry = entries.get(token);
   if (!entry) {
-    entry = { key: "", failures: 0, latestRead: 0 };
+    entry = { key: "", failures: 0, latestRead: 0, watchers: 0 };
     entries.set(token, entry);
   }
   return entry;
@@ -84,30 +91,25 @@ async function refreshPatientView(token: string): Promise<void> {
   listeners.forEach((tell) => tell());
 }
 
-/** While a screen is showing this token: read now, every 30 seconds, and when the tab comes back. */
+/**
+ * While a screen is showing this token: read now, every 15 seconds, and when the tab comes back.
+ * There is one timer per token however many parts of the screen are listening.
+ */
 function watch(token: string | null, onChange: () => void): () => void {
   if (!token) return () => {};
   listeners.add(onChange);
-  let stopped = false;
-  let timer: ReturnType<typeof setTimeout> | undefined;
-  const readNow = async () => {
-    await refreshPatientView(token);
-    if (stopped) return;
-    clearTimeout(timer);
-    timer = setTimeout(readNow, entryFor(token).failures > 0 ? RETRY_MS : REREAD_MS);
-  };
-  const onBack = () => {
-    if (document.visibilityState === "visible") void readNow();
-  };
-  void readNow();
-  document.addEventListener("visibilitychange", onBack);
-  window.addEventListener("online", onBack);
+  const entry = entryFor(token);
+  entry.watchers++;
+  if (!entry.stopReading) {
+    entry.stopReading = keepFresh(() => refreshPatientView(token), () => entry.failures > 0, REREAD_MS);
+  }
   return () => {
-    stopped = true;
-    clearTimeout(timer);
     listeners.delete(onChange);
-    document.removeEventListener("visibilitychange", onBack);
-    window.removeEventListener("online", onBack);
+    entry.watchers--;
+    if (entry.watchers === 0 && entry.stopReading) {
+      entry.stopReading();
+      entry.stopReading = undefined;
+    }
   };
 }
 
diff --git a/data/staffActions.ts b/data/staffActions.ts
index eeda307..9b6bc26 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -32,10 +32,12 @@ async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Pr
     void loadVisits();
     return "refused";
   }
+  const changed = changedFields(before, after);
+  if (Object.keys(changed).length === 0) return "refused"; // nothing to save
   try {
     const { data, error } = await supabaseBrowser()
       .from("visits")
-      .update(changedFields(before, after))
+      .update(changed)
       .eq("id", id)
       .eq("version", before.version)
       .select();
diff --git a/data/visitCache.ts b/data/visitCache.ts
index c2e527a..9501810 100644
--- a/data/visitCache.ts
+++ b/data/visitCache.ts
@@ -3,6 +3,7 @@
 // back, and after every staff action. Nothing here is saved in the browser.
 
 import { ACTIVE_STATUSES, type Visit } from "@/lib/visit";
+import { keepFresh } from "./keepFresh";
 import { supabaseBrowser } from "./supabaseBrowser";
 
 /** A visit as the database holds it: the version goes up by one on every change. */
@@ -15,7 +16,6 @@ export const EMPTY_LIST: VisitList = { visits: null, outOfDate: false };
 
 const LIST_HOURS = 24; // plus everyone still in the line, however long ago they were triaged
 const REREAD_MS = 15_000; // until live updates arrive in the next step
-const RETRY_MS = 5_000; // sooner while reads are failing
 
 let list: VisitList = EMPTY_LIST;
 let visitsKey = "";
@@ -69,28 +69,20 @@ export function putVisit(visit: StoredVisit): void {
   void loadVisits();
 }
 
-/** While a staff screen is open: read now, every 15 seconds, and when the tab comes back. */
+let stopReading: (() => void) | null = null;
+
+/**
+ * While any staff screen is open: read now, every 15 seconds, and when the tab comes back.
+ * There is one timer however many parts of the screen are listening.
+ */
 export function watchVisits(onChange: () => void): () => void {
   listeners.add(onChange);
-  let stopped = false;
-  let timer: ReturnType<typeof setTimeout> | undefined;
-  const readNow = async () => {
-    await loadVisits();
-    if (stopped) return;
-    clearTimeout(timer);
-    timer = setTimeout(readNow, list.outOfDate ? RETRY_MS : REREAD_MS);
-  };
-  const onBack = () => {
-    if (document.visibilityState === "visible") void readNow();
-  };
-  void readNow();
-  document.addEventListener("visibilitychange", onBack);
-  window.addEventListener("online", onBack);
+  if (!stopReading) stopReading = keepFresh(loadVisits, () => list.outOfDate, REREAD_MS);
   return () => {
-    stopped = true;
-    clearTimeout(timer);
     listeners.delete(onChange);
-    document.removeEventListener("visibilitychange", onBack);
-    window.removeEventListener("online", onBack);
+    if (listeners.size === 0 && stopReading) {
+      stopReading();
+      stopReading = null;
+    }
   };
 }
diff --git a/lib/patientView.ts b/lib/patientView.ts
index 0fa9d82..ff6611e 100644
--- a/lib/patientView.ts
+++ b/lib/patientView.ts
@@ -1,9 +1,8 @@
 // What a patient's phone is allowed to see about its own visit (SPEC rule 5).
-// In Phase 2 a database function returns this same shape; nothing else leaves the database.
+// The database function get_patient_visit returns these fields and nothing else;
+// lib/patientViewFromRow.ts turns its answer into this shape.
 
-import { isExpected } from "./expectedArrivals";
-import { averageCallGap, placeInLine, waitRange } from "./queue";
-import type { Site, Visit, VisitStatus } from "./visit";
+import type { Site, VisitStatus } from "./visit";
 
 export type PatientView = {
   code: string;
@@ -20,25 +19,3 @@ export type PatientView = {
   /** Started from home, never triaged, and past the 6 hours staff keep expecting it. */
   expired: boolean;
 };
-
-/** Find the visit with this token and return only the patient-safe fields, or null. */
-export function patientViewFor(visits: Visit[], token: string, now: Date): PatientView | null {
-  const visit = visits.find((v) => v.access_token === token);
-  if (!visit) return null;
-  const place = placeInLine(visits, visit);
-  const range = place === null ? null : waitRange(place, averageCallGap(visits, visit.site));
-  return {
-    code: visit.code,
-    site: visit.site,
-    language: visit.language,
-    status: visit.status,
-    placeInLine: place,
-    waitLow: range?.low ?? null,
-    waitHigh: range?.high ?? null,
-    calledAt: visit.called_at,
-    lastStillHereAt: visit.last_still_here_at,
-    seen: visit.seen_at !== null,
-    closed: visit.closed_at !== null,
-    expired: visit.status === "pre_arrival" && !isExpected(visit, now),
-  };
-}
diff --git a/lib/queue.ts b/lib/queue.ts
index 5f2e234..82faab7 100644
--- a/lib/queue.ts
+++ b/lib/queue.ts
@@ -10,6 +10,11 @@ import { ACTIVE_STATUSES, type Site, type Visit } from "./visit";
 function byTriage(a: Visit, b: Visit): number {
   const at = a.triaged_at ?? "";
   const bt = b.triaged_at ?? "";
+  // Compare the moments themselves, so the order does not depend on how the time is written
+  // ("...09.5+00:00" from the database, "...09.500Z" from a browser).
+  const apart = Date.parse(at) - Date.parse(bt);
+  if (apart < 0 || apart > 0) return apart < 0 ? -1 : 1;
+  // Same millisecond: the database's text keeps finer detail (microseconds), so compare that.
   if (at !== bt) return at < bt ? -1 : 1;
   return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
 }
diff --git a/lib/visit.ts b/lib/visit.ts
index b514d06..e64b125 100644
--- a/lib/visit.ts
+++ b/lib/visit.ts
@@ -49,19 +49,5 @@ export type Visit = {
  */
 export type ChangeResult = "saved" | "refused" | "not_saved";
 
-/** Every status, for checking data read back from storage. */
-export const ALL_STATUSES: VisitStatus[] = [
-  "pre_arrival",
-  "waiting",
-  "called",
-  "on_the_way",
-  "arrived",
-  "unable_to_reach",
-  "needs_reassessment",
-  "removed",
-  "declined",
-  "not_eligible",
-];
-
 /** Statuses that are still in the off-site line (not yet closed). */
 export const ACTIVE_STATUSES: VisitStatus[] = ["waiting", "called", "on_the_way"];
diff --git a/lib/visitActions.ts b/lib/visitActions.ts
index e272aff..1baa302 100644
--- a/lib/visitActions.ts
+++ b/lib/visitActions.ts
@@ -73,6 +73,7 @@ export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Dat
 /**
  * A patient starts a visit from home on the start page: "Checked in from home, not yet triaged".
  * This never gives a place in line (SPEC rule 7); that starts at triage.
+ * In the app the database function start_home_visit does this; this copy is used by the tests.
  */
 export function startFromHome(input: NewVisit, now: Date): Visit {
   return blankVisit(input, "home", now.toISOString());
@@ -96,13 +97,19 @@ export function callBack(visit: Visit, now: Date): Visit | null {
   return { ...visit, status: "called", called_at: now.toISOString() };
 }
 
-/** The called screen was shown on the patient's phone. Sets seen_at once, only while called. */
+/**
+ * The called screen was shown on the patient's phone. Sets seen_at once, only while called.
+ * In the app the database function record_seen does this; this copy is used by the tests.
+ */
 export function markSeen(visit: Visit, now: Date): Visit | null {
   if (visit.status !== "called" || visit.seen_at) return null;
   return { ...visit, seen_at: now.toISOString() };
 }
 
-/** The patient taps "I'm on my way". Only while called. */
+/**
+ * The patient taps "I'm on my way". Only while called.
+ * In the app the database function confirm_on_my_way does this; this copy is used by the tests.
+ */
 export function confirmOnMyWay(visit: Visit, now: Date): Visit | null {
   if (visit.status !== "called") return null;
   return { ...visit, status: "on_the_way", confirmed_at: now.toISOString() };
```

## Deleted files

- data/useStorageProblem.ts
- data/visitStore.test.ts
- data/visitStore.ts
- lib/parseVisits.test.ts
- lib/parseVisits.ts
- lib/patientView.test.ts
