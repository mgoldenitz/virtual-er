# Gemini review: four fixes from the focus fixes and wait gap SQL reviews

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste

You review four small changes in a Next.js App Router and React 19 prototype of a virtual ER waiting room, with Supabase Postgres (synthetic data only). Find problems. Do not confirm that the changes are good. For each problem, give the file, the steps that make it happen, and the smallest fix. The full diff is below the questions.

Background. On the patient screen, `useReportFocusOnLeave(ref, onLost)` calls `onLost` in a layout-effect cleanup when a part leaves while focus is inside it. `useRescueFocus(targetId, lostRef)` then moves focus to `#status-heading` if `lostRef.current` is true and focus is on nothing that is still on the page. `PatientStatus` and `SoundSwitch` share one `lostFocus` ref. `get_patient_visit` gives a `waiting` patient `average_gap_minutes`: the average gap between the newest 6 distinct call-back moments of the last 3 hours at the site, null with fewer than 2 moments or when the status is not `waiting`.

The four changes:
1. Focus guard: `useRescueFocus` lost its `trigger` argument. Its effect now has no dependency list and runs after every render, so a report is used in the same change that made it, not at a later status change. Callers: `PatientStatus.tsx`, `StillHerePrompt.tsx`.
2. SQL check file `supabase/checks/wait_gap.sql`: the SQL Editor shows only the last result, so the file keeps the first results in a temp table and shows 4 rows at the end. New case 3: site B with 7 distinct moments (20, 30, 40, 60, 80, 100, 170 minutes ago); expected 16 (newest 6). New case 4: a site A patient with status `arrived`; expected null.
3. A new test in `SoundSwitch.repeat.click.test.tsx`: the beep fails while the phone is locked (no change), the phone unlocks, the second beep fails while the page is on screen; "Turn on sound" must come back and get focus.
4. `StatusAndSound.tsx` is a new part with the status frame, `PatientStatus`, `SoundSwitch` and the shared flag, moved out of `app/patient/page.tsx`. `PatientStatus.sound.click.test.tsx` now renders this part, so it checks the real wiring.

Questions:
1. Can an effect that runs after every render move focus when it should not, for example when a render comes from the clock (`useNow`), the live update, or the still-here prompt, while the patient is on another button or reading with a screen reader? Can `StillHerePrompt` and `PatientStatus`, which both run the effect, take one report twice or fight?
2. Do the expected numbers in the SQL check follow from the function in the diff? Can the check pass with a wrong function (for example, one that takes the oldest 6, or one that ignores the status)?
3. Can the new beep test pass while the bug it guards against is there?
4. Does `StatusAndSound` change what the page shows, the order of parts, or what a screen reader reads? Is anything left in `app/patient/page.tsx` that the new part should own?
5. Is there a simpler way to reach any of the four goals?

## The diff (`git diff 12583ec..5346d13 -- components app supabase`)

