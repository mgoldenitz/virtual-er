# Gemini review: sound box pause and locked-phone fix (2026-11-15)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Give the model all of this file. It holds no keys, tokens, passwords or patient data (the app uses synthetic data only).

## Prompt

You review a concept prototype: a virtual ER waiting room (Next.js 16 App Router, React 19, TypeScript, vitest with happy-dom for click tests). The patient screen has a "Turn on sound" box that beeps while the visit is called.

The diff below fixes two problems from an earlier review. Your job is to find problems in this diff, not to confirm it. For each problem, give the file, the line, a concrete case that fails (inputs or the steps of a user), and the smallest fix. If you find no problem in an area, say so in one line. Do not suggest new features.

Facts about the app (do not report cases that need something else): visit statuses only move forward (waiting, called, on the way, then closed); there is no undo for a recall. The sound box is on the page only while the status is `waiting` or `called`; when it leaves the page, the attempt counter goes up.

What the diff must do:

1. When a new tap on "Turn on sound" fails again after an earlier failure, the failed line (in a `role="status"` box) stays empty for at least 500 ms (`STATUS_CLEAR_MS`) before it shows again, so screen readers read it again. `unlockSound()` (which calls `AudioContext.resume()`) must still run inside the tap, before any wait.
2. When the page goes hidden (phone locked) while a repeat beep waits for the audio player, the beep does not play and the sound stays on (the box does not go to "off"). The next `visibilitychange` tick tries again.

Questions:

- Can the 500 ms wait show a stale failed line, for example after "Turn off sound" is not possible (the box is off), after the box leaves the page, or after a status change during the wait?
- While the wait runs, `busy` stays true, so a tap on "Turn on sound" does nothing. Is that a problem for a patient?
- Is 500 ms enough for VoiceOver on iPhone and TalkBack to read the same polite status line again? If not, which number and why?
- With the locked-phone fix, can a beep that really failed (the phone will not play) now leave the box on "Sound is on" forever?
- Do the new tests prove each point, or can a test pass while the behaviour is wrong?

## Checked (output in this session)

- `npm test`: 44 test files, 267 tests passed.
- `npm run lint`: no errors.
- `npm run build`: passed.
- The two new behaviour tests failed before the fix (save point `71ed446`); the fix is `b4a0e54`.
- The new phone-tap test fails when `|| state === "failed"` is taken out of the focus rule.

## Not checked

- A real screen reader (VoiceOver, TalkBack, NVDA) on the sound box.
- A real phone for the beep, the lock during a beep and the phone-tap focus.
- The Playwright phone and laptop tests were not run again for this diff.

## Diff (`12b5644..b4a0e54`, code only)

