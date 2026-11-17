# Gemini review: focus after a recall, and two check additions

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste

You review three small changes in a Next.js App Router and React 19 prototype of a virtual ER waiting room, with Supabase Postgres (synthetic data only). Find problems. Do not confirm that the changes are good. For each problem, give the file, the steps that make it happen, and the smallest fix. The full diff is below the questions.

Background. On the patient screen, `useReportFocusOnLeave(ref, onLost)` calls `onLost` in a layout-effect cleanup when a part leaves while focus is inside it. `useRescueFocus(targetId, lostRef)` runs after every render and moves focus to `#status-heading` if `lostRef.current` is true and focus is on nothing that is still on the page. A part that leaves cannot rescue its own focus, because its rescue effect leaves with it.

The bug (found in the last review): the patient is `waiting`, the "I'm still here" prompt shows, and focus is on its button. Staff recall the patient. The page showed `StillHerePrompt` only while `waiting`, so the whole prompt left. The prompt reported lost focus to its own flag, but its own rescue left in the same commit. `PatientStatus` stayed, but read a different flag. Focus dropped to the page body.

The three changes:
1. `StatusAndSound.tsx` now also renders `StillHerePrompt` (above the status frame, the same place as before) and passes it the shared `lostFocus` flag. `StillHerePrompt` takes an optional `lostFocus` and uses `lostFocus ?? ownFlag`, so its standalone test still works. `app/patient/page.tsx` no longer renders the prompt. New test `StatusAndSound.click.test.tsx`: focus on "I'm still here", the visit becomes `called`, focus must be on the heading.
2. `supabase/checks/wait_gap.sql`: case 5, a site A patient with status `called`; expected null. Without it, a function that checks "not arrived" instead of "waiting" would pass.
3. `SoundSwitch.repeat.click.test.tsx`: the last test also checks the screen reader line `offWhileCalled` after the second failed beep.

Questions:
1. Can the shared flag be set by one part and used at a wrong time by another, for example a flag left at true from the prompt that moves focus later, when the patient taps somewhere else? Can `StillHerePrompt` and `PatientStatus` now both run a rescue on one report?
2. Does moving the prompt into `StatusAndSound` change the page order, the tab order, or what a screen reader reads? Does `token={token ?? null}` change when the prompt shows?
3. Can the new click test pass while the bug is there? (I checked that it fails when `lostFocus={lostFocus}` is removed from the prompt.)
4. Are there other parts on the patient screen that hold focus and leave on a status change, but do not report to the shared flag?
5. Is there a simpler way to reach any of the three goals?

## Checked

- The new test failed before the fix ("expected undefined to be defined"), at commit `9b40061`.
- With the fix (`c13ddf8`), the test passes. With `lostFocus={lostFocus}` removed for a short time, it fails again (focus on the body).
- The `offWhileCalled` check fails when that line in `SoundSwitch.tsx` is disabled for a short time (`a2ff7a5`).
- `npm test`: 53 files, 297 tests pass. `npm run lint` and `npm run build` exit 0.

## Not checked

- The SQL check file has not been run. The owner runs the migration `20261116000000_wait_gap_distinct_moments.sql`, then the whole check file (expect 25, null, 16, null, null).
- No test on a real phone or with a real screen reader.

## Diff

