# Gemini review: focus rescue on the patient screen, and the fixes from the last 2 sound box reviews

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Prompt to paste

You review a change to a concept prototype of a virtual ER waiting room (synthetic data only). Next.js 16, React 19, TypeScript, vitest with happy-dom. Find problems; do not confirm. For each problem, give the file and line, a case that shows it, and the smallest fix.

The change:
1. Focus rescue (`components/patient/useFocusRescue.ts`). When a part that has focus leaves the patient screen (the sound box when staff mark the visit arrived; the "I'm on my way" button after the tap; the whole called view), focus goes to the status heading `#status-heading` (`tabIndex={-1}`). `useReportFocusOnLeave` checks focus in a `useLayoutEffect` cleanup, before React removes the nodes. `useRescueFocus` runs after each change of `trigger`; it clears the flag first, and does not move focus that is on a part still on the page. `app/patient/page.tsx` shares one ref flag between `SoundSwitch` and `PatientStatus`.
2. `SoundSwitch.tsx`: a tap on "Turn on sound" or "Turn off sound" clears `backgroundFocus`, so an old answer from a failed repeat beep cannot decide focus after a tap in the same React commit.
3. `components/patient/noFocus.ts`: one helper `focusIsOnNobody()` (null, body or `<html>`), used by `focusNearBox`, `mayTakeFocusInBackground` and `useRescueFocus`.
4. Stronger tests, each one proven by a change to the code that makes it fail: a second beep after the phone is unlocked (`visibilitychange`); "still wanted?" gives false while the box is on the page and the phone is locked; `unlockSound` runs inside the second tap, before the 500 ms pause; `unlockSound` is still pending at 999 ms; the staff flag test looks only inside the `flag-...` element.

Owner decisions that are not open for this review: `RESUME_WAIT_MS` stays 1000 (to measure on real phones in Phase 5); "Turn on sound" gets no `aria-disabled` while a tap is handled.

Questions:
1. Is there a case where focus goes to the heading when it should stay, or stays on the body when it should go to the heading? Think of two changes in one React commit, a re-render with no status change, and React Strict Mode (effects run twice in development).
2. Can the shared ref flag in `app/patient/page.tsx` stay true from an old change and move focus later?
3. A screen reader reads the heading when it gets focus, and `StatusAnnouncer` reads the full status line 300 ms later. Is this a real problem for NVDA, VoiceOver or TalkBack users?
4. Do the new tests fail if the code is wrong? Name any test that passes with a wrong fix.

## Checked

- `npm test`: Test Files 49 passed, Tests 283 passed.
- `npm run lint`: exit code 0.
- `npm run build`: exit code 0.
- The new tests for items 1, 2 and 3 failed before the fixes (save points `3ed7474`, `463ddb4`, `f18bc55`).
- The tests of item 4 fail with these code changes (put back after): no `visibilitychange` listener; `wanted` does not check `visibilityState`; the 500 ms wait before `unlockSound()`; `RESUME_WAIT_MS = 10`; the flag element not found.

## Not checked

- A real phone, a real screen reader (NVDA, VoiceOver, TalkBack).
- Safari or Firefox giving `<html>` as `activeElement` (only faked in a unit test).
- React Strict Mode in development.

