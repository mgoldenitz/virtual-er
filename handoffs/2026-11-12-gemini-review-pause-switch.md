# Handoff: review the "Pause off-site waiting" switch (Phase 3)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) and Supabase (PostgreSQL) concept prototype of a virtual emergency department waiting room. Patients use their own phone with no login; staff sign in. Row-level security lets only signed-in staff read or change `visits` and `site_settings`. Patients (the anon role) can do exactly five narrow things through database functions; starting a visit from home goes through a server route that calls `start_home_visit` with the server-only key, and that function already returns "paused" while the site is paused. Screens re-read data when a one-row change signal is touched (it holds no data), on a timer and when the tab comes back.

SPEC rule: a "Pause off-site waiting" switch per site, for downtime or a contact problem, with a confirmation step. While paused: no new off-site sign-ups (the start-from-home route refuses, and check-in offers on-site waiting only), visits already waiting off-site keep working, and the staff list shows a banner asking staff to check every outstanding call-back and offer on-site waiting. Turning it off needs a second confirmation. While paused, the start page replaces "Start a visit" with "Off-site waiting is paused right now. Please come to the emergency department and wait there."

What was built:
- Database change `20261112010000_site_pause_read.sql`: `grant select (site, offsite_paused) on site_settings to service_role` (the app's server only; anon and authenticated get nothing new), and a before-update trigger that sets `paused_at` to the database's `now()` when paused and empty when resumed.
- `app/api/site-status/route.ts` + `data/siteStatusRead.ts`: GET answers only `{ "A": boolean, "B": boolean }`, no caching, read with the server-only key.
- `lib/sitePause.ts` (strict parsing of rows and of the answer, with tests); `data/sitePauses.ts` (browser store kept fresh; `setSitePaused` for staff saves only if the switch is still as staff saw it).
- Staff: `components/staff/PauseSwitch.tsx` (pause with one confirmation; red banner while paused; resume needs a tick "I have checked that patients can be reached again" and then the button); `CheckInPanel` hides "Start off-site waiting" while paused and refuses it on Enter.
- Start page: `components/start/StartVisit.tsx` replaces the button for a paused site; if both sites are paused the whole start box becomes the paused message.

Checked: 147 unit tests, type check, lint; the owner ran the database change; tested in the browser by the owner (staff) and Claude (start page, phone size): cancel, pause, banner, check-in on-site only, start page message appears live for Site A and not for Site B, resume refused without the tick, resume, start page button back. Not tested: `paused_at` being set (staff screens do not show it yet).

Known choices to judge:
1. Desk check-in has no database check for the pause: a staff screen that has not yet read the switch (or reads it as unknown) still offers "Start off-site waiting". Only the start-from-home route is refused in the database. (Moving allowed-step checks into the database is planned later in Phase 3.)
2. While paused, check-in still offers "Offered, declined" and "Not eligible". Patients who could not be offered because of the pause will be recorded as one of those, which affects the dashboard's "offered" percentage.
3. The start page reads the switch through the server route every minute and on each change signal; if the route fails, the start page acts as if not paused (the start route still refuses).
4. `/api/site-status` needs no sign-in and is not rate limited; it reads two columns of a two-row table.

## Find problems (do not just confirm)

1. Security: does the new grant, route or trigger expose anything or let anyone change the switch who should not? Is using the server-only key for this read acceptable?
2. Correctness: can the start page, staff banner and check-in disagree in a harmful way (stale reads, two staff screens, a failed save)?
3. Safety and wording for staff and patients, in both directions (pausing and resuming).
4. Accessibility: focus handling in the confirmations, the banner, the start page message (role="status"), keyboard use.
5. Anything in the diff that breaks existing behaviour (start a visit from home, check-in, the staff list).
6. The four known choices above: real problem or acceptable for a demo, and the simplest fix.

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff)