```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index 0894b14..213dc57 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -14,7 +14,6 @@ import { PatientShell } from "@/components/PatientShell";
 import { OfflineBanner } from "@/components/patient/OfflineBanner";
 import { StatusAndSound } from "@/components/patient/StatusAndSound";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
-import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
 import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
 import { isDeadToken } from "@/lib/deadToken";
 import { fill, textFor } from "@/lib/text";
@@ -131,8 +130,7 @@ export default function PatientPage() {
             </bdi>{" "}
             · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
           </p>
-          {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
-          <StatusAndSound view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
+          <StatusAndSound view={view} token={token ?? null} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
               {p.notSaved}
diff --git a/components/patient/PatientStatus.sound.click.test.tsx b/components/patient/PatientStatus.sound.click.test.tsx
index af193d4..20db415 100644
--- a/components/patient/PatientStatus.sound.click.test.tsx
+++ b/components/patient/PatientStatus.sound.click.test.tsx
@@ -37,7 +37,7 @@ const view: PatientView = {
 
 /** The status screen and the sound box, as the patient page shows them. */
 function Page({ status, online = true }: { status: VisitStatus; online?: boolean }) {
-  return <StatusAndSound view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} online={online} />;
+  return <StatusAndSound view={{ ...view, status }} token={null} language="en" onOnMyWay={() => {}} sending={false} online={online} />;
 }
 
 let container: HTMLDivElement;
diff --git a/components/patient/SoundSwitch.repeat.click.test.tsx b/components/patient/SoundSwitch.repeat.click.test.tsx
index 432b4a2..ad72bfc 100644
--- a/components/patient/SoundSwitch.repeat.click.test.tsx
+++ b/components/patient/SoundSwitch.repeat.click.test.tsx
@@ -111,6 +111,8 @@ describe("SoundSwitch repeat beep", () => {
     await act(async () => second.finish(false));
     expect(button(t.turnOn)).toBeDefined();
     expect(container.querySelector("[data-testid='sound-on']")).toBeNull();
+    // The screen reader hears that the sound went off while called.
+    expect(container.querySelector("[data-testid='sound-off-called']")?.textContent).toBe(t.offWhileCalled);
     expect(document.activeElement).toBe(button(t.turnOn));
   });
 });
diff --git a/components/patient/StatusAndSound.click.test.tsx b/components/patient/StatusAndSound.click.test.tsx
new file mode 100644
index 0000000..ae4c2e7
--- /dev/null
+++ b/components/patient/StatusAndSound.click.test.tsx
@@ -0,0 +1,78 @@
+// @vitest-environment happy-dom
+// Checks the "I'm still here" prompt inside StatusAndSound: when staff recall the patient while
+// focus is on the prompt's button, the prompt leaves, and focus must go to the status heading.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import type { PatientView } from "@/lib/patientView";
+import { textFor } from "@/lib/text";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { StatusAndSound } from "./StatusAndSound";
+
+// The tap's save, the clock and the sound player are replaced, so each test controls them.
+vi.mock("@/data/patientVisit", () => ({ recordStillHere: vi.fn().mockResolvedValue("saved") }));
+const NOW = new Date("2026-11-16T12:00:00Z");
+vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const t = textFor("en");
+
+// Triaged 31 minutes ago and never tapped, so the prompt is due.
+const waiting: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "waiting",
+  placeInLine: 2,
+  waitLow: 20,
+  waitHigh: 40,
+  calledAt: null,
+  lastStillHereAt: null,
+  triagedAt: "2026-11-16T11:29:00Z",
+  seen: false,
+  closed: false,
+  expired: false,
+};
+// The same visit after staff recall it.
+const called: PatientView = { ...waiting, status: "called", placeInLine: null, calledAt: "2026-11-16T12:00:00Z" };
+
+let container: HTMLDivElement;
+let root: Root;
+
+const show = (view: PatientView) =>
+  act(() =>
+    root.render(<StatusAndSound view={view} token="t" language="en" onOnMyWay={() => {}} sending={false} online />),
+  );
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+
+beforeEach(() => {
+  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
+  vi.mocked(playAlert).mockReset().mockReturnValue(new Promise(() => {}));
+  vi.mocked(stopVibration).mockReset();
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+});
+
+describe("StatusAndSound with the I'm still here prompt", () => {
+  it("moves focus to the status heading when a recall takes the focused prompt away", () => {
+    show(waiting);
+    const stillHere = button(t.stillHere.button);
+    expect(stillHere).toBeDefined();
+    stillHere?.focus();
+    show(called);
+    expect(button(t.stillHere.button)).toBeUndefined();
+    const heading = container.querySelector("#status-heading");
+    expect(heading?.textContent).toBe(t.patient.calledHeading);
+    expect(document.activeElement).toBe(heading);
+  });
+});
diff --git a/components/patient/StatusAndSound.tsx b/components/patient/StatusAndSound.tsx
index 820f8c4..524f505 100644
--- a/components/patient/StatusAndSound.tsx
+++ b/components/patient/StatusAndSound.tsx
@@ -1,16 +1,20 @@
 "use client";
 
-// The status screen and the sound box of the patient page, with the one flag they share: when the
-// sound box leaves the page with focus inside it, the status screen moves focus to its heading.
+// The "I'm still here" prompt, the status screen and the sound box of the patient page, with the one
+// flag they share: when the prompt or the sound box leaves the page with focus inside it, the status
+// screen moves focus to its heading.
 // The page and the click test both use this part, so the test checks the real wiring.
 
 import { useRef } from "react";
 import type { PatientView } from "@/lib/patientView";
 import { PatientStatus } from "./PatientStatus";
 import { SoundSwitch } from "./SoundSwitch";
+import { StillHerePrompt } from "./StillHerePrompt";
 
 type Props = {
   view: PatientView;
+  /** The visit's token, for the "I'm still here" tap (null: no prompt). */
+  token: string | null;
   language: string;
   onOnMyWay: () => void;
   sending: boolean;
@@ -18,11 +22,14 @@ type Props = {
   online: boolean;
 };
 
-export function StatusAndSound({ view, language, onOnMyWay, sending, online }: Props) {
-  // True when the sound box left the page with focus inside it; the status screen then moves focus.
+export function StatusAndSound({ view, token, language, onOnMyWay, sending, online }: Props) {
+  // True when the prompt or the sound box left the page with focus inside it; the status screen then moves focus.
   const lostFocus = useRef(false);
   return (
     <>
+      {token && view.status === "waiting" && (
+        <StillHerePrompt view={view} token={token} language={language} lostFocus={lostFocus} />
+      )}
       {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
       <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
         <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index a0de237..c809934 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -4,7 +4,7 @@
 // last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
 // still following the visit; the screen says it is not a health check.
 
-import { useEffect, useRef, useState, type ReactNode } from "react";
+import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
 import { recordStillHere } from "@/data/patientVisit";
 import type { PatientView } from "@/lib/patientView";
 import { stillHereState } from "@/lib/stillHere";
@@ -16,7 +16,15 @@ import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 /** How long the thank-you stays after a tap. */
 const THANKS_MS = 5 * 60_000;
 
-export function StillHerePrompt({ view, token, language }: { view: PatientView; token: string; language: string }) {
+type Props = {
+  view: PatientView;
+  token: string;
+  language: string;
+  /** The flag shared with the status screen, which stays on the page when this prompt leaves on a recall. */
+  lostFocus?: RefObject<boolean>;
+};
+
+export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
   const now = useNow();
   const [sending, setSending] = useState(false);
   const [notSaved, setNotSaved] = useState(false);
@@ -25,8 +33,9 @@ export function StillHerePrompt({ view, token, language }: { view: PatientView;
   const state = now ? stillHereState(view, now) : "not_due";
   const showing = state !== "not_due";
   // If the prompt leaves with focus inside it (after the tap), focus goes to the status heading.
-  const lostFocus = useRef(false);
-  const markLost = useRescueFocus("status-heading", lostFocus);
+  // With the shared flag, the status screen also does this when the whole prompt leaves on a recall.
+  const ownFlag = useRef(false);
+  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
 
   // Tell screen readers once each time the prompt appears (politely; it is not urgent).
   useEffect(() => {
diff --git a/supabase/checks/wait_gap.sql b/supabase/checks/wait_gap.sql
index 730a042..e8ea578 100644
--- a/supabase/checks/wait_gap.sql
+++ b/supabase/checks/wait_gap.sql
@@ -9,7 +9,7 @@
 -- check could not put call-backs at different times. Why real call-back times are cleared:
 -- real call-backs at the same site would change the average.
 --
--- Expected result (4 rows):
+-- Expected result (5 rows):
 --   1 site A  average_gap_minutes = 25
 --     Moments 60, 40 and 10 minutes ago count. The "Recall all" of 3 visits 60 minutes ago is
 --     one moment, and the call-back 4 hours ago is too old. 3 moments give 2 gaps: (60 - 10) / 2 = 25.
@@ -22,6 +22,9 @@
 --     (170 - 30) / 5 = 28, and no limit would give (170 - 20) / 6 = 25.
 --   4 site A, not waiting  average_gap_minutes = null
 --     A patient who already arrived gets no wait gap, even with call-backs at the site.
+--   5 site A, called  average_gap_minutes = null
+--     A patient who is called (not waiting any more) gets no wait gap either. Without this row,
+--     a function that checks "not arrived" instead of "waiting" would still pass case 4.
 
 begin;
 
@@ -59,14 +62,19 @@ insert into public.visits (code, access_token, site, source, status, triaged_at,
   ('ZZZZ3H', 'ZZZZZZZZZZZZZZZZZZZZZZZZB7', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '100 minutes'),
   ('ZZZZ3J', 'ZZZZZZZZZZZZZZZZZZZZZZZZB8', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '170 minutes'),
   -- Site A: a patient who already arrived and was never called (row 4).
-  ('ZZZZ4A', 'ZZZZZZZZZZZZZZZZZZZZZZZZC0', 'A', 'desk', 'arrived', now() - interval '30 minutes', null);
+  ('ZZZZ4A', 'ZZZZZZZZZZZZZZZZZZZZZZZZC0', 'A', 'desk', 'arrived', now() - interval '30 minutes', null),
+  -- Site A: a patient who is called now (row 5).
+  ('ZZZZ4B', 'ZZZZZZZZZZZZZZZZZZZZZZZZC1', 'A', 'desk', 'called', now() - interval '30 minutes', now() - interval '5 minutes');
 
 insert into wait_gap_rows
 select '3 site B, 7 moments', v.average_gap_minutes
 from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0') v
 union all
 select '4 site A, not waiting', v.average_gap_minutes
-from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC0') v;
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC0') v
+union all
+select '5 site A, called', v.average_gap_minutes
+from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC1') v;
 
 select check_case, average_gap_minutes from wait_gap_rows order by check_case;
 
```

