# Gemini review: review fixes, long wait range in 5 languages, hidden full words for staff times

Status: ready to send.

Model: Gemini Hydrogen 4, High, in a new chat. (No Hydrogen 4 credits: Gemini 3.6 Flash, High.)
Give it everything below the line "Paste from here". Bring back its whole answer.

Branch `phase3-review-fixes` (not pushed), commits after `9cb0bef` up to `29f204e`. The diff below leaves out package-lock.json, handoffs/, docs/ and screenshots/. No keys, tokens or patient data are in it.

Checked in this session (at `29f204e`): `npm test` 44 files, 253 tests passed; `npm run lint` clean; `npm run build` passed. The new SoundSwitch click tests failed on the old code (6 of them) and pass on the fix; each NewLinkPanel click test fails when its guard is removed. Contrast script: every staff text pair at 4.5:1 or more with teal #0f5e66. Playwright screenshots at 390 px and laptop size of the start page and a patient error screen.

Not checked: the sound box in a real browser (a `waiting` visit needs a staff sign-in, which Playwright cannot do); a long wait on a real patient screen in en and ar; staff times with a real screen reader; the new hour and minute words by a fluent human reviewer.

---

Paste from here

You are reviewing a branch of a concept prototype of a virtual ER waiting room. It is a Next.js 16 app (App Router, React 19, Tailwind v4, Supabase), tested with vitest (click tests use happy-dom). Low-acuity patients wait off-site after triage and follow their place in line on their own phone. Synthetic data only.

The branch has these changes:
1. Fixes from an earlier review: a closed AudioContext is made again; the sound box (`components/patient/SoundSwitch.tsx`) uses an attempt counter so late results of an old tap change nothing, runs one beep at a time, moves focus to "Turn on sound" whenever the sound goes off, and has one `role="status"` box that is always on the page; staff flags carry their own spoken words (no regex); staff teal #0f5e66.
2. The patient wait range in hours and minutes once the high end is 60 minutes or more, in English, French, Urdu, Arabic and Mandarin (`lib/waitText.ts`, word data in `lib/text/*.ts`, forms picked by `Intl.PluralRules`). Arabic uses "ساعة" and "ساعتين" with no digit for 1 and 2 hours. Urdu uses "گھنٹے" for a whole hour at the low end, before "سے".
3. Staff times stay "1h 35min" on screen; screen readers get "1 hour 35 minutes" from hidden text (`components/staff/Duration.tsx`).
4. New tests: click tests for SoundSwitch and NewLinkPanel, render tests for PatientStatus, Duration, VisitRow, CheckInPanel and FollowUpPanel, and alertSound tests.

Find problems. Do not confirm that it is fine. For each problem give the file, what goes wrong, a way to see it happen, and the smallest fix. Check in particular:
a. State errors left in `SoundSwitch.tsx`: the attempt counter, `busy`, the `beeping` guard, the focus effect, unmount during a slow promise.
b. `formatDuration` and `formatWaitRange`: edge cases (0, 59, 60, 61, 119, 120, NaN, low above high, a low end under 60 with a high end over 60), and wrong plural or grammar forms in each language, Arabic and Urdu first.
c. Accessibility: the hidden full words next to `aria-hidden` text (do screen readers read the sentence as one piece?), the `role="status"` box, right-to-left text with digits.
d. Anything a test claims but does not really prove, including the happy-dom click tests that call `focus()` before `click()`.
If you find nothing for a point, say "nothing found" for that point.