```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index 3f3d7c4..0894b14 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -3,7 +3,7 @@
 // The patient screen on the patient's own phone: opens the visit from the link's token
 // (or the one saved on this phone) and updates live.
 
-import { useEffect, useRef, useState } from "react";
+import { useEffect, useState } from "react";
 import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
 import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
 import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
@@ -12,8 +12,7 @@ import { EmergencyLine } from "@/components/EmergencyLine";
 import { LanguageSwitch } from "@/components/LanguageSwitch";
 import { PatientShell } from "@/components/PatientShell";
 import { OfflineBanner } from "@/components/patient/OfflineBanner";
-import { PatientStatus } from "@/components/patient/PatientStatus";
-import { SoundSwitch } from "@/components/patient/SoundSwitch";
+import { StatusAndSound } from "@/components/patient/StatusAndSound";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
 import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
 import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
@@ -28,8 +27,6 @@ export default function PatientPage() {
   const [sending, setSending] = useState(false);
   const chosenLanguage = useChosenLanguage();
   const online = useOnline();
-  // True when the sound box left the page with focus inside it; the status screen then moves focus.
-  const lostFocus = useRef(false);
 
   // Reading the link and browser storage can only happen in the browser, after the first render.
   // A new link opened on this same page (only the #t=... part changes) switches to that visit.
@@ -135,19 +132,7 @@ export default function PatientPage() {
             · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
           </p>
           {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
-          {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
-          <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
-            <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
-          </div>
-          {(view.status === "waiting" || view.status === "called") && (
-            <SoundSwitch
-              status={view.status}
-              language={language}
-              onFocusLost={() => {
-                lostFocus.current = true;
-              }}
-            />
-          )}
+          <StatusAndSound view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
               {p.notSaved}
diff --git a/components/patient/PatientStatus.click.test.tsx b/components/patient/PatientStatus.click.test.tsx
index e8e0fc2..35aaa08 100644
--- a/components/patient/PatientStatus.click.test.tsx
+++ b/components/patient/PatientStatus.click.test.tsx
@@ -91,4 +91,20 @@ describe("PatientStatus focus", () => {
     );
     expect(document.activeElement).toBe(heading());
   });
+
+  it("moves focus to the heading in the same change when a part leaves with focus but the status stays", () => {
+    const lost = { current: false };
+    const render = (sending: boolean) =>
+      act(() =>
+        root.render(<PatientStatus view={view} language="en" onOnMyWay={() => {}} sending={sending} lostFocus={lost} />),
+      );
+    render(false);
+    // A part below left with focus inside it, in a change that keeps the status at called.
+    lost.current = true;
+    (document.activeElement as HTMLElement | null)?.blur();
+    render(true);
+    // The report is used now, not kept for a later status change.
+    expect(lost.current).toBe(false);
+    expect(document.activeElement).toBe(heading());
+  });
 });
diff --git a/components/patient/PatientStatus.sound.click.test.tsx b/components/patient/PatientStatus.sound.click.test.tsx
index fbe360b..af193d4 100644
--- a/components/patient/PatientStatus.sound.click.test.tsx
+++ b/components/patient/PatientStatus.sound.click.test.tsx
@@ -1,16 +1,15 @@
 // @vitest-environment happy-dom
-// Checks the status screen and the sound box together, as app/patient/page.tsx puts them:
-// one shared flag, so focus goes to the status heading when the sound box leaves with focus inside.
+// Checks the status screen and the sound box together, through StatusAndSound, the part the page
+// uses: one shared flag, so focus goes to the status heading when the sound box leaves with focus inside.
 
-import { act, useRef } from "react";
+import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import type { PatientView } from "@/lib/patientView";
 import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
 import { playAlert, stopVibration, unlockSound } from "./alertSound";
-import { PatientStatus } from "./PatientStatus";
-import { SoundSwitch } from "./SoundSwitch";
+import { StatusAndSound } from "./StatusAndSound";
 
 // Replace the real sound player, so no real sound plays in the test.
 vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
@@ -36,23 +35,9 @@ const view: PatientView = {
   expired: false,
 };
 
-/** The same parts and the same shared flag as the patient page. */
-function Page({ status }: { status: VisitStatus }) {
-  const lostFocus = useRef(false);
-  return (
-    <>
-      <PatientStatus view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lostFocus} />
-      {(status === "waiting" || status === "called") && (
-        <SoundSwitch
-          status={status}
-          language="en"
-          onFocusLost={() => {
-            lostFocus.current = true;
-          }}
-        />
-      )}
-    </>
-  );
+/** The status screen and the sound box, as the patient page shows them. */
+function Page({ status, online = true }: { status: VisitStatus; online?: boolean }) {
+  return <StatusAndSound view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} online={online} />;
 }
 
 let container: HTMLDivElement;
@@ -88,4 +73,12 @@ describe("PatientStatus with the sound box", () => {
     expect(heading?.textContent).toBe(t.patient.arrivedHeading);
     expect(document.activeElement).toBe(heading);
   });
+
+  it("puts the status in a dashed frame only while the phone is offline", () => {
+    const frame = () => container.querySelector('[data-testid="status-frame"]');
+    act(() => root.render(<Page status="waiting" online={false} />));
+    expect(frame()?.className).toContain("border-dashed");
+    act(() => root.render(<Page status="waiting" />));
+    expect(frame()?.className).toBe("");
+  });
 });
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index bae1c2e..212e28b 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -150,7 +150,7 @@ export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }:
   // The page's flag when it gives one (the sound box sets it too), otherwise this screen's own.
   const ownFlag = useRef(false);
   // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
-  const markLost = useRescueFocus("status-heading", `${view.expired}-${view.status}`, lostFocus ?? ownFlag);
+  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
   const kind = viewKind(view);
   return (
     <ViewBox key={kind} onFocusLost={markLost}>
diff --git a/components/patient/SoundSwitch.repeat.click.test.tsx b/components/patient/SoundSwitch.repeat.click.test.tsx
index 97abb84..432b4a2 100644
--- a/components/patient/SoundSwitch.repeat.click.test.tsx
+++ b/components/patient/SoundSwitch.repeat.click.test.tsx
@@ -95,4 +95,22 @@ describe("SoundSwitch repeat beep", () => {
     await act(async () => document.dispatchEvent(new Event("visibilitychange")));
     expect(playAlert).toHaveBeenCalledTimes(2);
   });
+
+  it("brings back Turn on sound, with focus, when the beep after the unlock fails too", async () => {
+    const beep = await soundOnWhileCalled();
+    // Focus is on the words "Sound is on", inside the box.
+    expect(document.activeElement).toBe(container.querySelector("[data-testid='sound-on']"));
+    hidePage(true);
+    await act(async () => beep.finish(false));
+    const second = later<boolean>();
+    vi.mocked(playAlert).mockReturnValue(second.promise);
+    hidePage(false);
+    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
+    expect(playAlert).toHaveBeenCalledTimes(2);
+    // The second beep fails while the page is on screen, so the sound goes off.
+    await act(async () => second.finish(false));
+    expect(button(t.turnOn)).toBeDefined();
+    expect(container.querySelector("[data-testid='sound-on']")).toBeNull();
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
 });
diff --git a/components/patient/StatusAndSound.tsx b/components/patient/StatusAndSound.tsx
new file mode 100644
index 0000000..820f8c4
--- /dev/null
+++ b/components/patient/StatusAndSound.tsx
@@ -0,0 +1,41 @@
+"use client";
+
+// The status screen and the sound box of the patient page, with the one flag they share: when the
+// sound box leaves the page with focus inside it, the status screen moves focus to its heading.
+// The page and the click test both use this part, so the test checks the real wiring.
+
+import { useRef } from "react";
+import type { PatientView } from "@/lib/patientView";
+import { PatientStatus } from "./PatientStatus";
+import { SoundSwitch } from "./SoundSwitch";
+
+type Props = {
+  view: PatientView;
+  language: string;
+  onOnMyWay: () => void;
+  sending: boolean;
+  /** False when the phone is offline: a dashed frame then shows the status may be old. */
+  online: boolean;
+};
+
+export function StatusAndSound({ view, language, onOnMyWay, sending, online }: Props) {
+  // True when the sound box left the page with focus inside it; the status screen then moves focus.
+  const lostFocus = useRef(false);
+  return (
+    <>
+      {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
+      <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
+        <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
+      </div>
+      {(view.status === "waiting" || view.status === "called") && (
+        <SoundSwitch
+          status={view.status}
+          language={language}
+          onFocusLost={() => {
+            lostFocus.current = true;
+          }}
+        />
+      )}
+    </>
+  );
+}
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index ead6c7b..a0de237 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -26,7 +26,7 @@ export function StillHerePrompt({ view, token, language }: { view: PatientView;
   const showing = state !== "not_due";
   // If the prompt leaves with focus inside it (after the tap), focus goes to the status heading.
   const lostFocus = useRef(false);
-  const markLost = useRescueFocus("status-heading", showing, lostFocus);
+  const markLost = useRescueFocus("status-heading", lostFocus);
 
   // Tell screen readers once each time the prompt appears (politely; it is not urgent).
   useEffect(() => {
diff --git a/components/patient/useFocusRescue.click.test.tsx b/components/patient/useFocusRescue.click.test.tsx
index 6deade0..149051d 100644
--- a/components/patient/useFocusRescue.click.test.tsx
+++ b/components/patient/useFocusRescue.click.test.tsx
@@ -23,7 +23,7 @@ function Part({ lostRef }: { lostRef: RefObject<boolean> }) {
 }
 
 function Screen({ show, lost }: { show: boolean; lost: RefObject<boolean> }) {
-  useRescueFocus("status-heading", show, lost);
+  useRescueFocus("status-heading", lost);
   return (
     <>
       <h2 id="status-heading" tabIndex={-1}>
diff --git a/components/patient/useFocusRescue.ts b/components/patient/useFocusRescue.ts
index 45862e7..c3484ee 100644
--- a/components/patient/useFocusRescue.ts
+++ b/components/patient/useFocusRescue.ts
@@ -25,12 +25,14 @@ export function useReportFocusOnLeave(part: RefObject<HTMLElement | null>, onLos
 }
 
 /**
- * After each change of trigger: if a part reported lost focus (lost.current is true), focus goes to
- * the element with this id. Focus that is still on a button that stays, or on the page body after
- * a phone tap, does not move, so the page does not scroll.
+ * After each render: if a part reported lost focus (lost.current is true), focus goes to the element
+ * with this id. Focus that is still on a button that stays, or on the page body after a phone tap,
+ * does not move, so the page does not scroll.
+ * It runs after every render, not only when the status changes, so a report is used in the same
+ * change that made it and never waits to move focus at a later, unrelated change.
  * Gives back markLost, for a part that left with focus inside it.
  */
-export function useRescueFocus(targetId: string, trigger: unknown, lostRef: RefObject<boolean>): () => void {
+export function useRescueFocus(targetId: string, lostRef: RefObject<boolean>): () => void {
   useEffect(() => {
     if (!lostRef.current) return;
     lostRef.current = false;
@@ -38,7 +40,7 @@ export function useRescueFocus(targetId: string, trigger: unknown, lostRef: RefO
     if (!focusIsOnNobody() && document.activeElement?.isConnected) return;
     const target = document.getElementById(targetId);
     if (target) target.focus({ preventScroll: true });
-  }, [targetId, trigger, lostRef]);
+  });
   return () => {
     lostRef.current = true;
   };
diff --git a/supabase/checks/wait_gap.sql b/supabase/checks/wait_gap.sql
index e51f0dd..730a042 100644
--- a/supabase/checks/wait_gap.sql
+++ b/supabase/checks/wait_gap.sql
@@ -1,4 +1,6 @@
 -- Check for the wait gap in get_patient_visit (migration 20261116000000_wait_gap_distinct_moments.sql).
+-- Run the whole file at once (do not select and run one part): the Editor shows only the last
+-- result, so the file keeps the first results in a temp table and shows all rows at the end.
 -- Run it in the Supabase SQL Editor after that migration. It saves nothing: everything happens
 -- inside "begin ... rollback", so the synthetic visits, the paused trigger and the cleared
 -- call-back times all go away at the end.
@@ -7,13 +9,19 @@
 -- check could not put call-backs at different times. Why real call-back times are cleared:
 -- real call-backs at the same site would change the average.
 --
--- Expected result (2 rows):
---   site A  average_gap_minutes = 25
+-- Expected result (4 rows):
+--   1 site A  average_gap_minutes = 25
 --     Moments 60, 40 and 10 minutes ago count. The "Recall all" of 3 visits 60 minutes ago is
 --     one moment, and the call-back 4 hours ago is too old. 3 moments give 2 gaps: (60 - 10) / 2 = 25.
 --     The old function gave 46 here: (240 - 10) / 5.
---   site B  average_gap_minutes = null
+--   2 site B  average_gap_minutes = null
 --     Only one distinct moment (a "Recall all" of 2 visits), so the phone uses 15 minutes per place.
+--   3 site B, 7 moments  average_gap_minutes = 16
+--     6 more call-backs at 20, 40, 60, 80, 100 and 170 minutes ago, next to the one at 30.
+--     Only the newest 6 moments count: (100 - 20) / 5 = 16. The oldest 6 would give
+--     (170 - 30) / 5 = 28, and no limit would give (170 - 20) / 6 = 25.
+--   4 site A, not waiting  average_gap_minutes = null
+--     A patient who already arrived gets no wait gap, even with call-backs at the site.
 
 begin;
 
@@ -34,12 +42,32 @@ insert into public.visits (code, access_token, site, source, status, triaged_at,
   ('ZZZZ3B', 'ZZZZZZZZZZZZZZZZZZZZZZZZB1', 'B', 'desk', 'arrived', now() - interval '2 hours', now() - interval '30 minutes'),
   ('ZZZZ3C', 'ZZZZZZZZZZZZZZZZZZZZZZZZB2', 'B', 'desk', 'arrived', now() - interval '2 hours', now() - interval '30 minutes');
 
-select v.site, v.average_gap_minutes
-from (
-  select * from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZA0')
-  union all
-  select * from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0')
-) v
-order by v.site;
+-- Rows 1 and 2, kept until the end (the temp table goes away with the rollback).
+create temp table wait_gap_rows as
+select '1 site A' as check_case, v.average_gap_minutes
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZA0') v
+union all
+select '2 site B', v.average_gap_minutes
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0') v;
+
+insert into public.visits (code, access_token, site, source, status, triaged_at, called_at) values
+  -- Site B: 6 more call-backs, so 7 distinct moments in all (row 3).
+  ('ZZZZ3D', 'ZZZZZZZZZZZZZZZZZZZZZZZZB3', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '20 minutes'),
+  ('ZZZZ3E', 'ZZZZZZZZZZZZZZZZZZZZZZZZB4', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '40 minutes'),
+  ('ZZZZ3F', 'ZZZZZZZZZZZZZZZZZZZZZZZZB5', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '60 minutes'),
+  ('ZZZZ3G', 'ZZZZZZZZZZZZZZZZZZZZZZZZB6', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '80 minutes'),
+  ('ZZZZ3H', 'ZZZZZZZZZZZZZZZZZZZZZZZZB7', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '100 minutes'),
+  ('ZZZZ3J', 'ZZZZZZZZZZZZZZZZZZZZZZZZB8', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '170 minutes'),
+  -- Site A: a patient who already arrived and was never called (row 4).
+  ('ZZZZ4A', 'ZZZZZZZZZZZZZZZZZZZZZZZZC0', 'A', 'desk', 'arrived', now() - interval '30 minutes', null);
+
+insert into wait_gap_rows
+select '3 site B, 7 moments', v.average_gap_minutes
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0') v
+union all
+select '4 site A, not waiting', v.average_gap_minutes
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC0') v;
+
+select check_case, average_gap_minutes from wait_gap_rows order by check_case;
 
 rollback;
```