## Diff
```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index c8b57da..3f3d7c4 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -3,7 +3,7 @@
 // The patient screen on the patient's own phone: opens the visit from the link's token
 // (or the one saved on this phone) and updates live.
 
-import { useEffect, useState } from "react";
+import { useEffect, useRef, useState } from "react";
 import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
 import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
 import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
@@ -28,6 +28,8 @@ export default function PatientPage() {
   const [sending, setSending] = useState(false);
   const chosenLanguage = useChosenLanguage();
   const online = useOnline();
+  // True when the sound box left the page with focus inside it; the status screen then moves focus.
+  const lostFocus = useRef(false);
 
   // Reading the link and browser storage can only happen in the browser, after the first render.
   // A new link opened on this same page (only the #t=... part changes) switches to that visit.
@@ -135,9 +137,17 @@ export default function PatientPage() {
           {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
           {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
           <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
-            <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} />
+            <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
           </div>
-          {(view.status === "waiting" || view.status === "called") && <SoundSwitch status={view.status} language={language} />}
+          {(view.status === "waiting" || view.status === "called") && (
+            <SoundSwitch
+              status={view.status}
+              language={language}
+              onFocusLost={() => {
+                lostFocus.current = true;
+              }}
+            />
+          )}
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
               {p.notSaved}
diff --git a/components/patient/PatientStatus.click.test.tsx b/components/patient/PatientStatus.click.test.tsx
new file mode 100644
index 0000000..53cbbe7
--- /dev/null
+++ b/components/patient/PatientStatus.click.test.tsx
@@ -0,0 +1,83 @@
+// @vitest-environment happy-dom
+// Checks that focus goes to the status heading when "I'm on my way" leaves the called screen
+// (after the tap is confirmed, or when staff change the status).
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it } from "vitest";
+import type { PatientView } from "@/lib/patientView";
+import { textFor } from "@/lib/text";
+import type { VisitStatus } from "@/lib/visit";
+import { PatientStatus } from "./PatientStatus";
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const p = textFor("en").patient;
+
+const view: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "called",
+  placeInLine: null,
+  waitLow: null,
+  waitHigh: null,
+  calledAt: "2026-11-15T18:00:00Z",
+  lastStillHereAt: null,
+  triagedAt: "2026-11-15T17:00:00Z",
+  seen: true,
+  closed: false,
+  expired: false,
+};
+
+let container: HTMLDivElement;
+let root: Root;
+
+const show = (status: VisitStatus) =>
+  act(() => root.render(<PatientStatus view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} />));
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+const heading = () => container.querySelector("#status-heading");
+
+beforeEach(() => {
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
+describe("PatientStatus focus", () => {
+  it("moves focus to the heading when I'm on my way is confirmed", () => {
+    show("called");
+    button(p.onMyWay)?.focus();
+    show("on_the_way");
+    expect(document.activeElement).toBe(heading());
+  });
+
+  it("moves focus to the heading when staff mark the visit arrived", () => {
+    show("called");
+    button(p.onMyWay)?.focus();
+    show("arrived");
+    expect(document.activeElement).toBe(heading());
+  });
+
+  it("moves focus to the heading when the sound box below leaves with focus inside", () => {
+    const lost = { current: false };
+    act(() =>
+      root.render(<PatientStatus view={view} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lost} />),
+    );
+    // The page sets this flag when the sound box leaves with focus inside (see SoundSwitch).
+    lost.current = true;
+    (document.activeElement as HTMLElement | null)?.blur();
+    act(() =>
+      root.render(
+        <PatientStatus view={{ ...view, status: "arrived" }} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lost} />,
+      ),
+    );
+    expect(document.activeElement).toBe(heading());
+  });
+});
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 53d3efa..01b1a09 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -4,19 +4,46 @@
 // Waiting, Please head back now, Ready at the desk, and the states before and after those.
 
 import Link from "next/link";
+import { useRef, type RefObject } from "react";
 import type { PatientView } from "@/lib/patientView";
 import { textFor, type PatientText } from "@/lib/text";
 import { formatWaitRange } from "@/lib/waitText";
 import { Button } from "@/components/Button";
 import { CallReminder } from "./CallReminder";
+import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 
-type Props = { view: PatientView; language: string; onOnMyWay: () => void; sending: boolean };
+type Props = {
+  view: PatientView;
+  language: string;
+  onOnMyWay: () => void;
+  sending: boolean;
+  /** Set to true by a part below (the sound box) that left the page with focus inside it. */
+  lostFocus?: RefObject<boolean>;
+};
+
+/** "I'm on my way". When it leaves the page with focus on it, it tells the status screen. */
+function OnMyWayButton({ onOnMyWay, sending, label, onFocusLost }: {
+  onOnMyWay: () => void;
+  sending: boolean;
+  label: string;
+  onFocusLost: () => void;
+}) {
+  const area = useRef<HTMLDivElement>(null);
+  useReportFocusOnLeave(area, onFocusLost);
+  return (
+    <div ref={area}>
+      <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
+        {label}
+      </Button>
+    </div>
+  );
+}
 
 function Waiting({ view, language, t }: { view: PatientView; language: string; t: PatientText }) {
   const p = t.patient;
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
-      <h2 id="status-heading" className="text-2xl font-bold">
+      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
         {p.waitingHeading}
       </h2>
       <p className="text-lg">
@@ -32,7 +59,7 @@ function Waiting({ view, language, t }: { view: PatientView; language: string; t
   );
 }
 
-function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
+function Called({ view, onOnMyWay, sending, t, onFocusLost }: Props & { t: PatientText; onFocusLost: () => void }) {
   const p = t.patient;
   const confirmed = view.status === "on_the_way";
   return (
@@ -40,7 +67,7 @@ function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
       aria-labelledby="status-heading"
       className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
     >
-      <h2 id="status-heading" className="text-2xl font-bold text-green-950">
+      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold text-green-950">
         {p.calledHeading}
       </h2>
       <p className="text-lg">{p.calledText}</p>
@@ -50,9 +77,12 @@ function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
           {p.confirmed}
         </p>
       ) : (
-        <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
-          {sending ? p.sending : p.onMyWay}
-        </Button>
+        <OnMyWayButton
+          onOnMyWay={onOnMyWay}
+          sending={sending}
+          label={sending ? p.sending : p.onMyWay}
+          onFocusLost={onFocusLost}
+        />
       )}
     </section>
   );
@@ -84,7 +114,7 @@ function OtherStatus({ view, t }: { view: PatientView; t: PatientText }) {
   const { heading, text } = otherStatus(view.status, t);
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
-      <h2 id="status-heading" className="text-2xl font-bold">
+      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
         {heading}
       </h2>
       {text.map((paragraph) => (
@@ -101,7 +131,7 @@ function Expired({ t }: { t: PatientText }) {
   const p = t.patient;
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
-      <h2 id="status-heading" className="text-2xl font-bold">
+      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
         {p.expiredHeading}
       </h2>
       <p className="text-lg">{t.expiredText}</p>
@@ -115,12 +145,16 @@ function Expired({ t }: { t: PatientText }) {
   );
 }
 
-export function PatientStatus({ view, language, onOnMyWay, sending }: Props) {
+export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }: Props) {
   const t = textFor(language);
+  // The page's flag when it gives one (the sound box sets it too), otherwise this screen's own.
+  const ownFlag = useRef(false);
+  // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
+  const markLost = useRescueFocus("status-heading", `${view.expired}-${view.status}`, lostFocus ?? ownFlag);
   if (view.expired) return <Expired t={t} />;
   if (view.status === "waiting") return <Waiting view={view} language={language} t={t} />;
   if (view.status === "called" || view.status === "on_the_way") {
-    return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
+    return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />;
   }
   return <OtherStatus view={view} t={t} />;
 }
diff --git a/components/patient/SoundSwitch.click.test.tsx b/components/patient/SoundSwitch.click.test.tsx
index e8e8a64..e0ec524 100644
--- a/components/patient/SoundSwitch.click.test.tsx
+++ b/components/patient/SoundSwitch.click.test.tsx
@@ -154,6 +154,8 @@ describe("SoundSwitch taps", () => {
     show("waiting");
     await press(t.turnOn);
     await press(t.turnOn);
+    // The phone allows sound only inside the tap, so the new unlock must not wait for the pause.
+    expect(unlockSound).toHaveBeenCalledTimes(2);
     await act(async () => vi.advanceTimersByTimeAsync(STATUS_CLEAR_MS - 1));
     expect(statusBox()?.textContent).toBe("");
     await act(async () => vi.advanceTimersByTimeAsync(1));
diff --git a/components/patient/SoundSwitch.leave.click.test.tsx b/components/patient/SoundSwitch.leave.click.test.tsx
new file mode 100644
index 0000000..4a66990
--- /dev/null
+++ b/components/patient/SoundSwitch.leave.click.test.tsx
@@ -0,0 +1,72 @@
+// @vitest-environment happy-dom
+// Checks that the "Turn on sound" box tells the page when it leaves while focus is inside it,
+// so the page can move focus to the status heading.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { textFor } from "@/lib/text";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { SoundSwitch } from "./SoundSwitch";
+
+// Replace the real sound player.
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const t = textFor("en").sound;
+
+let container: HTMLDivElement;
+let root: Root;
+
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+beforeEach(() => {
+  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
+  vi.mocked(playAlert).mockReset().mockResolvedValue(true);
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
+describe("SoundSwitch leaving the page", () => {
+  it("tells the page when the box leaves while focus is on Sound is on", async () => {
+    const onFocusLost = vi.fn();
+    act(() => root.render(<SoundSwitch status="called" language="en" onFocusLost={onFocusLost} />));
+    await press(t.turnOn);
+    expect(document.activeElement?.textContent).toBe(t.on);
+    // Staff mark the visit arrived, so the page takes the box away.
+    act(() => root.render(<></>));
+    expect(onFocusLost).toHaveBeenCalledTimes(1);
+  });
+
+  it("does not tell the page when focus is on another button as the box leaves", async () => {
+    const onFocusLost = vi.fn();
+    const screen = (withBox: boolean) => (
+      <>
+        <button>Other</button>
+        {withBox && <SoundSwitch status="called" language="en" onFocusLost={onFocusLost} />}
+      </>
+    );
+    act(() => root.render(screen(true)));
+    await press(t.turnOn);
+    button("Other")?.focus();
+    act(() => root.render(screen(false)));
+    expect(onFocusLost).not.toHaveBeenCalled();
+  });
+});
diff --git a/components/patient/SoundSwitch.repeat.click.test.tsx b/components/patient/SoundSwitch.repeat.click.test.tsx
new file mode 100644
index 0000000..260813f
--- /dev/null
+++ b/components/patient/SoundSwitch.repeat.click.test.tsx
@@ -0,0 +1,95 @@
+// @vitest-environment happy-dom
+// Checks the repeat beep of the "Turn on sound" box while the visit is called: a tap right after a
+// failed beep, the "still wanted?" answer while the phone is locked, and a new try when it unlocks.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { textFor } from "@/lib/text";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { SoundSwitch } from "./SoundSwitch";
+
+// Replace the real sound player; each test chooses what it gives and when.
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const t = textFor("en").sound;
+
+/** A promise that the test finishes later, to copy a slow phone. */
+function later<T>() {
+  let finish!: (value: T) => void;
+  const promise = new Promise<T>((resolve) => (finish = resolve));
+  return { promise, finish };
+}
+
+/** Copies a locked phone (the page is hidden) or an unlocked one. */
+function hidePage(hidden: boolean) {
+  if (hidden) Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
+  else delete (document as { visibilityState?: string }).visibilityState;
+}
+
+let container: HTMLDivElement;
+let root: Root;
+
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+
+/** Shows the box for a called visit, taps "Turn on sound", and gives back the repeat beep that waits. */
+async function soundOnWhileCalled() {
+  const beep = later<boolean>();
+  vi.mocked(playAlert).mockReturnValue(beep.promise);
+  act(() => root.render(<SoundSwitch status="called" language="en" />));
+  const turnOn = button(t.turnOn);
+  turnOn?.focus();
+  await act(async () => turnOn?.click());
+  return beep;
+}
+
+beforeEach(() => {
+  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
+  vi.mocked(playAlert).mockReset().mockResolvedValue(true);
+  vi.mocked(stopVibration).mockReset();
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+  hidePage(false);
+});
+
+describe("SoundSwitch repeat beep", () => {
+  it("moves focus to Turn on sound after a tap on Turn off sound that comes right after a failed beep", async () => {
+    const beep = await soundOnWhileCalled();
+    // A phone tap elsewhere put focus on the page body, so the failed beep alone must not take focus.
+    (document.activeElement as HTMLElement | null)?.blur();
+    await act(async () => {
+      beep.finish(false);
+      await Promise.resolve();
+      await Promise.resolve();
+      // The tap comes before React shows the result of the failed beep.
+      button(t.turnOff)?.click();
+    });
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+
+  it("answers no to 'still wanted?' while the phone is locked, before the box leaves", async () => {
+    await soundOnWhileCalled();
+    const stillWanted = vi.mocked(playAlert).mock.calls[0][0];
+    expect(stillWanted?.()).toBe(true);
+    hidePage(true);
+    expect(stillWanted?.()).toBe(false);
+  });
+
+  it("tries the beep again when the phone is unlocked", async () => {
+    const beep = await soundOnWhileCalled();
+    hidePage(true);
+    await act(async () => beep.finish(false));
+    hidePage(false);
+    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
+    expect(playAlert).toHaveBeenCalledTimes(2);
+  });
+});
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index 5381e2d..b483450 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -9,6 +9,8 @@ import { ALERT_REPEAT_MS, STATUS_CLEAR_MS, type SoundState, shouldAlert, soundNo
 import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
 import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { useReportFocusOnLeave } from "./useFocusRescue";
+import { focusIsOnNobody } from "./noFocus";
 
 /** Waits this many milliseconds (none when the number is 0 or less). */
 function waitMs(ms: number): Promise<void> {
@@ -21,9 +23,8 @@ function waitMs(ms: number): Promise<void> {
  * patient is on another button, such as "I'm still here", so a background beep failure leaves it there.
  */
 function focusNearBox(box: HTMLElement | null): boolean {
-  const focused = document.activeElement;
-  if (!focused || focused === document.body) return true;
-  return box?.contains(focused) === true;
+  if (focusIsOnNobody()) return true;
+  return box?.contains(document.activeElement) === true;
 }
 
 /**
@@ -32,13 +33,19 @@ function focusNearBox(box: HTMLElement | null): boolean {
  * On a phone, focus is on the page body after the patient taps plain text elsewhere on the page.
  */
 function mayTakeFocusInBackground(box: HTMLElement | null): boolean {
-  const focused = document.activeElement;
   // With no tap, focus on the page body means the patient is somewhere else on the page.
-  if (!focused || focused === document.body) return false;
-  return box?.contains(focused) === true;
+  if (focusIsOnNobody()) return false;
+  return box?.contains(document.activeElement) === true;
 }
 
-export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
+type Props = {
+  status: VisitStatus;
+  language: string;
+  /** Called when the box leaves the page while focus is inside it, so the page can move focus. */
+  onFocusLost?: () => void;
+};
+
+export function SoundSwitch({ status, language, onFocusLost }: Props) {
   const t = textFor(language).sound;
   const [state, setState] = useState<SoundState>("off");
   const soundOn = state === "on";
@@ -57,10 +64,13 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   const wasOn = useRef(false);
   // Set by a repeat beep that failed in the background: may the box take focus? null after a tap.
   const backgroundFocus = useRef<boolean | null>(null);
+  useReportFocusOnLeave(box, onFocusLost);
 
   async function turnOn() {
     if (busy.current) return;
     busy.current = true;
+    // A tap gives its own answer for focus, so an old answer from a failed repeat beep must not stay.
+    backgroundFocus.current = null;
     // Clear an old failed line first, so screen readers read it again if this try fails too.
     const clearedAt = state === "failed" ? Date.now() : null;
     setState("off");
@@ -97,6 +107,8 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   function turnOff() {
     attempt.current += 1;
     busy.current = false;
+    // A tap gives its own answer for focus, so an old answer from a failed repeat beep must not stay.
+    backgroundFocus.current = null;
     setState("off");
     stopVibration();
   }
diff --git a/components/patient/alertSound.test.ts b/components/patient/alertSound.test.ts
index 47860b8..1393da8 100644
--- a/components/patient/alertSound.test.ts
+++ b/components/patient/alertSound.test.ts
@@ -88,8 +88,12 @@ describe("unlockSound", () => {
     vi.useFakeTimers();
     FakeContext.resumeResult = "hang";
     const { unlockSound } = await load();
-    const result = unlockSound();
-    await vi.advanceTimersByTimeAsync(1000);
+    let done = false;
+    const result = unlockSound().finally(() => (done = true));
+    // A slow phone needs the full second, so the tap must not give up early.
+    await vi.advanceTimersByTimeAsync(999);
+    expect(done).toBe(false);
+    await vi.advanceTimersByTimeAsync(1);
     expect(await result).toBe(false);
   });
 
diff --git a/components/patient/noFocus.test.ts b/components/patient/noFocus.test.ts
new file mode 100644
index 0000000..ab56ef9
--- /dev/null
+++ b/components/patient/noFocus.test.ts
@@ -0,0 +1,31 @@
+// @vitest-environment happy-dom
+// Checks the "focus is on nobody" answer, also for a browser that gives the <html> element.
+
+import { afterEach, describe, expect, it } from "vitest";
+import { focusIsOnNobody } from "./noFocus";
+
+/** Makes document.activeElement give this element, as some browsers do after a focused part leaves. */
+function fakeFocus(element: Element | null) {
+  Object.defineProperty(document, "activeElement", { configurable: true, get: () => element });
+}
+
+afterEach(() => {
+  delete (document as { activeElement?: Element | null }).activeElement;
+  document.body.replaceChildren();
+});
+
+describe("focusIsOnNobody", () => {
+  it("says yes for no element, the page body and the <html> element", () => {
+    for (const element of [null, document.body, document.documentElement]) {
+      fakeFocus(element);
+      expect(focusIsOnNobody()).toBe(true);
+    }
+  });
+
+  it("says no when a button has focus", () => {
+    const button = document.createElement("button");
+    document.body.appendChild(button);
+    button.focus();
+    expect(focusIsOnNobody()).toBe(false);
+  });
+});
diff --git a/components/patient/noFocus.ts b/components/patient/noFocus.ts
new file mode 100644
index 0000000..79b5d97
--- /dev/null
+++ b/components/patient/noFocus.ts
@@ -0,0 +1,8 @@
+// Says whether focus is on nobody: no element, the page body, or the <html> element. The HTML rules
+// say the body, but some browsers may give <html> after the focused part leaves the page.
+
+/** True when no real part of the page has focus. */
+export function focusIsOnNobody(): boolean {
+  const focused = document.activeElement;
+  return !focused || focused === document.body || focused === document.documentElement;
+}
diff --git a/components/patient/useFocusRescue.click.test.tsx b/components/patient/useFocusRescue.click.test.tsx
new file mode 100644
index 0000000..6deade0
--- /dev/null
+++ b/components/patient/useFocusRescue.click.test.tsx
@@ -0,0 +1,79 @@
+// @vitest-environment happy-dom
+// Checks that focus goes to the heading when a focused part leaves the page, and that focus
+// somewhere else (another button, or the page body after a phone tap) does not move.
+
+import { act, useRef, type RefObject } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it } from "vitest";
+import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+function Part({ lostRef }: { lostRef: RefObject<boolean> }) {
+  const ref = useRef<HTMLDivElement>(null);
+  useReportFocusOnLeave(ref, () => {
+    lostRef.current = true;
+  });
+  return (
+    <div ref={ref}>
+      <button>Leaves</button>
+    </div>
+  );
+}
+
+function Screen({ show, lost }: { show: boolean; lost: RefObject<boolean> }) {
+  useRescueFocus("status-heading", show, lost);
+  return (
+    <>
+      <h2 id="status-heading" tabIndex={-1}>
+        Heading
+      </h2>
+      <button>Stays</button>
+      {show && <Part lostRef={lost} />}
+    </>
+  );
+}
+
+let container: HTMLDivElement;
+let root: Root;
+const lost = { current: false };
+
+const show = (visible: boolean) => act(() => root.render(<Screen show={visible} lost={lost} />));
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+const heading = () => container.querySelector("#status-heading");
+
+beforeEach(() => {
+  lost.current = false;
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
+describe("focus rescue", () => {
+  it("moves focus to the heading when the focused part leaves the page", () => {
+    show(true);
+    button("Leaves")?.focus();
+    show(false);
+    expect(document.activeElement).toBe(heading());
+  });
+
+  it("leaves focus on another button when a part without focus leaves the page", () => {
+    show(true);
+    button("Stays")?.focus();
+    show(false);
+    expect(document.activeElement).toBe(button("Stays"));
+  });
+
+  it("leaves focus on the page body after a phone tap, so the page does not scroll", () => {
+    show(true);
+    (document.activeElement as HTMLElement | null)?.blur();
+    show(false);
+    expect(document.activeElement).toBe(document.body);
+  });
+});
diff --git a/components/patient/useFocusRescue.ts b/components/patient/useFocusRescue.ts
new file mode 100644
index 0000000..45862e7
--- /dev/null
+++ b/components/patient/useFocusRescue.ts
@@ -0,0 +1,45 @@
+"use client";
+
+// Keeps keyboard focus on the patient screen when a part that has focus leaves the page
+// (for example the sound box when staff mark the visit arrived): focus goes to the status heading.
+
+import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
+import { focusIsOnNobody } from "./noFocus";
+
+/**
+ * Calls onLost when this part leaves the page while focus is inside it. A layout effect cleanup
+ * runs before React takes the part's nodes off the page, so contains() still gives the true answer.
+ */
+export function useReportFocusOnLeave(part: RefObject<HTMLElement | null>, onLost?: () => void): void {
+  // Always the newest onLost, so the cleanup below does not use an old one.
+  const latest = useRef(onLost);
+  useLayoutEffect(() => {
+    latest.current = onLost;
+  });
+  useLayoutEffect(() => {
+    const node = part.current;
+    return () => {
+      if (node?.contains(document.activeElement)) latest.current?.();
+    };
+  }, [part]);
+}
+
+/**
+ * After each change of trigger: if a part reported lost focus (lost.current is true), focus goes to
+ * the element with this id. Focus that is still on a button that stays, or on the page body after
+ * a phone tap, does not move, so the page does not scroll.
+ * Gives back markLost, for a part that left with focus inside it.
+ */
+export function useRescueFocus(targetId: string, trigger: unknown, lostRef: RefObject<boolean>): () => void {
+  useEffect(() => {
+    if (!lostRef.current) return;
+    lostRef.current = false;
+    // Focus on a part that is still on the page stays there.
+    if (!focusIsOnNobody() && document.activeElement?.isConnected) return;
+    const target = document.getElementById(targetId);
+    if (target) target.focus({ preventScroll: true });
+  }, [targetId, trigger, lostRef]);
+  return () => {
+    lostRef.current = true;
+  };
+}
diff --git a/components/staff/FollowUpPanel.test.ts b/components/staff/FollowUpPanel.test.ts
index baf12ea..fbef8be 100644
--- a/components/staff/FollowUpPanel.test.ts
+++ b/components/staff/FollowUpPanel.test.ts
@@ -51,9 +51,10 @@ describe("FollowUpPanel phone and review flags", () => {
     ["review", 32, "30 minutes", "30 min"],
   ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min', and shows '%s'", (kind, calledMinutesAgo, words, shown) => {
     const html = panelHtml(calledMinutesAgo);
-    expect(html).toContain(`data-testid="flag-${kind}"`);
-    expect(html).toContain(`<span aria-hidden="true">${shown}</span>`);
-    expect(html).toContain(`<span class="sr-only">${words}</span>`);
+    // Look only inside this flag, so a time shown elsewhere in the panel cannot make the test pass.
+    const flag = html.match(new RegExp(`<p[^>]*data-testid="flag-${kind}"[^>]*>(.*?)</p>`))?.[1] ?? "";
+    expect(flag).toContain(`<span aria-hidden="true">${shown}</span>`);
+    expect(flag).toContain(`<span class="sr-only">${words}</span>`);
     expect(statusWords(html)).toContain(words);
     expect(statusWords(html)).not.toMatch(/\bmin\b/);
   });
```