## Response

Gemini Hydrogen 4, High, 2026-11-16 (pasted by the owner):

### 1. Problems with the Shared Flag (`lostFocus`)

* **Duplicate `useRescueFocus` effects run on the same shared ref, and `StillHerePrompt` triggers the rescue check on every `useNow()` tick:** File: `components/patient/StillHerePrompt.tsx` and `components/patient/StatusAndSound.tsx`. Both `StillHerePrompt` and `PatientStatus` call `useRescueFocus` on the same `lostFocus` ref. They will not both move focus on a single report, because `StillHerePrompt`'s effect runs first and sets `lostRef.current = false`. But because `StillHerePrompt` calls `useNow()`, its effect runs after every clock tick even though `PatientStatus` already handles rescues. Smallest fix: give `StillHerePrompt` an optional `onFocusLost` prop, so `StatusAndSound` passes `onFocusLost={() => { lostFocus.current = true; }}`, keeping `useRescueFocus` only inside `PatientStatus`.
* **Stale `lostFocus.current = true` if `StillHerePrompt` unmounts without `PatientStatus` re-rendering:** If `PatientStatus` is ever wrapped in `React.memo` and `token` changes from "t" to null while `view` is unchanged, the prompt unmounts and sets the flag while `PatientStatus` skips rendering. The flag stays true until a later render, which would move focus late if focus was on the body. Smallest fix: keep `PatientStatus` unmemoized, or pass an incrementing counter instead of a mutable ref.