## Bring back

Paste the full answer into Claude Code. Claude adds it below under "Response", with its check.

## Checked (this session, 2026-11-16)

- The focus guard test in `PatientStatus.click.test.tsx` failed before the change (`6ba196a`, "expected true to be false") and passes after it (`2d64876`).
- The new beep test fails when `if (!ok && wanted())` in `SoundSwitch.tsx` is changed to `if (!ok && wanted() && false)`; code put back from a copy.
- The focus test in `PatientStatus.sound.click.test.tsx` fails when the line `lostFocus.current = true;` is removed from `StatusAndSound.tsx`; code put back from a copy.
- The expected numbers in `wait_gap.sql` were worked out by hand from the function in migration `20261116000000_wait_gap_distinct_moments.sql` (`order by other.called_at desc limit 6`, `case when me.status = 'waiting'`).
- `npm test`: 52 files, 296 tests pass. `npm run lint` and `npm run build` exit 0.

## Not checked

- The SQL check file has not been run in the Supabase SQL Editor. The migration is not run yet either.
- A real screen reader or a real phone.
- The patient page in a browser after the `StatusAndSound` move (no Playwright run this session).

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-16. The answer as pasted:

### 1. Focus guard (`useRescueFocus` running after every render)

- Can an effect that runs after every render move focus when it should not? No, when nothing left with focus inside it. `useEffect` runs after every commit, but `if (!lostRef.current) return;` exits unless a reporter set the flag in that commit's layout-effect cleanup. Even when the flag is true, `if (!focusIsOnNobody() && document.activeElement?.isConnected) return;` keeps focus on another connected control.
- Bug: focus rescue fails when `StillHerePrompt` leaves on recall.
  1. `view.status` is `waiting` and the prompt is due, so `StillHerePrompt` shows (`app/patient/page.tsx` line 134).
  2. The patient focuses "I'm still here".
  3. Before the tap, staff recall the patient (`waiting` to `called`).
  4. Line 134 takes `StillHerePrompt` off the page.
  5. The `useReportFocusOnLeave` cleanup sets the prompt's own `lostFocus.current = true`, but the prompt itself left, so its `useRescueFocus` effect never runs. Focus drops to `document.body` instead of `#status-heading`.
  - Smallest fix: one `lostFocus` ref shared by `StillHerePrompt` and `StatusAndSound` (own it in the page, or pass the `StatusAndSound` ref), so `PatientStatus`, which stays on the page from `waiting` to `called`, does the rescue.