## Response

Gemini Hydrogen 4, High, 2026-11-16, pasted by the owner. Short form of each point (the full text is in the session):

1.1 `useRescueFocus` runs only when `trigger` changes. If a part with focus leaves without a status change, `lostFocus` stays true and a later status change takes focus. Fix: no dependency list, so the effect runs after every commit.
1.2 After a rescue, focus is on the `Called` heading. Staff then mark the visit arrived: `Called` leaves, `OtherStatus` gives a new heading, and focus drops to the page, because no part reports it. Fix: report focus loss for the status view itself.
2. The shared `lostFocus` ref can stay true (same cause as 1.1; same fix).
3. The focus move to the heading and the `StatusAnnouncer` text 300 ms later can cut each other off on VoiceOver and TalkBack, or say the status twice on NVDA. Fix: skip or delay the announcement after a rescue.
4.1 No test joins `PatientStatus` and `SoundSwitch` with one shared ref; the page wiring is not tested.
4.2 No test fails if `backgroundFocus.current = null` is removed from `turnOn()`.
4.3 No test fires `visibilitychange` while the page is still hidden; the visible check in `tick()` is not tested.
4.4 The regex in `FollowUpPanel.test.ts` has no `s` flag, so a new line inside the flag would make the test read an empty string.

### Claude's check (2026-11-16)