### 2. Problems with Page Order, Tab Order, Screen Readers, and `token={token ?? null}`

* Moving `StillHerePrompt` into `StatusAndSound` does not change DOM order, tab order, screen-reader reading order, or when the prompt shows. `token={token ?? null}` keeps the same behavior.
* **`StillHerePrompt` stays mounted above the `Expired` screen when `view.expired` is true and `view.status === "waiting"`.** Smallest fix: `{token && !view.expired && view.status === "waiting" && (`.
* **`StillHerePrompt` sits outside `data-testid="status-frame"` when the patient goes offline.** Smallest fix: pass `online` to `StillHerePrompt`, or put it inside the frame when offline.

### 3. Problems with the New Test (`StatusAndSound.click.test.tsx`)

* **Hardcodes `token="t"` on `<StatusAndSound>`, so `app/patient/page.tsx` passing `token={null}` would still pass.** Smallest fix: add a test that renders `PatientPage` (with mocked visit data) through a `waiting` to `called` change.
* **Never tests the prompt unmounting when `token` clears ("t" to null) or after the "I'm still here" tap (thank-you state).** Smallest fix: a second test that focuses the button under `waiting` with `token="t"`, renders `waiting` with `token={null}`, and expects focus on `#status-heading`.
* **In `SoundSwitch.repeat.click.test.tsx`, the `offWhileCalled` assertion does not check that the element is inside `[role="status"]`.** Smallest fix: query `[role='status'] [data-testid='sound-off-called']`.