```diff
diff --git a/components/patient/SoundSwitch.click.test.tsx b/components/patient/SoundSwitch.click.test.tsx
index a80ab32..a9d1ba9 100644
--- a/components/patient/SoundSwitch.click.test.tsx
+++ b/components/patient/SoundSwitch.click.test.tsx
@@ -5,6 +5,7 @@
 import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { STATUS_CLEAR_MS } from "@/lib/calledAlert";
 import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
 import { playAlert, stopVibration, unlockSound } from "./alertSound";
@@ -43,6 +44,12 @@ async function press(words: string) {
   await act(async () => target.click());
 }
 
+/** Copies a locked phone (the page is hidden) or an unlocked one. */
+function hidePage(hidden: boolean) {
+  if (hidden) Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
+  else delete (document as { visibilityState?: string }).visibilityState;
+}
+
 /** Finishes a slow promise and lets React show the result. */
 async function settle<T>(slow: { finish: (value: T) => void }, value: T) {
   await act(async () => slow.finish(value));
@@ -60,6 +67,8 @@ beforeEach(() => {
 afterEach(() => {
   act(() => root.unmount());
   container.remove();
+  hidePage(false);
+  vi.useRealTimers();
 });
 
 describe("SoundSwitch taps", () => {
@@ -124,6 +133,7 @@ describe("SoundSwitch taps", () => {
   });
 
   it("clears the failed line on a new try, so screen readers read it again if it fails again", async () => {
+    vi.useFakeTimers();
     vi.mocked(unlockSound).mockResolvedValueOnce(false);
     show("waiting");
     await press(t.turnOn);
@@ -133,9 +143,29 @@ describe("SoundSwitch taps", () => {
     await press(t.turnOn);
     expect(statusBox()?.textContent).toBe("");
     await settle(unlock, false);
+    await act(async () => vi.advanceTimersByTimeAsync(STATUS_CLEAR_MS));
+    expect(statusBox()?.textContent).toBe(t.failed);
+  });
+
+  it("keeps the line empty for a pause before it shows failed again, when the new try fails at once", async () => {
+    vi.useFakeTimers();
+    vi.mocked(unlockSound).mockResolvedValue(false);
+    show("waiting");
+    await press(t.turnOn);
+    await press(t.turnOn);
+    await act(async () => vi.advanceTimersByTimeAsync(STATUS_CLEAR_MS - 1));
+    expect(statusBox()?.textContent).toBe("");
+    await act(async () => vi.advanceTimersByTimeAsync(1));
     expect(statusBox()?.textContent).toBe(t.failed);
   });
 
+  it("moves focus to Turn on sound after a phone tap (focus on the page) when the sound cannot start", async () => {
+    vi.mocked(unlockSound).mockResolvedValue(false);
+    show("waiting");
+    await act(async () => button(t.turnOn)?.click());
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+
   it("moves focus to Turn on sound when the test beep fails", async () => {
     vi.mocked(playAlert).mockResolvedValue(false);
     show("waiting");
@@ -206,6 +236,17 @@ describe("SoundSwitch while called", () => {
     expect(document.activeElement).toBe(other);
   });
 
+  it("keeps the sound on when the phone is locked while a repeat beep waits for the player", async () => {
+    const beep = later<boolean>();
+    vi.mocked(playAlert).mockReturnValue(beep.promise);
+    show("called");
+    await press(t.turnOn);
+    hidePage(true);
+    await settle(beep, false);
+    hidePage(false);
+    expect(button(t.turnOff)).toBeDefined();
+  });
+
   it("moves focus to Turn on sound when a beep fails and the sound goes off", async () => {
     vi.mocked(playAlert).mockResolvedValue(false);
     show("called");
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index 5da1098..f2f1a15 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -5,11 +5,16 @@
 
 import { useEffect, useRef, useState } from "react";
 import { Button } from "@/components/Button";
-import { ALERT_REPEAT_MS, type SoundState, shouldAlert, soundNote } from "@/lib/calledAlert";
+import { ALERT_REPEAT_MS, STATUS_CLEAR_MS, type SoundState, shouldAlert, soundNote } from "@/lib/calledAlert";
 import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
 import { playAlert, stopVibration, unlockSound } from "./alertSound";
 
+/** Waits this many milliseconds (none when the number is 0 or less). */
+function waitMs(ms: number): Promise<void> {
+  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
+}
+
 export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
   const t = textFor(language).sound;
   const [state, setState] = useState<SoundState>("off");
@@ -32,13 +37,20 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     if (busy.current) return;
     busy.current = true;
     // Clear an old failed line first, so screen readers read it again if this try fails too.
+    const clearedAt = state === "failed" ? Date.now() : null;
     setState("off");
     const mine = ++attempt.current;
+    // Shows the failed line. After a cleared failed line, it first waits until the line has been
+    // empty for STATUS_CLEAR_MS. The wait comes after unlockSound(), which must run inside the tap.
+    const showFailed = async () => {
+      if (clearedAt !== null) await waitMs(STATUS_CLEAR_MS - (Date.now() - clearedAt));
+      if (mine === attempt.current) setState("failed");
+    };
     try {
       const ok = await unlockSound();
       if (mine !== attempt.current) return;
       if (!ok) {
-        setState("failed");
+        await showFailed();
         return;
       }
       setState("on");
@@ -49,7 +61,7 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
         beeping.current = mine;
         const played = await playAlert(() => mine === attempt.current);
         if (beeping.current === mine) beeping.current = null;
-        if (mine === attempt.current && !played) setState("failed");
+        if (mine === attempt.current && !played) await showFailed();
       }
     } finally {
       // After "Turn off sound" the next tap belongs to a new attempt, which turnOff() already freed.
@@ -91,9 +103,12 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
       const mine = attempt.current;
       if (beeping.current === mine || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
       beeping.current = mine;
-      void playAlert(() => mine === attempt.current).then((ok) => {
+      // Still wanted: no tap since, and the page is still on screen. A beep stopped because the phone
+      // was locked is not a failure; the next visibilitychange tries again.
+      const wanted = () => mine === attempt.current && document.visibilityState === "visible";
+      void playAlert(wanted).then((ok) => {
         if (beeping.current === mine) beeping.current = null;
-        if (!ok && mine === attempt.current) setState("off");
+        if (!ok && wanted()) setState("off");
       });
     };
     tick();
diff --git a/lib/calledAlert.ts b/lib/calledAlert.ts
index d1ddce7..f109764 100644
--- a/lib/calledAlert.ts
+++ b/lib/calledAlert.ts
@@ -6,6 +6,13 @@ import type { VisitStatus } from "./visit";
 /** How often the alert plays again while the patient has not tapped "I'm on my way". */
 export const ALERT_REPEAT_MS = 30_000;
 
+/**
+ * When a new try at "Turn on sound" fails again, the failed line stays empty for at least this
+ * long first. Screen readers can skip a line that goes away and comes back within a few
+ * milliseconds; after a pause they read it again.
+ */
+export const STATUS_CLEAR_MS = 500;
+
 /**
  * The beep. 880 Hz is in the range that people with age-related hearing loss still hear well
  * (they lose high pitches first). 0.4 seconds is far below the 3 seconds after which WCAG 2.2
```