- 1.1 and 2: true in principle, but no path in the app today. `SoundSwitch` and the "I'm on my way" button leave only when the status changes, so the trigger changes in the same commit. `StillHerePrompt` (`f679e2c`) has its own ref and its trigger `showing`. Hardening only.
- 1.2: confirmed by reading `components/patient/PatientStatus.tsx`. `Called` (line 70) and `OtherStatus` (line 134) are different parts, each with its own `<h2 id="status-heading">`, so React removes the focused heading. Case: `called`, then "I'm on my way" (focus to the heading), then `arrived`. A real bug.
- 3: not accepted now. It has no source, and polite regions normally wait for the current speech. The owner decided on 2026-11-15 to leave `StatusAnnouncer` as it is (`docs/decisions.md`). Check it in the Phase 5 real screen reader tests.
- 4.1: confirmed. No test file renders `PatientStatus` and `SoundSwitch` together (grep).
- 4.2: confirmed by a temporary code change: with line 73 of `SoundSwitch.tsx` removed, all 67 patient tests pass. Code put back from a copy.
- 4.3: confirmed by a temporary code change: with the visible check in `tick()` (line 133) replaced by `true`, all 67 patient tests pass. Code put back from a copy.
- 4.4: true, but low: `renderToStaticMarkup` writes no new lines. A one-character fix.