### 4. Other Parts on the Patient Screen That Leave With Focus Without Telling `lostFocus`

* **`PatientStatus` itself when `app/patient/page.tsx` switches to the dead-token or "unavailable" screen.** Staff issue a new link, or the visit read returns "unavailable". The page unmounts `StatusAndSound` completely, with `#status-heading` and the rescue hook, so focus drops to the body. Smallest fix: lift `lostFocus` and `useRescueFocus` to `app/patient/page.tsx`, and give the dead-token and unavailable screens an `<h2 id="status-heading" tabIndex={-1}>`.
* **Status changes within "other" in `PatientStatus.tsx` (for example `arrived` to `removed`).** `ViewBox` is keyed by `viewKind(view)`, so it stays mounted. Smallest fix: key `ViewBox` by `${view.expired}-${view.status}`.
* **Any post-visit control (such as a survey panel) in `app/patient/page.tsx` outside `StatusAndSound`.** Smallest fix: wrap any conditional interactive block in a `useReportFocusOnLeave` box wired to a page-level flag.

(Gemini's `[cite: n]` marks and line numbers are left out here; the text is otherwise as pasted, shortened where it repeated itself.)

### My check (Claude, 2026-11-16)

Accepted:
- 3.3 (`role="status"` in the query). True: the test passes today if the line moves out of the live region. One-line test change.

Real, owner to decide:
- 4.1 (whole status leaves on the dead-token or "unavailable" screen). True. `lib/failedRead.ts` turns a shown visit into "unavailable" after `FAILED_READS_BEFORE_UNAVAILABLE` failed reads in a row, and `isDeadToken` turns it into the broken-link screen after "Issue a new link". In both cases `StatusAndSound` leaves and focus goes to the body. This was so before this fix too. A fix touches `app/patient/page.tsx` and the patient components, so it needs plan mode.
- 3.1 (a test that renders the page). True that no test checks the `token` prop on the page. There is no page-level click test now; one would need mocks for `usePatientView`, `useChosenLanguage`, `useOnline` and the link reader.

Rejected:
- 1.1. Two rescue effects on one ref are safe (Gemini says so too: the first clears the flag). The cost is one ref read per clock tick. The suggested fix removes the prompt's own rescue, which `StillHerePrompt.click.test.tsx` needs when the prompt is used alone.
- 1.2. `PatientStatus` is not memoized. The token cannot go from a string to null while a view shows: the view comes from `usePatientView(token)`, so a null token gives no view and the whole part leaves.
- 2.2. `expired` is true only for `pre_arrival` with no triage (`20261116000000_wait_gap_distinct_moments.sql` line 68). It is never true while `waiting`, and `stillHereState` gives `not_due` with no `triagedAt`.
- 2.3. The prompt was outside the frame before this change too. The frame marks the status as possibly old; the prompt is an action, and a tap while offline shows the not-saved line.
- 3.2. Token to null while `waiting` cannot happen (see 1.2). After the tap, focus goes to the status heading (`f679e2c`), so a recall then is the heading case that `PatientStatus.sound.click.test.tsx` and the `PatientStatus` click tests cover.
- 4.2. `OtherStatus` has no focusable part except the heading, and the heading stays the same element (same key, same component, same id) when the status changes inside "other". Nothing leaves.
- 4.3. The page has no survey or other control outside `StatusAndSound` that leaves on a status change. The not-saved line is not focusable.