- Can `StillHerePrompt` and `PatientStatus` take one report twice or fight? No. Today they read separate flags. With one shared flag, the first effect to run clears it, and the second exits.

### 2. SQL check file

- The 4 expected numbers follow from `get_patient_visit`: 25, null, 16, null (worked out as in the file header).
- Problem 1: the check passes if the function sends a gap to `called` or `on_the_way` patients (for example `me.status in ('waiting', 'called', 'on_the_way')` or `me.called_at is null`), because case 4 uses `arrived` with `called_at` null. Fix: make case 4 `called` with a `called_at`, or add a 5th row for `called`.
- Problem 2: the check passes if `distinct` is applied after `limit 6`. Fix: add 4 more rows at 20 minutes ago at site B, so a wrong query gives 10, not 16.

### 3. New beep test

- Can it pass while the bug is still there? Yes, in two ways.
  1. `hidePage(true)` does not blur `sound-on`. On a real phone, a lock blurs it to `document.body`, so the test passes even if `SoundSwitch` restores focus only when focus is inside the box.
  2. `hidePage(false)` comes before `second.finish(false)`, so the test passes even if `&& wanted()` is removed.
  - Fix: blur the active element after `hidePage(true)`, and expect the `role="status"` text to contain `t.offWhileCalled` after `second.finish(false)`.