```diff
diff --git a/app/api/site-status/route.ts b/app/api/site-status/route.ts
new file mode 100644
index 0000000..772c34d
--- /dev/null
+++ b/app/api/site-status/route.ts
@@ -0,0 +1,18 @@
+// Answers whether off-site waiting is paused at each demo site, for example
+// { "A": false, "B": true }, and nothing else. The start page uses it to hide "Start a visit"
+// while a site is paused; the staff screen uses it to show the switch. It reads no visit.
+
+import { connection } from "next/server";
+import { readSitePauses } from "@/data/siteStatusRead";
+
+export async function GET(): Promise<Response> {
+  await connection(); // read the switch now, never at build time
+  const headers = { "Cache-Control": "no-store" };
+  try {
+    const pauses = await readSitePauses();
+    if (pauses) return Response.json(pauses, { headers });
+  } catch (problem) {
+    console.error("site-status: could not reach the database", problem instanceof Error ? problem.message : "unknown");
+  }
+  return Response.json({ result: "error" }, { status: 500, headers });
+}
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 11032c6..faf7db1 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -4,6 +4,7 @@
 // waiting off-site, and call them back.
 
 import { useEffect, useRef, useState } from "react";
+import { useSitePauses } from "@/data/sitePauses";
 import { reloadVisits } from "@/data/staffActions";
 import { useVisits } from "@/data/useVisits";
 import { homeCheckInProblem } from "@/lib/homeCheckIn";
@@ -11,6 +12,7 @@ import { activeLine } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { CheckInPanel } from "@/components/staff/CheckInPanel";
 import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
+import { PauseSwitch } from "@/components/staff/PauseSwitch";
 import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
 import { RecallAllPanel } from "@/components/staff/RecallAllPanel";
 import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
@@ -24,6 +26,7 @@ import { useNow } from "@/components/useNow";
 export default function StaffPage() {
   const { visits, outOfDate } = useVisits();
   const now = useNow();
+  const { pauses } = useSitePauses();
   const [site, setSite] = useState<Site>("A");
   const [slip, setSlip] = useState<Visit | null>(null);
   const [announcement, setAnnouncement] = useState("");
@@ -53,6 +56,7 @@ export default function StaffPage() {
   };
 
   const line = visits ? activeLine(visits, site) : [];
+  const paused = pauses ? pauses[site] : null;
   // The chosen home visit may have been checked in on another screen, or expired, since staff opened it.
   const homeProblem =
     homeVisit && visits && now
@@ -108,6 +112,7 @@ export default function StaffPage() {
             onCreated={showSlip}
             homeVisit={homeVisit}
             homeProblem={homeProblem}
+            offsitePaused={paused === true}
             onHomeDone={() => setHomeVisit(null)}
           />
           {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
@@ -120,6 +125,7 @@ export default function StaffPage() {
           <p role="status" className="min-h-6 font-semibold">
             {announcement}
           </p>
+          <PauseSwitch key={`pause-${site}`} site={site} paused={paused} offSiteCount={line.length} onResult={setAnnouncement} />
           {visits && <RecallAllPanel key={`recall-${site}`} visits={visits} site={site} onResult={(message, closed) => (closed ? onLeftList(message) : setAnnouncement(message))} />}
           {visits === null || now === null ? (
             <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 4c4ad2f..81984ad 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -28,9 +28,11 @@ type Props = {
   homeProblem: string | null;
   /** Leave the home visit: after it is checked in, or when staff cancel. */
   onHomeDone: () => void;
+  /** Off-site waiting is paused at this site: check-in offers on-site waiting only. */
+  offsitePaused: boolean;
 };
 
-export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProblem, onHomeDone }: Props) {
+export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProblem, onHomeDone, offsitePaused }: Props) {
   const [ctas, setCtas] = useState<4 | 5 | null>(null);
   const [ticked, setTicked] = useState<Record<string, boolean>>({});
   const [language, setLanguage] = useState("en");
@@ -94,6 +96,10 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
       setMessage("Choose CTAS 4 or 5 first.");
       return;
     }
+    if (outcome === "waiting" && offsitePaused) {
+      setMessage("Off-site waiting is paused at this site. Record the patient as waiting on-site.");
+      return;
+    }
     if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
       setMessage("Tick all three checklist items to start off-site waiting.");
       return;
@@ -196,9 +202,15 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
 
       {!homeProblem && (
         <div className="flex flex-wrap gap-3">
-          <Button type="submit" aria-disabled={saving}>
-            Start off-site waiting
-          </Button>
+          {offsitePaused ? (
+            <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
+              Off-site waiting is paused at this site: the patient waits on-site.
+            </p>
+          ) : (
+            <Button type="submit" aria-disabled={saving}>
+              Start off-site waiting
+            </Button>
+          )}
           <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
             Offered, declined
           </Button>
diff --git a/components/staff/PauseSwitch.tsx b/components/staff/PauseSwitch.tsx
new file mode 100644
index 0000000..d12285e
--- /dev/null
+++ b/components/staff/PauseSwitch.tsx
@@ -0,0 +1,151 @@
+"use client";
+
+// The "Pause off-site waiting" switch for one site (SPEC /staff), for downtime or a contact
+// problem. Pausing needs one confirmation. While paused, a banner asks staff to check every
+// outstanding recall and offer on-site waiting. Turning it back on needs a second, separate
+// confirmation: a tick that patients can be reached again, then the button.
+
+import { useEffect, useRef, useState } from "react";
+import { setSitePaused } from "@/data/sitePauses";
+import type { ChangeResult, Site } from "@/lib/visit";
+import { Button } from "@/components/Button";
+
+type Props = {
+  site: Site;
+  /** The switch as last read, or null if it could not be read yet. */
+  paused: boolean | null;
+  /** Patients still in the off-site line at this site (waiting or recalled). */
+  offSiteCount: number;
+  /** Called with words for staff and screen readers after each change. */
+  onResult: (message: string) => void;
+};
+
+type Mode = "idle" | "confirmPause" | "confirmResume";
+
+const people = (n: number) => `${n} ${n === 1 ? "patient" : "patients"}`;
+
+export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
+  const [mode, setMode] = useState<Mode>("idle");
+  const [checked, setChecked] = useState(false);
+  const [saving, setSaving] = useState(false);
+  const [note, setNote] = useState("");
+  const heading = useRef<HTMLHeadingElement>(null);
+  const question = useRef<HTMLHeadingElement>(null);
+
+  // Keyboard and screen-reader users land on each confirmation question when it opens.
+  useEffect(() => {
+    if (mode !== "idle") question.current?.focus();
+  }, [mode]);
+
+  if (paused === null) {
+    return <p className="text-sm text-slate-700">Checking whether off-site waiting is paused at this site…</p>;
+  }
+
+  const close = () => {
+    setMode("idle");
+    setChecked(false);
+    setNote("");
+    window.setTimeout(() => heading.current?.focus(), 0);
+  };
+
+  const save = async (pause: boolean) => {
+    if (saving) return;
+    if (!pause && !checked) {
+      setNote("Tick the box first to confirm patients can be reached again.");
+      return;
+    }
+    setSaving(true);
+    const result: ChangeResult = await setSitePaused(site, pause);
+    setSaving(false);
+    if (result === "not_saved") {
+      setNote("Not saved: the database could not be reached. Nothing changed. Try again.");
+      return;
+    }
+    if (result === "refused") {
+      onResult(`Another screen already ${pause ? "paused" : "resumed"} off-site waiting at Demo Site ${site}.`);
+    } else {
+      onResult(
+        pause
+          ? `Off-site waiting paused at Demo Site ${site}. Check every outstanding recall.`
+          : `Off-site waiting is back on at Demo Site ${site}.`,
+      );
+    }
+    close();
+  };
+
+  return (
+    <section aria-labelledby={`pause-heading-${site}`} className="space-y-2" data-testid="pause-switch">
+      <h3 id={`pause-heading-${site}`} ref={heading} tabIndex={-1} className="sr-only">
+        Off-site waiting switch, Demo Site {site}
+      </h3>
+
+      {paused && (
+        <div className="space-y-2 rounded-xl border-4 border-red-800 bg-red-50 p-4 text-red-950" data-testid="paused-banner">
+          <p className="text-lg font-bold">Off-site waiting is paused at Demo Site {site}.</p>
+          <p>
+            No new off-site sign-ups: the start page sends patients to the emergency department, and check-in offers
+            on-site waiting only. Check every outstanding recall, and offer on-site waiting to the{" "}
+            {people(offSiteCount)} still off-site.
+          </p>
+          {mode === "idle" && (
+            <Button variant="secondary" onClick={() => setMode("confirmResume")}>
+              Turn off-site waiting back on…
+            </Button>
+          )}
+        </div>
+      )}
+
+      {!paused && mode === "idle" && (
+        <Button variant="secondary" onClick={() => setMode("confirmPause")}>
+          Pause off-site waiting at Demo Site {site}…
+        </Button>
+      )}
+
+      {mode === "confirmPause" && (
+        <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="pause-confirm">
+          <h4 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
+            Pause off-site waiting at Demo Site {site}?
+          </h4>
+          <p>
+            Use this for downtime or a contact problem. New patients will wait on-site. The {people(offSiteCount)}{" "}
+            already off-site keep their visits, and you will be asked to check each one.
+          </p>
+          <div className="flex flex-wrap gap-2">
+            <Button variant="danger" aria-disabled={saving} onClick={() => save(true)}>
+              {saving ? "Saving…" : "Yes, pause off-site waiting"}
+            </Button>
+            <Button variant="secondary" aria-disabled={saving} onClick={close}>
+              Cancel
+            </Button>
+          </div>
+        </div>
+      )}
+
+      {mode === "confirmResume" && (
+        <div className="space-y-3 rounded-xl border-4 border-slate-700 bg-white p-4" data-testid="resume-confirm">
+          <h4 ref={question} tabIndex={-1} className="text-lg font-bold">
+            Turn off-site waiting back on at Demo Site {site}?
+          </h4>
+          <label className="flex min-h-11 items-center gap-3">
+            <input type="checkbox" className="size-5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
+            I have checked that patients can be reached again (phones and this app work).
+          </label>
+          <div className="flex flex-wrap gap-2">
+            <Button aria-disabled={saving || !checked} onClick={() => save(false)}>
+              {saving ? "Saving…" : "Yes, turn it back on"}
+            </Button>
+            <Button variant="secondary" aria-disabled={saving} onClick={close}>
+              Cancel
+            </Button>
+          </div>
+        </div>
+      )}
+
+      {note && (
+        <p role="alert" className="font-semibold text-red-800">
+          {note}
+        </p>
+      )}
+    </section>
+  );
+}
diff --git a/components/start/StartVisit.tsx b/components/start/StartVisit.tsx
index 1db69f6..a7a8bcc 100644
--- a/components/start/StartVisit.tsx
+++ b/components/start/StartVisit.tsx
@@ -3,13 +3,15 @@
 // The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
 // this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
 // has a visit, it shows that one first (open, ended or expired), and never offers a new one
-// while the saved visit cannot be read.
+// while the saved visit cannot be read. While staff have paused off-site waiting at a site,
+// "Start a visit" for that site is replaced by the SPEC's paused message.
 
 import Link from "next/link";
 import { useRouter } from "next/navigation";
 import { useState, useSyncExternalStore } from "react";
 import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
 import { loadSavedToken } from "@/data/savedToken";
+import { useSitePauses } from "@/data/sitePauses";
 import { startPageState } from "@/lib/startPage";
 import { fill, textFor } from "@/lib/text";
 import type { Site } from "@/lib/visit";
@@ -29,6 +31,7 @@ export function StartVisit({ language }: { language: string }) {
   const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
   const [starting, setStarting] = useState(false);
   const [wantsNew, setWantsNew] = useState(false);
+  const { pauses } = useSitePauses();
   const state = startPageState(saved);
   const t = textFor(language);
   const s = t.start;
@@ -108,6 +111,19 @@ export function StartVisit({ language }: { language: string }) {
     );
   }
 
+  // Both sites paused: no start box at all, only the message (the start route refuses anyway).
+  if (pauses?.A && pauses?.B) {
+    return (
+      <section aria-labelledby="start-heading" className={boxStyle} data-testid="start-paused">
+        <h2 id="start-heading" className="text-xl font-bold">
+          {t.pausedHeading}
+        </h2>
+        <p>{s.paused}</p>
+      </section>
+    );
+  }
+  const sitePaused = pauses?.[site] === true;
+
   const start = async () => {
     if (starting) return; // a second tap while the first is on its way must not start two visits
     setStarting(true);
@@ -147,9 +163,15 @@ export function StartVisit({ language }: { language: string }) {
           ))}
         </div>
       </fieldset>
-      <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
-        {starting ? s.starting : s.startButton}
-      </Button>
+      {sitePaused ? (
+        <p role="status" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900" data-testid="site-paused">
+          {s.paused}
+        </p>
+      ) : (
+        <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
+          {starting ? s.starting : s.startButton}
+        </Button>
+      )}
       {problem && (
         <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
           {problemText[problem]}
diff --git a/data/sitePauses.ts b/data/sitePauses.ts
new file mode 100644
index 0000000..e766df3
--- /dev/null
+++ b/data/sitePauses.ts
@@ -0,0 +1,73 @@
+// Whether off-site waiting is paused at each site, kept up to date for the start page and the
+// staff screen: read from /api/site-status now, on every live update, when the tab comes back,
+// and every minute. Staff turn the switch on or off with setSitePaused.
+
+import { useSyncExternalStore } from "react";
+import { parseSitePauses, type SitePauses } from "@/lib/sitePause";
+import type { ChangeResult, Site } from "@/lib/visit";
+import { keepFresh } from "./keepFresh";
+import { supabaseBrowser } from "./supabaseBrowser";
+
+/** `pauses` is null until the first read works; `failed` is true when the last read failed. */
+export type PauseState = { pauses: SitePauses | null; failed: boolean };
+
+const EMPTY: PauseState = { pauses: null, failed: false };
+const REREAD_MS = 60_000;
+
+let state: PauseState = EMPTY;
+let stopReading: (() => void) | null = null;
+const listeners = new Set<() => void>();
+
+function show(next: PauseState): void {
+  if (next.failed === state.failed && JSON.stringify(next.pauses) === JSON.stringify(state.pauses)) return;
+  state = next;
+  listeners.forEach((tell) => tell());
+}
+
+async function load(): Promise<void> {
+  try {
+    const answer = await fetch("/api/site-status", { cache: "no-store" });
+    const pauses = answer.ok ? parseSitePauses(await answer.json()) : null;
+    show(pauses ? { pauses, failed: false } : { pauses: state.pauses, failed: true });
+  } catch {
+    show({ pauses: state.pauses, failed: true });
+  }
+}
+
+function watch(onChange: () => void): () => void {
+  listeners.add(onChange);
+  if (!stopReading) stopReading = keepFresh(load, () => state.failed, REREAD_MS);
+  return () => {
+    listeners.delete(onChange);
+    if (listeners.size === 0 && stopReading) {
+      stopReading();
+      stopReading = null;
+    }
+  };
+}
+
+/** React hook: the pause switch for both sites, kept up to date. */
+export function useSitePauses(): PauseState {
+  return useSyncExternalStore(watch, () => state, () => EMPTY);
+}
+
+/**
+ * Staff only (row-level security): pause or resume off-site waiting at one site. Saves only if
+ * the switch is still as staff saw it, so two screens cannot undo each other's change unseen.
+ * The database sets paused_at itself.
+ */
+export async function setSitePaused(site: Site, paused: boolean): Promise<ChangeResult> {
+  try {
+    const { data, error } = await supabaseBrowser()
+      .from("site_settings")
+      .update({ offsite_paused: paused })
+      .eq("site", site)
+      .eq("offsite_paused", !paused)
+      .select("site");
+    void load();
+    if (error || !Array.isArray(data)) return "not_saved";
+    return data.length === 1 ? "saved" : "refused";
+  } catch {
+    return "not_saved";
+  }
+}
diff --git a/data/siteStatusRead.ts b/data/siteStatusRead.ts
new file mode 100644
index 0000000..3c31a81
--- /dev/null
+++ b/data/siteStatusRead.ts
@@ -0,0 +1,17 @@
+// Server only: reads whether off-site waiting is paused at each site, for /api/site-status.
+// It reads only the site letter and the switch from site_settings (staff-only in the database),
+// using the server's own connection, so browsers learn the switch without any database access.
+
+import "server-only";
+import { sitePausesFromRows, type SitePauses } from "@/lib/sitePause";
+import { supabaseServer } from "./supabaseServer";
+
+/** Both sites' switches, or null if the database could not be read. */
+export async function readSitePauses(): Promise<SitePauses | null> {
+  const { data, error } = await supabaseServer().from("site_settings").select("site, offsite_paused");
+  if (error) {
+    console.error("site-status: database refused", { code: error.code, message: error.message });
+    return null;
+  }
+  return sitePausesFromRows(data);
+}
diff --git a/data/supabaseServer.ts b/data/supabaseServer.ts
index 15fed28..88871d7 100644
--- a/data/supabaseServer.ts
+++ b/data/supabaseServer.ts
@@ -1,6 +1,6 @@
 // The Supabase connection that uses the secret key. It runs only on the server (the first
-// line makes the build fail if a browser file ever imports it), and only the start-a-visit
-// route uses it. The secret key is read from .env.local (or Vercel's settings), never from code.
+// line makes the build fail if a browser file ever imports it). Only the start-a-visit route
+// and the site-status route (data/siteStatusRead.ts) use it. The secret key is read from .env.local (or Vercel's settings), never from code.
 
 import "server-only";
 import { createClient, type SupabaseClient } from "@supabase/supabase-js";
diff --git a/lib/sitePause.test.ts b/lib/sitePause.test.ts
new file mode 100644
index 0000000..814f02e
--- /dev/null
+++ b/lib/sitePause.test.ts
@@ -0,0 +1,30 @@
+// Checks how the pause switch is read from database rows and from the server's answer.
+
+import { describe, expect, it } from "vitest";
+import { parseSitePauses, sitePausesFromRows } from "./sitePause";
+
+describe("sitePausesFromRows", () => {
+  it("reads both sites", () => {
+    expect(
+      sitePausesFromRows([
+        { site: "A", offsite_paused: true },
+        { site: "B", offsite_paused: false },
+      ]),
+    ).toEqual({ A: true, B: false });
+  });
+
+  it("refuses a missing site or a wrong value", () => {
+    expect(sitePausesFromRows([{ site: "A", offsite_paused: true }])).toBeNull();
+    expect(sitePausesFromRows([{ site: "A", offsite_paused: "yes" }, { site: "B", offsite_paused: false }])).toBeNull();
+    expect(sitePausesFromRows(null)).toBeNull();
+  });
+});
+
+describe("parseSitePauses", () => {
+  it("accepts only { A: boolean, B: boolean }", () => {
+    expect(parseSitePauses({ A: false, B: true })).toEqual({ A: false, B: true });
+    expect(parseSitePauses({ A: false })).toBeNull();
+    expect(parseSitePauses({ A: "false", B: true })).toBeNull();
+    expect(parseSitePauses(null)).toBeNull();
+  });
+});
diff --git a/lib/sitePause.ts b/lib/sitePause.ts
new file mode 100644
index 0000000..7dc0173
--- /dev/null
+++ b/lib/sitePause.ts
@@ -0,0 +1,28 @@
+// The "Pause off-site waiting" switch per site (SPEC /staff): which sites are paused, read
+// from the database's site_settings rows on the server and from /api/site-status in browsers.
+// While a site is paused: no new off-site sign-ups there; visits already off-site keep working.
+
+import type { Site } from "./visit";
+
+/** True for each site where off-site waiting is paused. */
+export type SitePauses = Record<Site, boolean>;
+
+const SITES: Site[] = ["A", "B"];
+
+/** From the database rows (site, offsite_paused); null unless both demo sites are present. */
+export function sitePausesFromRows(rows: unknown): SitePauses | null {
+  if (!Array.isArray(rows)) return null;
+  const found: Partial<SitePauses> = {};
+  for (const row of rows) {
+    const r = row as { site?: unknown; offsite_paused?: unknown };
+    if ((r.site === "A" || r.site === "B") && typeof r.offsite_paused === "boolean") found[r.site] = r.offsite_paused;
+  }
+  return SITES.every((s) => typeof found[s] === "boolean") ? (found as SitePauses) : null;
+}
+
+/** From the /api/site-status answer; null if it is not exactly { A: boolean, B: boolean }. */
+export function parseSitePauses(body: unknown): SitePauses | null {
+  if (!body || typeof body !== "object") return null;
+  const b = body as Record<string, unknown>;
+  return typeof b.A === "boolean" && typeof b.B === "boolean" ? { A: b.A, B: b.B } : null;
+}
diff --git a/supabase/checks/permissions.sql b/supabase/checks/permissions.sql
index eab2182..d9c1ef5 100644
--- a/supabase/checks/permissions.sql
+++ b/supabase/checks/permissions.sql
@@ -3,8 +3,9 @@
 -- the public schema. Compare the result with the expected list below; anything extra is
 -- a hole to fix before going on. Update the expected list only on purpose.
 --
--- Expected after Phase 3's pause safety limit (20261111200000_pause_safety_limit.sql; its
--- trigger function visits_limit_pause is callable by nobody, so the list is unchanged):
+-- Expected after Phase 3's site pause read (20261112010000_site_pause_read.sql; it gives
+-- only service_role, the app's server, a read of two site_settings columns, and its trigger
+-- function site_settings_before_update is callable by nobody, so the list is unchanged):
 --   anon           table     change_signal       SELECT
 --   anon           function  confirm_on_my_way   EXECUTE
 --   anon           function  get_patient_visit   EXECUTE
diff --git a/supabase/migrations/20261112010000_site_pause_read.sql b/supabase/migrations/20261112010000_site_pause_read.sql
new file mode 100644
index 0000000..bec651d
--- /dev/null
+++ b/supabase/migrations/20261112010000_site_pause_read.sql
@@ -0,0 +1,34 @@
+-- Phase 3: the "Pause off-site waiting" switch (SPEC /staff and /).
+-- 1. The app's server (the service_role connection, used only by server routes) may read the
+--    site letter and the switch, so /api/site-status can tell the start page to hide
+--    "Start a visit" while a site is paused. Patients (anon) and staff (authenticated) get
+--    no new rights; staff already read and change site_settings under row-level security.
+-- 2. The database sets paused_at itself: now() when a site is paused, empty when it is turned
+--    back on, so no device clock decides it.
+
+grant select (site, offsite_paused) on table public.site_settings to service_role;
+
+create function public.site_settings_before_update()
+returns trigger
+language plpgsql
+security invoker
+set search_path = ''
+as $$
+begin
+  if new.offsite_paused and not old.offsite_paused then
+    new.paused_at := now();
+  elsif not new.offsite_paused then
+    new.paused_at := null;
+  else
+    new.paused_at := old.paused_at;
+  end if;
+  return new;
+end;
+$$;
+
+-- Only the trigger runs it; nobody can call it directly.
+revoke execute on function public.site_settings_before_update() from public, anon, authenticated;
+
+create trigger site_settings_before_update
+  before update on public.site_settings
+  for each row execute function public.site_settings_before_update();
```