```diff
diff --git a/app/globals.css b/app/globals.css
index 58910d0..d327949 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -27,9 +27,10 @@ body {
   box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
 }
 
-/* Staff screens (glass look). White text on #0e6f78 is 5.9:1. */
+/* Staff screens (glass look). The same teal as the patient side: 7.5:1 on white and 5.1:1 on
+   the darkest corner of the backdrop below (the older #0e6f78 was only 4.0:1 there). */
 .theme-staff {
-  --color-brand: #0e6f78;
+  --color-brand: #0f5e66;
   --color-brand-strong: #0b474d;
   --color-ink: #13212b;
 }
diff --git a/app/layout.tsx b/app/layout.tsx
index 51cbbe4..6db6f64 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -25,7 +25,7 @@ export default function RootLayout({ children }: { children: ReactNode }) {
       <head>
         <InlineScript html={textSizeScript()} />
       </head>
-      <body className="flex min-h-full flex-col bg-white text-slate-900" suppressHydrationWarning>
+      <body className="flex min-h-full flex-col bg-canvas text-ink" suppressHydrationWarning>
         <div className="flex flex-1 flex-col">{children}</div>
         <Footer />
       </body>
diff --git a/components/patient/PatientStatus.test.tsx b/components/patient/PatientStatus.test.tsx
new file mode 100644
index 0000000..3d701b8
--- /dev/null
+++ b/components/patient/PatientStatus.test.tsx
@@ -0,0 +1,41 @@
+// Checks that the waiting screen shows a long wait in hours and minutes, in the patient's language.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it } from "vitest";
+import type { PatientView } from "@/lib/patientView";
+import { PatientStatus } from "./PatientStatus";
+
+const view: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "waiting",
+  placeInLine: 3,
+  waitLow: 95,
+  waitHigh: 140,
+  calledAt: null,
+  lastStillHereAt: null,
+  triagedAt: "2026-11-15T18:00:00Z",
+  seen: false,
+  closed: false,
+  expired: false,
+};
+
+const render = (language: string, low = 95, high = 140) =>
+  renderToStaticMarkup(
+    <PatientStatus view={{ ...view, language, waitLow: low, waitHigh: high }} language={language} onOnMyWay={() => {}} sending={false} />,
+  );
+
+describe("PatientStatus wait range", () => {
+  it("shows a short range in minutes only", () => {
+    expect(render("en", 20, 45)).toContain("20 to 45 minutes");
+  });
+
+  it("shows a long range in hours and minutes (English)", () => {
+    expect(render("en")).toContain("1 hour 35 minutes to 2 hours 20 minutes");
+  });
+
+  it("shows a long range in hours and minutes (Arabic)", () => {
+    expect(render("ar")).toContain("من ساعة و35 دقيقة إلى ساعتين و20 دقيقة");
+  });
+});
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 42a0025..53d3efa 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -5,13 +5,14 @@
 
 import Link from "next/link";
 import type { PatientView } from "@/lib/patientView";
-import { fill, textFor, type PatientText } from "@/lib/text";
+import { textFor, type PatientText } from "@/lib/text";
+import { formatWaitRange } from "@/lib/waitText";
 import { Button } from "@/components/Button";
 import { CallReminder } from "./CallReminder";
 
 type Props = { view: PatientView; language: string; onOnMyWay: () => void; sending: boolean };
 
-function Waiting({ view, t }: { view: PatientView; t: PatientText }) {
+function Waiting({ view, language, t }: { view: PatientView; language: string; t: PatientText }) {
   const p = t.patient;
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
@@ -24,7 +25,7 @@ function Waiting({ view, t }: { view: PatientView; t: PatientText }) {
       <p className="text-base">{p.placeCanChange}</p>
       <p className="text-lg">
         {p.waitLabel}{" "}
-        <strong>{view.waitLow !== null && view.waitHigh !== null && fill(p.waitRange, { low: view.waitLow, high: view.waitHigh })}</strong>
+        <strong>{view.waitLow !== null && view.waitHigh !== null && formatWaitRange(view.waitLow, view.waitHigh, language)}</strong>
       </p>
       <p className="text-sm text-slate-700">{p.simulated}</p>
     </section>
@@ -117,7 +118,7 @@ function Expired({ t }: { t: PatientText }) {
 export function PatientStatus({ view, language, onOnMyWay, sending }: Props) {
   const t = textFor(language);
   if (view.expired) return <Expired t={t} />;
-  if (view.status === "waiting") return <Waiting view={view} t={t} />;
+  if (view.status === "waiting") return <Waiting view={view} language={language} t={t} />;
   if (view.status === "called" || view.status === "on_the_way") {
     return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
   }
diff --git a/components/patient/SoundSwitch.click.test.tsx b/components/patient/SoundSwitch.click.test.tsx
new file mode 100644
index 0000000..651de1f
--- /dev/null
+++ b/components/patient/SoundSwitch.click.test.tsx
@@ -0,0 +1,146 @@
+// @vitest-environment happy-dom
+// Presses the buttons of the "Turn on sound" box in a test browser (happy-dom): late results of an
+// earlier tap change nothing, a double tap runs once, and focus never drops to the page.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { textFor } from "@/lib/text";
+import type { VisitStatus } from "@/lib/visit";
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
+let container: HTMLDivElement;
+let root: Root;
+
+function show(status: VisitStatus) {
+  act(() => root.render(<SoundSwitch status={status} language="en" />));
+}
+
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+const statusBox = () => container.querySelector('[role="status"]');
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+/** Finishes a slow promise and lets React show the result. */
+async function settle<T>(slow: { finish: (value: T) => void }, value: T) {
+  await act(async () => slow.finish(value));
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
+describe("SoundSwitch taps", () => {
+  it("stays off when Turn off is tapped while the test beep still waits", async () => {
+    const beep = later<boolean>();
+    vi.mocked(playAlert).mockReturnValue(beep.promise);
+    show("waiting");
+    await press(t.turnOn);
+    await press(t.turnOff);
+    await settle(beep, false);
+    expect(button(t.turnOn)).toBeDefined();
+    expect(container.textContent).not.toContain(t.failed);
+  });
+
+  it("can be turned on again after Turn off, even while the old test beep still waits", async () => {
+    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
+    show("waiting");
+    await press(t.turnOn);
+    await press(t.turnOff);
+    await press(t.turnOn);
+    expect(unlockSound).toHaveBeenCalledTimes(2);
+  });
+
+  it("runs a double tap once", async () => {
+    const unlock = later<boolean>();
+    vi.mocked(unlockSound).mockReturnValue(unlock.promise);
+    show("waiting");
+    await press(t.turnOn);
+    await press(t.turnOn);
+    await settle(unlock, true);
+    expect(unlockSound).toHaveBeenCalledTimes(1);
+  });
+
+  it("shows the failed line in the status box when the sound cannot start", async () => {
+    vi.mocked(unlockSound).mockResolvedValue(false);
+    show("waiting");
+    await press(t.turnOn);
+    expect(statusBox()?.textContent).toBe(t.failed);
+  });
+
+  it("stops the vibration and moves focus to Turn on sound after Turn off", async () => {
+    show("waiting");
+    await press(t.turnOn);
+    await press(t.turnOff);
+    expect(stopVibration).toHaveBeenCalled();
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+
+  it("moves focus to Turn on sound when the test beep fails", async () => {
+    vi.mocked(playAlert).mockResolvedValue(false);
+    show("waiting");
+    await press(t.turnOn);
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+});
+
+describe("SoundSwitch while called", () => {
+  it("does not start a new beep while the last one still waits for the player", async () => {
+    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
+    show("called");
+    await press(t.turnOn);
+    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
+    expect(playAlert).toHaveBeenCalledTimes(1);
+  });
+
+  it("ignores a late failed beep from before Turn off and Turn on", async () => {
+    const oldBeep = later<boolean>();
+    vi.mocked(playAlert).mockReturnValueOnce(oldBeep.promise);
+    show("called");
+    await press(t.turnOn);
+    await press(t.turnOff);
+    await press(t.turnOn);
+    await settle(oldBeep, false);
+    expect(container.textContent).toContain(t.on);
+  });
+
+  it("moves focus to Turn on sound when a beep fails and the sound goes off", async () => {
+    vi.mocked(playAlert).mockResolvedValue(false);
+    show("called");
+    await press(t.turnOn);
+    expect(button(t.turnOn)).toBeDefined();
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+});
diff --git a/components/patient/SoundSwitch.test.tsx b/components/patient/SoundSwitch.test.tsx
index 8e3cd77..8347e74 100644
--- a/components/patient/SoundSwitch.test.tsx
+++ b/components/patient/SoundSwitch.test.tsx
@@ -32,12 +32,14 @@ describe("SoundSwitch", () => {
     expect(html).toContain(textFor("fr").sound.turnOn);
   });
 
-  // "Sound is on" gets focus after the tap (a screen reader reads it then), so the box has no live
-  // region of its own: one would read the words twice, next to the page's other announcements.
-  it("has no live region of its own", () => {
+  // "Sound is on" gets focus after the tap (a screen reader reads it then), so it stays out of the
+  // live region: there it would be read twice. The one live region holds only the failed and
+  // offWhileCalled lines, and it is always on the page, so screen readers read a line when it appears.
+  it("has one empty status box while waiting, and never puts Sound is on in a live region", () => {
     const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="en" />);
-    expect(html).not.toContain('role="status"');
+    expect(html.match(/role="status"/g)).toHaveLength(1);
     expect(html).not.toContain("aria-live");
+    expect(html).toMatch(/<div role="status"[^>]*><\/div>/);
   });
 
   it("does not show Sound is on before the patient taps the button", () => {
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index bac0291..35647e4 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -16,16 +16,23 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   const soundOn = state === "on";
   const onWords = useRef<HTMLParagraphElement>(null);
   const turnOnButton = useRef<HTMLButtonElement>(null);
+  // Goes up by 1 on each "Turn on sound" and "Turn off sound" tap. A slow result that belongs to an
+  // earlier tap (a test beep, an unlock or a repeat beep) sees a different number and changes nothing.
+  const attempt = useRef(0);
   // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
   const busy = useRef(false);
-  // True after "Turn off sound" is tapped, so focus can move to "Turn on sound" once it is back on screen.
-  const focusTurnOn = useRef(false);
+  // True while a repeat beep still waits for the player, so the next one does not start on top of it.
+  const beeping = useRef(false);
+  // True when the last state shown was "on", so focus can move when the sound goes off.
+  const wasOn = useRef(false);
 
   async function turnOn() {
     if (busy.current) return;
     busy.current = true;
+    const mine = ++attempt.current;
     try {
       const ok = await unlockSound();
+      if (mine !== attempt.current) return;
       if (!ok) {
         setState("failed");
         return;
@@ -33,39 +40,42 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
       setState("on");
       // When the visit is already called, the effect below plays the alert, so no test beep is needed.
       // If the test beep cannot play, say so now, not only when the patient is called.
-      if (status !== "called" && !(await playAlert())) setState("failed");
+      if (status !== "called") {
+        const played = await playAlert();
+        if (mine === attempt.current && !played) setState("failed");
+      }
     } finally {
-      busy.current = false;
+      // After "Turn off sound" the next tap belongs to a new attempt, which turnOff() already freed.
+      if (mine === attempt.current) busy.current = false;
     }
   }
 
   function turnOff() {
-    focusTurnOn.current = true;
+    attempt.current += 1;
+    busy.current = false;
     setState("off");
     stopVibration();
   }
 
-  // The button goes away after the tap, so move keyboard and screen-reader focus to the words
-  // "Sound is on" (they are read out when focused) instead of losing it to the top of the page.
-  useEffect(() => {
-    if (soundOn) onWords.current?.focus();
-  }, [soundOn]);
-
-  // After "Turn off sound", the "Turn on sound" button is back: move focus to it, so focus is not lost.
+  // Focus follows the change, so it never drops to the top of the page when a button goes away.
+  // On: move to the words "Sound is on" (read out when focused). From on to off or failed, for any
+  // reason (a tap, a failed test beep, a failed repeat beep): move to "Turn on sound".
   useEffect(() => {
-    if (state === "off" && focusTurnOn.current) {
-      focusTurnOn.current = false;
-      turnOnButton.current?.focus();
-    }
+    if (state === "on") onWords.current?.focus();
+    else if (wasOn.current) turnOnButton.current?.focus();
+    wasOn.current = state === "on";
   }, [state]);
 
   // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
   // If the phone will not play the beep, the box goes back to "off" so the page can say so.
   useEffect(() => {
     const tick = () => {
-      if (!shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
+      if (beeping.current || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
+      beeping.current = true;
+      const mine = attempt.current;
       void playAlert().then((ok) => {
-        if (!ok) setState("off");
+        beeping.current = false;
+        if (!ok && mine === attempt.current) setState("off");
       });
     };
     tick();
@@ -96,12 +106,15 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
           {t.turnOn}
         </Button>
       )}
-      {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
-      {note === "offWhileCalled" && (
-        <p data-testid="sound-off-called" className="font-semibold">
-          {t.offWhileCalled}
-        </p>
-      )}
+      {/* Always on the page, so screen readers read a line when it appears. "Sound is on" stays out (see above). */}
+      <div role="status">
+        {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
+        {note === "offWhileCalled" && (
+          <p data-testid="sound-off-called" className="font-semibold">
+            {t.offWhileCalled}
+          </p>
+        )}
+      </div>
     </div>
   );
 }
diff --git a/components/patient/alertSound.test.ts b/components/patient/alertSound.test.ts
new file mode 100644
index 0000000..f31fbe9
--- /dev/null
+++ b/components/patient/alertSound.test.ts
@@ -0,0 +1,140 @@
+// Tests for the beep player with a fake browser sound player (no real sound plays).
+
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+
+/** A fake AudioContext. `resumeResult` decides what resume() does. */
+class FakeContext {
+  /** Every fake player made, so a test can close or pause them as the phone would. */
+  static made: FakeContext[] = [];
+  static resumeResult: "run" | "hang" | "reject-late" = "run";
+  state: "suspended" | "running" | "closed" = "suspended";
+  currentTime = 0;
+  destination = {};
+  constructor() {
+    FakeContext.made.push(this);
+  }
+  resume(): Promise<void> {
+    if (FakeContext.resumeResult === "run") {
+      if (this.state !== "closed") this.state = "running";
+      return Promise.resolve();
+    }
+    if (FakeContext.resumeResult === "hang") return new Promise(() => {});
+    return new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 2000));
+  }
+  createOscillator() {
+    return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
+  }
+  createGain() {
+    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
+  }
+}
+
+const vibrate = vi.fn();
+
+/** A fresh copy of the module, so the shared player starts empty in each test. */
+async function load() {
+  vi.resetModules();
+  return import("./alertSound");
+}
+
+/** Sets the state of every fake player, as the phone would. */
+function setAll(state: FakeContext["state"]) {
+  for (const ctx of FakeContext.made) ctx.state = state;
+}
+
+beforeEach(() => {
+  FakeContext.made = [];
+  FakeContext.resumeResult = "run";
+  vibrate.mockClear();
+  vi.stubGlobal("window", { AudioContext: FakeContext });
+  vi.stubGlobal("navigator", { vibrate });
+});
+
+afterEach(() => {
+  vi.useRealTimers();
+  vi.unstubAllGlobals();
+});
+
+describe("unlockSound", () => {
+  it("starts the player after a tap", async () => {
+    const { unlockSound } = await load();
+    expect(await unlockSound()).toBe(true);
+    expect(FakeContext.made).toHaveLength(1);
+  });
+
+  it("reuses the same player on a second tap", async () => {
+    const { unlockSound } = await load();
+    await unlockSound();
+    await unlockSound();
+    expect(FakeContext.made).toHaveLength(1);
+  });
+
+  it("makes a new player when the phone closed the old one", async () => {
+    const { unlockSound, playAlert } = await load();
+    await unlockSound();
+    setAll("closed");
+    expect(await unlockSound()).toBe(true);
+    expect(FakeContext.made).toHaveLength(2);
+    expect(await playAlert()).toBe(true);
+  });
+
+  it("gives false when the browser has no sound player", async () => {
+    vi.stubGlobal("window", {});
+    const { unlockSound } = await load();
+    expect(await unlockSound()).toBe(false);
+  });
+});
+
+describe("playAlert", () => {
+  it("plays when the player is running", async () => {
+    const { unlockSound, playAlert } = await load();
+    await unlockSound();
+    expect(await playAlert()).toBe(true);
+  });
+
+  it("still vibrates when there is no player", async () => {
+    const { playAlert } = await load();
+    expect(await playAlert()).toBe(false);
+    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
+  });
+
+  it("gives up after 1 second when the player will not start", async () => {
+    vi.useFakeTimers();
+    const { unlockSound, playAlert } = await load();
+    await unlockSound();
+    setAll("suspended");
+    FakeContext.resumeResult = "hang";
+    const result = playAlert();
+    await vi.advanceTimersByTimeAsync(1000);
+    expect(await result).toBe(false);
+  });
+
+  it("leaves no unhandled error when resume() fails after the wait", async () => {
+    const unhandled = vi.fn();
+    process.on("unhandledRejection", unhandled);
+    try {
+      vi.useFakeTimers();
+      const { unlockSound, playAlert } = await load();
+      await unlockSound();
+      setAll("suspended");
+      FakeContext.resumeResult = "reject-late";
+      const result = playAlert();
+      await vi.advanceTimersByTimeAsync(3000);
+      expect(await result).toBe(false);
+      // Give Node a short real wait to report an unhandled rejection, if there is one.
+      vi.useRealTimers();
+      await new Promise((resolve) => setTimeout(resolve, 20));
+      expect(unhandled).not.toHaveBeenCalled();
+    } finally {
+      process.off("unhandledRejection", unhandled);
+    }
+  });
+});
+
+describe("stopVibration", () => {
+  it("stops a running vibration", async () => {
+    const { stopVibration } = await load();
+    stopVibration();
+    expect(vibrate).toHaveBeenCalledWith(0);
+  });
+});
diff --git a/components/patient/alertSound.ts b/components/patient/alertSound.ts
index 07fae61..440de97 100644
--- a/components/patient/alertSound.ts
+++ b/components/patient/alertSound.ts
@@ -30,7 +30,8 @@ function waitAtMost(ms: number): Promise<void> {
  */
 export async function unlockSound(): Promise<boolean> {
   try {
-    if (!context) {
+    // A phone can close the player (for example when headphones change); then make a new one.
+    if (!context || context.state === "closed") {
       const AudioClass = audioContextClass();
       if (!AudioClass) return false;
       context = new AudioClass();
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index e75a1db..ae401a3 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -31,3 +31,13 @@ describe("CheckInPanel while the paused switch is not read", () => {
     expect(html).toContain("Start off-site waiting");
   });
 });
+
+describe("CheckInPanel while off-site waiting is paused", () => {
+  it("says it is paused and offers only on-site waiting", () => {
+    const html = render(true);
+    expect(html).toContain("Off-site waiting is paused at this site: the patient waits on-site.");
+    expect(html).not.toContain("Start off-site waiting");
+    expect(html).not.toContain("Offered, declined");
+    expect(html).toContain("Waits on-site");
+  });
+});
diff --git a/components/staff/Duration.test.tsx b/components/staff/Duration.test.tsx
new file mode 100644
index 0000000..8c3af3c
--- /dev/null
+++ b/components/staff/Duration.test.tsx
@@ -0,0 +1,18 @@
+// Checks that a staff time shows the short form on screen and gives screen readers the full words.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it } from "vitest";
+import { Duration } from "./Duration";
+
+describe("Duration", () => {
+  it("shows 1h 35min, hidden from screen readers, and the full words for them", () => {
+    expect(renderToStaticMarkup(<Duration minutes={95} />)).toBe(
+      '<span aria-hidden="true">1h 35min</span><span class="sr-only">1 hour 35 minutes</span>',
+    );
+  });
+
+  it("uses the same rule for short and whole-hour times", () => {
+    expect(renderToStaticMarkup(<Duration minutes={45} />)).toContain('<span class="sr-only">45 minutes</span>');
+    expect(renderToStaticMarkup(<Duration minutes={120} />)).toContain('<span aria-hidden="true">2h</span><span class="sr-only">2 hours</span>');
+  });
+});
diff --git a/components/staff/Duration.tsx b/components/staff/Duration.tsx
new file mode 100644
index 0000000..addd697
--- /dev/null
+++ b/components/staff/Duration.tsx
@@ -0,0 +1,15 @@
+// One staff time: "1h 35min" on screen, and "1 hour 35 minutes" for screen readers, which can
+// read "h" and "min" as letters. Staff screens are in English only.
+
+import { formatMinutes } from "@/lib/duration";
+import { enDuration } from "@/lib/text/en";
+import { formatDuration } from "@/lib/waitText";
+
+export function Duration({ minutes }: { minutes: number }) {
+  return (
+    <>
+      <span aria-hidden="true">{formatMinutes(minutes)}</span>
+      <span className="sr-only">{formatDuration(minutes, enDuration)}</span>
+    </>
+  );
+}
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index a151e05..9f3ef96 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -8,7 +8,7 @@
 import { useState, type FormEvent } from "react";
 import { findVisitByCode } from "@/data/staffActions";
 import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
-import { formatMinutes } from "@/lib/duration";
+import { Duration } from "./Duration";
 import { minutesBetween } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -107,7 +107,7 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
             >
               <p>
                 <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · started{" "}
-                {formatMinutes(minutesBetween(visit.created_at, now))} ago
+                <Duration minutes={minutesBetween(visit.created_at, now)} /> ago
               </p>
               <Button variant="secondary" onClick={() => onChoose(visit)}>
                 Check in<span className="sr-only"> visit {visit.code}</span>
diff --git a/components/staff/FollowUpPanel.test.ts b/components/staff/FollowUpPanel.test.ts
new file mode 100644
index 0000000..b862064
--- /dev/null
+++ b/components/staff/FollowUpPanel.test.ts
@@ -0,0 +1,36 @@
+// Checks the words that screen readers hear for a staff flag: they leave out the minute count,
+// so they do not change (and are not read again) every minute.
+
+import type { ReactElement } from "react";
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { checkInAtDesk } from "@/lib/visitActions";
+import { flagFor } from "./FollowUpPanel";
+
+// The panel's buttons save through Supabase; this test never presses them.
+vi.mock("@/data/staffActions", () => ({}));
+
+const now = new Date("2026-11-15T20:00:00Z");
+const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
+const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
+
+describe("flagFor spoken words", () => {
+  it.each([5, 95])("says 'On the way, not arrived.' with no time, %i minutes after the tap", (minutes) => {
+    const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), confirmed_at: minutesAgo(minutes) };
+    const flag = flagFor({ kind: "on_way_not_arrived" }, visit, now);
+    expect(flag?.spoken).toBe("On the way, not arrived.");
+    expect(flag?.text).toContain("ago");
+  });
+
+  it("shows 1h 35min on screen and gives screen readers the full words", () => {
+    const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), confirmed_at: minutesAgo(95) };
+    const html = renderToStaticMarkup(flagFor({ kind: "on_way_not_arrived" }, visit, now)?.body as ReactElement);
+    expect(html).toContain('Confirmed <span aria-hidden="true">1h 35min</span><span class="sr-only">1 hour 35 minutes</span> ago.');
+  });
+
+  it("speaks the full words when the flag has no time in it", () => {
+    const visit = checkInAtDesk(input, "waiting", new Date(minutesAgo(30)));
+    const flag = flagFor({ kind: "contacted_not_arrived" }, visit, now);
+    expect(flag?.spoken).toBe(flag?.text);
+  });
+});
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
index 5e94ec7..fa1700c 100644
--- a/components/staff/FollowUpPanel.tsx
+++ b/components/staff/FollowUpPanel.tsx
@@ -11,6 +11,8 @@ import { formatMinutes } from "@/lib/duration";
 import { minutesBetween } from "@/lib/queue";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
+import type { ReactNode } from "react";
+import { Duration } from "./Duration";
 
 type Props = {
   visit: Visit;
@@ -25,31 +27,49 @@ const RED = "border-red-800 bg-red-50 text-red-900";
 
 const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
 
-/** The words and colour of each flag; null when there is nothing to flag. */
-function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): { text: string; tone: string } | null {
+/**
+ * One flag: its words, their colour, and the words screen readers hear. `body`, when there, is what
+ * the screen shows in place of `text` (with a time that screen readers hear in full words).
+ */
+type Flag = { text: string; tone: string; spoken: string; body?: ReactNode };
+
+/** A flag whose spoken words are the same as its words on screen. */
+const same = (text: string, tone: string): Flag => ({ text, tone, spoken: text });
+
+/**
+ * The words and colour of each flag; null when there is nothing to flag. `spoken` leaves out
+ * minute counts, so the words do not change, and are not read again, every minute.
+ */
+export function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): Flag | null {
   switch (followUp.kind) {
     case "phone":
-      return { text: `No reply ${CALL_SECOND_ALERT_MINUTES} min after call-back. Phone the patient now.`, tone: AMBER };
+      return same(`No reply ${CALL_SECOND_ALERT_MINUTES} min after call-back. Phone the patient now.`, AMBER);
     case "phone_again": {
       // "again" only if someone already phoned; staff may have missed the first flag.
       const ask = visit.phone_attempts === 0 ? "Phone the patient now." : "Phone the patient again.";
-      return { text: `Still no reply ${CALL_PHONE_AGAIN_MINUTES} min after call-back. ${ask}`, tone: AMBER };
+      return same(`Still no reply ${CALL_PHONE_AGAIN_MINUTES} min after call-back. ${ask}`, AMBER);
     }
     case "paused":
-      return { text: `Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, tone: AMBER };
+      return same(`Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, AMBER);
     case "review":
-      return {
-        text: `Review: unable to reach. No answered call ${CALL_REVIEW_MINUTES} min after the call-back. Stays in the line until a nurse confirms.`,
-        tone: RED,
-      };
+      return same(
+        `Review: unable to reach. No answered call ${CALL_REVIEW_MINUTES} min after the call-back. Stays in the line until a nurse confirms.`,
+        RED,
+      );
     case "contacted_not_arrived":
+      return same("Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet.", AMBER);
+    case "on_way_not_arrived": {
+      const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
       return {
-        text: "Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet.",
+        text: `On the way, not arrived. Confirmed ${formatMinutes(since)} ago.`,
         tone: AMBER,
+        spoken: "On the way, not arrived.",
+        body: (
+          <>
+            On the way, not arrived. Confirmed <Duration minutes={since} /> ago.
+          </>
+        ),
       };
-    case "on_way_not_arrived": {
-      const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
-      return { text: `On the way, not arrived. Confirmed ${formatMinutes(since)} ago.`, tone: AMBER };
     }
     default:
       return null;
@@ -60,9 +80,8 @@ export function FollowUpPanel({ visit, now, saving, act }: Props) {
   const followUp = staffFollowUp(visit, now);
   const flag = flagFor(followUp, visit, now);
   const canPhone = canRecordPhoneCall(visit, now);
-  // Screen readers hear each new flag once (politely). The minute counts are left out so the
-  // words do not change, and so are not read again, every minute.
-  const spoken = flag ? `Visit ${visit.code}: ${flag.text.replace(/ Confirmed [^.]+ ago\./, "")}` : "";
+  // Screen readers hear each new flag once (politely), without the minute counts.
+  const spoken = flag ? `Visit ${visit.code}: ${flag.spoken}` : "";
   const announcer = (
     <p role="status" className="sr-only">
       {spoken}
@@ -77,7 +96,7 @@ export function FollowUpPanel({ visit, now, saving, act }: Props) {
         <div className="mt-2 space-y-2" data-testid="follow-up">
           {flag && (
             <p className={`rounded-lg border-2 p-2 font-semibold ${flag.tone}`} data-testid={`flag-${followUp.kind}`}>
-              {flag.text}
+              {flag.body ?? flag.text}
             </p>
           )}
           {canPhone && (
diff --git a/components/staff/NewLinkPanel.click.test.tsx b/components/staff/NewLinkPanel.click.test.tsx
new file mode 100644
index 0000000..3e1f511
--- /dev/null
+++ b/components/staff/NewLinkPanel.click.test.tsx
@@ -0,0 +1,83 @@
+// @vitest-environment happy-dom
+// Presses the buttons of the lost-phone panel in a test browser (happy-dom): the confirm question,
+// where focus goes, and that "Yes" does nothing while a change is still saving.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { NewLinkPanel } from "./NewLinkPanel";
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+let container: HTMLDivElement;
+let root: Root;
+
+function show(saving: boolean, onConfirm = vi.fn()) {
+  act(() => root.render(<NewLinkPanel code="ABC234" saving={saving} onConfirm={onConfirm} />));
+  return onConfirm;
+}
+
+/** The button whose words start with `words` (some buttons also hold hidden words for screen readers). */
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+/** Lets the panel's one-tick focus wait (setTimeout 0) run. */
+const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
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
+describe("NewLinkPanel taps", () => {
+  it("asks first: Issue a new link shows Yes and Cancel, and focus moves to Yes", async () => {
+    show(false);
+    await press("Issue a new link");
+    expect(button("Yes, issue a new link")).toBeDefined();
+    expect(button("Cancel")).toBeDefined();
+    expect(button("Issue a new link")).toBeUndefined();
+    expect(document.activeElement).toBe(button("Yes, issue a new link"));
+  });
+
+  it("Cancel closes the question, issues nothing, and brings focus back to Issue a new link", async () => {
+    const onConfirm = show(false);
+    await press("Issue a new link");
+    await press("Cancel");
+    await nextTick();
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(button("Yes, issue a new link")).toBeUndefined();
+    expect(document.activeElement).toBe(button("Issue a new link"));
+  });
+
+  it("Yes issues the link once and brings focus back to Issue a new link", async () => {
+    const onConfirm = show(false);
+    await press("Issue a new link");
+    await press("Yes, issue a new link");
+    await nextTick();
+    expect(onConfirm).toHaveBeenCalledTimes(1);
+    expect(document.activeElement).toBe(button("Issue a new link"));
+  });
+
+  it("Yes does nothing while a change is still saving", async () => {
+    const onConfirm = show(false);
+    await press("Issue a new link");
+    show(true, onConfirm);
+    await press("Yes, issue a new link");
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(button("Yes, issue a new link")).toBeDefined();
+  });
+});
diff --git a/components/staff/VisitRow.test.tsx b/components/staff/VisitRow.test.tsx
index b8e8d3a..c967dc0 100644
--- a/components/staff/VisitRow.test.tsx
+++ b/components/staff/VisitRow.test.tsx
@@ -14,18 +14,21 @@ const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as co
 const render = (visit: Parameters<typeof VisitRow>[0]["visit"]) =>
   renderToStaticMarkup(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />);
 
+/** A time as the Duration piece shows it: the short form on screen, the full words for screen readers. */
+const shown = (short: string, words: string) => `<span aria-hidden="true">${short}</span><span class="sr-only">${words}</span>`;
+
 describe("VisitRow times", () => {
   it("shows the wait as 1h 35min after 95 minutes", () => {
     const html = render(checkInAtDesk(input, "waiting", minutesAgo(95)));
-    expect(html).toContain("waited <strong>1h 35min</strong>");
+    expect(html).toContain(`waited <strong>${shown("1h 35min", "1 hour 35 minutes")}</strong>`);
   });
 
   it("shows the call-back time in hours and minutes", () => {
     const visit = callBack(checkInAtDesk(input, "waiting", minutesAgo(200)), minutesAgo(166))!;
-    expect(render(visit)).toContain("Called 2h 46min ago");
+    expect(render(visit)).toContain(`Called ${shown("2h 46min", "2 hours 46 minutes")} ago`);
   });
 
   it("keeps short times in minutes", () => {
-    expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain("waited <strong>45 min</strong>");
+    expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain(`waited <strong>${shown("45 min", "45 minutes")}</strong>`);
   });
 });
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index df232e5..d96b01a 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -3,14 +3,14 @@
 // One patient in the staff's off-site list: minutes waited, call-back progress and actions.
 // The no-response flags and phone-call buttons are in FollowUpPanel.
 
-import { useState } from "react";
+import { useState, type ReactNode } from "react";
 import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
-import { formatMinutes } from "@/lib/duration";
 import { minutesBetween } from "@/lib/queue";
 import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
 import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
+import { Duration } from "./Duration";
 import { FollowUpPanel } from "./FollowUpPanel";
 import { NewLinkPanel } from "./NewLinkPanel";
 
@@ -25,20 +25,28 @@ type Props = {
 const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
 const CHANGED = "The list just changed. Check this patient again.";
 
-function progress(visit: Visit, now: Date): string {
+function progress(visit: Visit, now: Date): ReactNode {
   if (visit.status === "waiting") {
     // "I'm still here" only shows the patient is still following the visit; never a health check.
     const lastTap = lastTapThisWait({ triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at });
-    return lastTap
-      ? `Waiting off-site · last "I'm still here" ${formatMinutes(minutesBetween(lastTap, now))} ago`
-      : "Waiting off-site";
+    if (!lastTap) return "Waiting off-site";
+    return (
+      <>
+        {`Waiting off-site · last "I'm still here" `}
+        <Duration minutes={minutesBetween(lastTap, now)} /> ago
+      </>
+    );
   }
   const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
-  const steps = [`Called ${formatMinutes(sinceCall)} ago`];
+  const steps: string[] = [];
   // seen_at means the called screen was displayed on the phone, not that the patient read it.
   if (visit.seen_at) steps.push("Seen (screen shown, not necessarily read)");
   if (visit.status === "on_the_way") steps.push("On the way");
-  return steps.join(" · ");
+  return (
+    <>
+      Called <Duration minutes={sinceCall} /> ago{steps.map((step) => ` · ${step}`).join("")}
+    </>
+  );
 }
 
 export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
@@ -70,7 +78,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       <div className="flex flex-wrap items-baseline justify-between gap-2">
         <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
         <p>
-          CTAS {visit.ctas_level} · waited <strong>{formatMinutes(waited)}</strong>
+          CTAS {visit.ctas_level} · waited <strong><Duration minutes={waited} /></strong>
         </p>
       </div>
       <p className="mt-1 font-semibold" data-testid="progress">
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index 270aa1e..3c1ca72 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -3,7 +3,10 @@
 // fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
 // handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
 // Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
+// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
 
+import type { DurationWords } from "./durationWords";
 import type { PatientText } from "./en";
 
 export const ar: PatientText = {
@@ -69,6 +72,8 @@ export const ar: PatientText = {
     placeCanChange: "يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
     waitLabel: "الوقت المقدر حتى يتم استدعاؤك للعودة:",
     waitRange: "من {low} إلى {high} دقيقة",
+    // Used when the range reaches an hour; each end is built from the Duration words below.
+    waitRangeLong: "من {low} إلى {high}",
     simulated: "هذا التقدير محاكى للعرض التجريبي.",
     calledHeading: "يرجى العودة الآن",
     calledText: "يرجى العودة إلى مكتب قسم الطوارئ.",
@@ -146,3 +151,12 @@ export const ar: PatientText = {
   },
   offline: "أنت غير متصل بالإنترنت. أعد الاتصال بالإنترنت لمعرفة حالتك.",
 };
+
+/** Hour and minute words for the wait range (lib/waitText.ts). */
+export const arDuration: DurationWords = {
+  locale: "ar",
+  // 1 and 2 have no digit; 2 takes the form used after "من" and "إلى".
+  hour: { one: "ساعة", two: "ساعتين", few: "{n} ساعات", many: "{n} ساعة", other: "{n} ساعة" },
+  minute: { one: "دقيقة", two: "دقيقتين", few: "{n} دقائق", many: "{n} دقيقة", other: "{n} دقيقة" },
+  join: "{h} و{m}",
+};
diff --git a/lib/text/durationWords.ts b/lib/text/durationWords.ts
new file mode 100644
index 0000000..7af333e
--- /dev/null
+++ b/lib/text/durationWords.ts
@@ -0,0 +1,24 @@
+// The shape of the hour and minute words for one language (the words are in en.ts, fr.ts and so on).
+// Each word form holds "{n}" where the number goes. Arabic leaves "{n}" out for 1 and 2
+// ("ساعة", "ساعتين"), because natural Arabic says the count with the word itself.
+
+/**
+ * Word forms named by the browser's plural rules (Intl.PluralRules): for example English uses
+ * "one" (1) and "other" (2, 3, ...); Arabic also uses "two", "few" (3 to 10) and "many" (11 to 99).
+ * "other" is always there, so a missing form falls back to it.
+ */
+export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
+
+export type DurationWords = {
+  /** The language code the plural rules use, for example "ar". */
+  locale: string;
+  hour: PluralForms;
+  minute: PluralForms;
+  /** Joins hours and minutes, for example "{h} {m}" or Arabic "{h} و{m}". */
+  join: string;
+  /**
+   * Urdu only: the hour word when a whole hour is the low end of a range, just before "سے"
+   * ("1 گھنٹے سے 2 گھنٹے"). Other languages leave it out and use `hour`.
+   */
+  hourLow?: PluralForms;
+};
diff --git a/lib/text/en.ts b/lib/text/en.ts
index f976ff5..32079d4 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -2,6 +2,10 @@
 // Wording approved by the owner on 2026-11-10 (handoffs/archive/2026-11-10-gemini-patient-wording-phase3-response.md).
 // Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
 // Words in {braces} are filled in by the app (for example {low}); translators keep them as they are.
+// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
+// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
+
+import type { DurationWords } from "./durationWords";
 
 export const en = {
   // SPEC rule 3: on every patient screen, in every state and every language.
@@ -82,6 +86,8 @@ export const en = {
     // SPEC
     waitLabel: "Estimated time until you're called back:",
     waitRange: "{low} to {high} minutes",
+    // Used when the range reaches an hour; each end is built from the Duration words below.
+    waitRangeLong: "{low} to {high}",
     simulated: "This estimate is simulated for the demo.",
 
     calledHeading: "Please head back now",
@@ -174,3 +180,11 @@ export const en = {
 
 /** The shape every language's text must have. */
 export type PatientText = typeof en;
+
+/** Hour and minute words for the wait range (lib/waitText.ts) and the staff screen-reader words. */
+export const enDuration: DurationWords = {
+  locale: "en",
+  hour: { one: "{n} hour", other: "{n} hours" },
+  minute: { one: "{n} minute", other: "{n} minutes" },
+  join: "{h} {m}",
+};
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index 7b41c64..827a707 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -3,7 +3,10 @@
 // fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
 // handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
 // Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
+// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
 
+import type { DurationWords } from "./durationWords";
 import type { PatientText } from "./en";
 
 export const fr: PatientText = {
@@ -69,6 +72,8 @@ export const fr: PatientText = {
     placeCanChange: "Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.",
     waitLabel: "Temps estimé avant d'être rappelé :",
     waitRange: "{low} à {high} minutes",
+    // Used when the range reaches an hour; each end is built from the Duration words below.
+    waitRangeLong: "{low} à {high}",
     simulated: "Cette estimation est simulée pour la démonstration.",
     calledHeading: "Veuillez revenir maintenant",
     calledText: "Veuillez retourner au bureau du service des urgences.",
@@ -146,3 +151,11 @@ export const fr: PatientText = {
   },
   offline: "Vous êtes hors ligne. Reconnectez-vous à Internet pour voir votre statut.",
 };
+
+/** Hour and minute words for the wait range (lib/waitText.ts). */
+export const frDuration: DurationWords = {
+  locale: "fr",
+  hour: { one: "{n} heure", other: "{n} heures" },
+  minute: { one: "{n} minute", other: "{n} minutes" },
+  join: "{h} {m}",
+};
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index a5c709f..9c8708d 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -3,7 +3,10 @@
 // fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
 // handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
 // Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
+// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
 
+import type { DurationWords } from "./durationWords";
 import type { PatientText } from "./en";
 
 export const ur: PatientText = {
@@ -69,6 +72,8 @@ export const ur: PatientText = {
     placeCanChange: "اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
     waitLabel: "واپس بلائے جانے تک کا تخمینہ وقت:",
     waitRange: "{low} سے {high} منٹ",
+    // Used when the range reaches an hour; each end is built from the Duration words below.
+    waitRangeLong: "{low} سے {high}",
     simulated: "یہ تخمینہ ڈیمو کے لیے فرضی ہے۔",
     calledHeading: "براہ کرم اب واپس آ جائیں",
     calledText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر واپس جائیں۔",
@@ -146,3 +151,13 @@ export const ur: PatientText = {
   },
   offline: "آپ آف لائن ہیں۔ اپنا سٹیٹس دیکھنے کے لیے دوبارہ انٹرنیٹ سے کنیکٹ کریں۔",
 };
+
+/** Hour and minute words for the wait range (lib/waitText.ts). */
+export const urDuration: DurationWords = {
+  locale: "ur",
+  hour: { one: "{n} گھنٹہ", other: "{n} گھنٹے" },
+  // A whole hour just before "سے" takes "گھنٹے", also for 1.
+  hourLow: { one: "{n} گھنٹے", other: "{n} گھنٹے" },
+  minute: { other: "{n} منٹ" },
+  join: "{h} {m}",
+};
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index 56dadd4..2edb11c 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -3,7 +3,10 @@
 // fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
 // handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
 // Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
+// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
 
+import type { DurationWords } from "./durationWords";
 import type { PatientText } from "./en";
 
 export const zh: PatientText = {
@@ -69,6 +72,8 @@ export const zh: PatientText = {
     placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
     waitLabel: "预计还需多久叫您回来：",
     waitRange: "{low} 到 {high} 分钟",
+    // Used when the range reaches an hour; each end is built from the Duration words below.
+    waitRangeLong: "{low} 到 {high}",
     simulated: "此估计时间是为演示而模拟的。",
     calledHeading: "请现在回来",
     calledText: "请回到急诊室前台。",
@@ -146,3 +151,11 @@ export const zh: PatientText = {
   },
   offline: "您已离线。请重新连接到互联网以查看您的状态。",
 };
+
+/** Hour and minute words for the wait range (lib/waitText.ts). */
+export const zhDuration: DurationWords = {
+  locale: "zh",
+  hour: { other: "{n} 小时" },
+  minute: { other: "{n} 分钟" },
+  join: "{h} {m}",
+};
diff --git a/lib/waitText.test.ts b/lib/waitText.test.ts
new file mode 100644
index 0000000..e605be9
--- /dev/null
+++ b/lib/waitText.test.ts
@@ -0,0 +1,65 @@
+// Checks the wait range words in all five languages, and the minutes-in-words rule the staff
+// screen readers use.
+
+import { describe, expect, it } from "vitest";
+import { enDuration } from "./text/en";
+import { formatDuration, formatWaitRange } from "./waitText";
+
+describe("formatDuration (English)", () => {
+  it("says minutes alone under an hour", () => {
+    expect(formatDuration(45, enDuration)).toBe("45 minutes");
+  });
+
+  it("says hours and minutes, singular for 1", () => {
+    expect(formatDuration(95, enDuration)).toBe("1 hour 35 minutes");
+    expect(formatDuration(61, enDuration)).toBe("1 hour 1 minute");
+    expect(formatDuration(140, enDuration)).toBe("2 hours 20 minutes");
+  });
+
+  it("leaves out 0 minutes for whole hours", () => {
+    expect(formatDuration(60, enDuration)).toBe("1 hour");
+    expect(formatDuration(120, enDuration)).toBe("2 hours");
+  });
+
+  it("counts a negative or broken number as 0", () => {
+    expect(formatDuration(-5, enDuration)).toBe("0 minutes");
+    expect(formatDuration(Number.NaN, enDuration)).toBe("0 minutes");
+  });
+});
+
+describe("formatWaitRange", () => {
+  it("keeps the short line when both ends are under an hour", () => {
+    expect(formatWaitRange(20, 45, "en")).toBe("20 to 45 minutes");
+  });
+
+  it("English", () => {
+    expect(formatWaitRange(45, 80, "en")).toBe("45 minutes to 1 hour 20 minutes");
+    expect(formatWaitRange(95, 140, "en")).toBe("1 hour 35 minutes to 2 hours 20 minutes");
+    expect(formatWaitRange(60, 120, "en")).toBe("1 hour to 2 hours");
+  });
+
+  it("French", () => {
+    expect(formatWaitRange(45, 80, "fr")).toBe("45 minutes à 1 heure 20 minutes");
+  });
+
+  it("Urdu, with گھنٹے for a whole hour before سے", () => {
+    expect(formatWaitRange(45, 80, "ur")).toBe("45 منٹ سے 1 گھنٹہ 20 منٹ");
+    expect(formatWaitRange(60, 120, "ur")).toBe("1 گھنٹے سے 2 گھنٹے");
+    expect(formatWaitRange(95, 120, "ur")).toBe("1 گھنٹہ 35 منٹ سے 2 گھنٹے");
+  });
+
+  it("Arabic, with no digit for 1 and 2 hours", () => {
+    expect(formatWaitRange(45, 80, "ar")).toBe("من 45 دقيقة إلى ساعة و20 دقيقة");
+    expect(formatWaitRange(120, 180, "ar")).toBe("من ساعتين إلى 3 ساعات");
+    expect(formatWaitRange(45, 65, "ar")).toBe("من 45 دقيقة إلى ساعة و5 دقائق");
+    expect(formatWaitRange(600, 665, "ar")).toBe("من 10 ساعات إلى 11 ساعة و5 دقائق");
+  });
+
+  it("Mandarin", () => {
+    expect(formatWaitRange(45, 80, "zh")).toBe("45 分钟 到 1 小时 20 分钟");
+  });
+
+  it("gives English for a language with no words of its own", () => {
+    expect(formatWaitRange(45, 80, "xx")).toBe("45 minutes to 1 hour 20 minutes");
+  });
+});
diff --git a/lib/waitText.ts b/lib/waitText.ts
new file mode 100644
index 0000000..c95c4a6
--- /dev/null
+++ b/lib/waitText.ts
@@ -0,0 +1,43 @@
+// Turns a number of minutes into words a patient reads ("1 hour 35 minutes"), and builds the
+// wait range line in the patient's language ("45 minutes to 1 hour 20 minutes").
+
+import { fill, textFor } from "./text";
+import { arDuration } from "./text/ar";
+import type { DurationWords, PluralForms } from "./text/durationWords";
+import { enDuration } from "./text/en";
+import { frDuration } from "./text/fr";
+import { urDuration } from "./text/ur";
+import { zhDuration } from "./text/zh";
+
+/** Hour and minute words for each language. A language without its own words gets English, as in textFor(). */
+const WORDS: Record<string, DurationWords> = { en: enDuration, fr: frDuration, ur: urDuration, ar: arDuration, zh: zhDuration };
+
+/** Picks the right word form for the number n and puts n in it, for example (forms, 3, "ar") gives "3 ساعات". */
+function pickForm(forms: PluralForms, n: number, locale: string): string {
+  const form = forms[new Intl.PluralRules(locale).select(n)] ?? forms.other;
+  return fill(form, { n });
+}
+
+/**
+ * Minutes in words: 45 gives "45 minutes", 95 gives "1 hour 35 minutes", 120 gives "2 hours".
+ * `end` is "low" when the result is the low end of a range (Urdu uses another hour word there
+ * when there are no minutes). A negative or broken number counts as 0, as in formatMinutes().
+ */
+export function formatDuration(minutes: number, words: DurationWords, end: "low" | "high" = "high"): string {
+  const whole = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
+  if (whole < 60) return pickForm(words.minute, whole, words.locale);
+  const hours = Math.floor(whole / 60);
+  const rest = whole % 60;
+  const hourForms = end === "low" && rest === 0 ? (words.hourLow ?? words.hour) : words.hour;
+  const hourText = pickForm(hourForms, hours, words.locale);
+  if (rest === 0) return hourText;
+  return fill(words.join, { h: hourText, m: pickForm(words.minute, rest, words.locale) });
+}
+
+/** The wait range line: "20 to 45 minutes" under an hour, else both ends in hours and minutes. */
+export function formatWaitRange(low: number, high: number, language: string | null | undefined): string {
+  const t = textFor(language).patient;
+  if (high < 60) return fill(t.waitRange, { low, high });
+  const words = (language && WORDS[language]) || enDuration;
+  return fill(t.waitRangeLong, { low: formatDuration(low, words, "low"), high: formatDuration(high, words, "high") });
+}
\ No newline at end of file
diff --git a/package.json b/package.json
index d5a2c2b..8bb6630 100644
--- a/package.json
+++ b/package.json
@@ -26,6 +26,7 @@
     "axe-core": "4.14.0",
     "eslint": "^9",
     "eslint-config-next": "16.4.6",
+    "happy-dom": "^21.0.4",
     "tailwindcss": "4.3.3",
     "typescript": "^5",
     "vitest": "^5.1.0"
```