### 4. `StatusAndSound` and the page

- `StatusAndSound` does not change what the page shows, the order, or what a screen reader reads.
- `StillHerePrompt` (or the shared `lostFocus` ref) is left in the page with its own flag. Same bug as in part 1. Fix: own `lostFocus` in the page and pass it to both, or move `StillHerePrompt` into `StatusAndSound`.

### 5. Simpler ways

1. Keep one `useRescueFocus` in `PatientStatus` (which stays on the page in all states) and pass `markLost` or the flag to `StillHerePrompt` and `SoundSwitch`.
2. Add a `do $$ ... raise exception ... $$` block at the end of the SQL check, for an automatic pass or fail.
3. A helper `unlockAfterFailedHiddenBeep()` in the beep test file, to share the setup.
4. `StatusAndSound` is small; sharing `lostFocus` needs no extra wrapper.

### My check (Claude, 2026-11-16)

- Part 1 bug: correct. `StillHerePrompt` holds both its reporter (`PromptCard`) and its own `useRescueFocus` (`StillHerePrompt.tsx` lines 28-29). The page shows it only while `waiting` (`page.tsx` line 134), so on a recall both leave in the same commit and nothing moves focus. `PatientStatus` stays and could do it, but reads another flag (`StatusAndSound.tsx` line 23). No test covers this. It needs a fix (test first). The fix touches `app/` and `components/`, so it needs a plan.
- Part 1 "no fight": correct. The first effect to run clears the shared flag.
- Part 2 numbers: correct.
- Part 2 problem 1 (`called` case): correct. Case 4 cannot tell `status = 'waiting'` from "not `arrived`". A `called` row with a `called_at` is a cheap, real addition.
- Part 2 problem 2 (`distinct` after `limit 6`): wrong. The 2 rows at 30 minutes from case 2 are still there in case 3 (one transaction). Site B then has 20, 30, 30, 40, 60, 80, 100 and 170. A query with `limit 6` before `distinct` keeps 20, 30, 30, 40, 60, 80: 5 moments, round((80 - 20) / 4) = 15, not 16. Case 3 already fails such a query. No change.
- Part 3 point 1 (blur on lock): wrong for this code. A hidden page does not change `document.activeElement` in a browser; the page loses window focus, but the element stays focused (not tried on a real phone). Also, `mayTakeFocusInBackground` returns false on purpose when focus is on the page body (a phone tap elsewhere), and the first test in the file checks that. A blur in this test would test a case the design says must not take focus. No change.
- Part 3 point 2 (`&& wanted()`): partly right. If `&& wanted()` is removed, the test "tries the beep again when the phone is unlocked" fails, because the first failed beep while hidden would turn the sound off and the second `playAlert` call would not come (not run; worked out from `SoundSwitch.tsx` lines 133-143). A check of the `offWhileCalled` line after the second failure is a cheap addition, so the test also proves what the screen reader hears.
- Part 4: same bug as part 1.
- Part 5.1: the same fix as part 1. Moving `StillHerePrompt` into `StatusAndSound` keeps the page order (visit code, prompt, status, sound box) and keeps the shared flag in one file.
- Part 5.2 (`raise exception`): possible, but the owner reads 4 numbers now; not needed.
- Part 5.3: one shared setup in two tests; not needed.
