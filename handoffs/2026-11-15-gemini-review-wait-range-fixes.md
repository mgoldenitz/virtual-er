# Gemini review: fixes from the wait-range review (2026-11-15)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Give the model all of this file. It holds no keys, tokens, passwords or patient data (the app uses synthetic data only).

## Prompt

You review a concept prototype: a virtual ER waiting room (Next.js 16 App Router, React 19, TypeScript, vitest with happy-dom for click tests). Low-acuity patients wait off-site and follow their place in line on their phone. The patient screen is in 5 languages (en, fr, ur, ar, zh). Staff screens are in English.

An earlier review found problems. The diff below is the fix. Your job is to find problems in this diff, not to confirm it. For each problem, give the file, the line, a concrete case that fails (inputs or the steps of a user), and the smallest fix. If you find no problem in an area, say so in one line. Do not suggest new features.

What the diff must do:

1. Sound box (`components/patient/SoundSwitch.tsx`, `alertSound.ts`).
   - `beeping` holds the attempt number of the beep that waits, so a beep from an old attempt never blocks a new one.
   - When the box goes away (unmount), the attempt counter goes up and the vibration stops.
   - `playAlert(stillWanted)` does not start the beep when `stillWanted()` is false after the wait for the audio player.
2. Sound box focus and status line.
   - Focus moves to "Turn on sound" only when focus is in the box or on the page body. A beep that fails in the background must not take focus from another button.
   - After a phone tap (no focus on the button), a failed test beep moves focus to "Turn on sound".
   - A new try clears the failed line first, so screen readers read it again if it fails again.
3. Arabic short wait range (`lib/waitText.ts`). Under 60 minutes the line is built from `waitRangeLong`: low is a bare number, high has the minute word in the right plural form for the high number. Arabic (5, 10) gives "من 5 إلى 10 دقائق" and (10, 15) gives "من 10 إلى 15 دقيقة". The other languages stay the same. The old `waitRange` line is gone from the 5 text files.
4. Staff flags (`components/staff/FollowUpPanel.tsx`). The phone, phone-again and review flags show "10 min" on screen, but screen readers hear "10 minutes" (in the flag and in the `role="status"` line).

Questions:

- Are there race cases in the sound box that the attempt counter still misses (for example a status change from `waiting` to `called` while a test beep waits, or a fast double change of `status`)?
- Can the focus rule leave focus nowhere (on the body) in a case that a keyboard or screen reader user meets?
- Does the empty-then-failed status line really make screen readers read the line again, given that React can put both changes in one render? Name the screen readers where this can fail.
- Is any Arabic, French, Urdu or Mandarin range line now wrong for a low or high value from 5 to 59?
- Do the tests prove each point above, or can a test pass while the behaviour is wrong?

## Checked (output in this session)

- `npm test`: 44 test files, 264 tests passed.
- `npm run lint`: no errors.
- `npm run build`: passed.
- Each new test failed before its fix (save points `feee032`, `d8f9df8`, `4de0d6c`, `f057ad2`).

## Not checked

- A real screen reader (VoiceOver, TalkBack, NVDA) on the sound box and the staff flags.
- A real phone for the beep, the vibration and the phone-tap focus.
- The Playwright phone and laptop tests were not run again for this diff.
- The new Arabic line and the other translations have no fluent human review yet.

## Diff (`254a9d4..96cb001`)

```diff
diff --git a/components/patient/SoundSwitch.click.test.tsx b/components/patient/SoundSwitch.click.test.tsx
index 651de1f..a80ab32 100644
--- a/components/patient/SoundSwitch.click.test.tsx
+++ b/components/patient/SoundSwitch.click.test.tsx
@@ -108,6 +108,34 @@ describe("SoundSwitch taps", () => {
     expect(document.activeElement).toBe(button(t.turnOn));
   });
 
+  it("moves focus to Turn on sound after a phone tap (focus on the page) when the test beep fails", async () => {
+    vi.mocked(playAlert).mockResolvedValue(false);
+    show("waiting");
+    // A finger tap on a phone does not focus the button, so focus stays on the page body.
+    await act(async () => button(t.turnOn)?.click());
+    expect(document.activeElement).toBe(button(t.turnOn));
+  });
+
+  it("keeps the status box empty while the sound is on", async () => {
+    show("waiting");
+    await press(t.turnOn);
+    expect(container.textContent).toContain(t.on);
+    expect(statusBox()?.textContent).toBe("");
+  });
+
+  it("clears the failed line on a new try, so screen readers read it again if it fails again", async () => {
+    vi.mocked(unlockSound).mockResolvedValueOnce(false);
+    show("waiting");
+    await press(t.turnOn);
+    expect(statusBox()?.textContent).toBe(t.failed);
+    const unlock = later<boolean>();
+    vi.mocked(unlockSound).mockReturnValueOnce(unlock.promise);
+    await press(t.turnOn);
+    expect(statusBox()?.textContent).toBe("");
+    await settle(unlock, false);
+    expect(statusBox()?.textContent).toBe(t.failed);
+  });
+
   it("moves focus to Turn on sound when the test beep fails", async () => {
     vi.mocked(playAlert).mockResolvedValue(false);
     show("waiting");
@@ -134,6 +162,48 @@ describe("SoundSwitch while called", () => {
     await press(t.turnOn);
     await settle(oldBeep, false);
     expect(container.textContent).toContain(t.on);
+    // The second Turn on beeps again; the old beep that still waited must not block it.
+    expect(playAlert).toHaveBeenCalledTimes(2);
+  });
+
+  it("beeps once when the visit is called while the sound is still starting", async () => {
+    const unlock = later<boolean>();
+    vi.mocked(unlockSound).mockReturnValue(unlock.promise);
+    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
+    show("waiting");
+    await press(t.turnOn);
+    show("called");
+    await settle(unlock, true);
+    expect(playAlert).toHaveBeenCalledTimes(1);
+  });
+
+  it("stops the vibration when the box goes away while a beep still waits", async () => {
+    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
+    show("called");
+    await press(t.turnOn);
+    vi.mocked(stopVibration).mockClear();
+    // "I'm on my way" takes the sound box off the page.
+    act(() => root.render(<></>));
+    expect(stopVibration).toHaveBeenCalledTimes(1);
+  });
+
+  it("leaves focus on another button when a repeat beep fails in the background", async () => {
+    const beep = later<boolean>();
+    vi.mocked(playAlert).mockReturnValue(beep.promise);
+    act(() =>
+      root.render(
+        <>
+          <button>{"I'm on my way"}</button>
+          <SoundSwitch status="called" language="en" />
+        </>,
+      ),
+    );
+    await press(t.turnOn);
+    const other = button("I'm on my way");
+    other?.focus();
+    await settle(beep, false);
+    expect(button(t.turnOn)).toBeDefined();
+    expect(document.activeElement).toBe(other);
   });
 
   it("moves focus to Turn on sound when a beep fails and the sound goes off", async () => {
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index 35647e4..5da1098 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -16,19 +16,23 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   const soundOn = state === "on";
   const onWords = useRef<HTMLParagraphElement>(null);
   const turnOnButton = useRef<HTMLButtonElement>(null);
+  const box = useRef<HTMLDivElement>(null);
   // Goes up by 1 on each "Turn on sound" and "Turn off sound" tap. A slow result that belongs to an
   // earlier tap (a test beep, an unlock or a repeat beep) sees a different number and changes nothing.
   const attempt = useRef(0);
   // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
   const busy = useRef(false);
-  // True while a repeat beep still waits for the player, so the next one does not start on top of it.
-  const beeping = useRef(false);
+  // The attempt number of a beep that still waits for the player (null when none), so the next beep of
+  // the same attempt does not start on top of it. A beep of an older attempt does not block a new one.
+  const beeping = useRef<number | null>(null);
   // True when the last state shown was "on", so focus can move when the sound goes off.
   const wasOn = useRef(false);
 
   async function turnOn() {
     if (busy.current) return;
     busy.current = true;
+    // Clear an old failed line first, so screen readers read it again if this try fails too.
+    setState("off");
     const mine = ++attempt.current;
     try {
       const ok = await unlockSound();
@@ -40,8 +44,11 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
       setState("on");
       // When the visit is already called, the effect below plays the alert, so no test beep is needed.
       // If the test beep cannot play, say so now, not only when the patient is called.
+      // `beeping` is set before React runs the effect, so a status change to called does not beep twice.
       if (status !== "called") {
-        const played = await playAlert();
+        beeping.current = mine;
+        const played = await playAlert(() => mine === attempt.current);
+        if (beeping.current === mine) beeping.current = null;
         if (mine === attempt.current && !played) setState("failed");
       }
     } finally {
@@ -57,12 +64,23 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     stopVibration();
   }
 
+  /**
+   * True when moving focus takes it from nobody: focus is inside the sound box, or on the page body
+   * (after a phone tap, or because the focused "Sound is on" words just went away). False when the
+   * patient is on another button, such as "I'm still here", so a background beep failure leaves it there.
+   */
+  function focusNearBox(): boolean {
+    const focused = document.activeElement;
+    if (!focused || focused === document.body) return true;
+    return box.current?.contains(focused) === true;
+  }
+
   // Focus follows the change, so it never drops to the top of the page when a button goes away.
-  // On: move to the words "Sound is on" (read out when focused). From on to off or failed, for any
-  // reason (a tap, a failed test beep, a failed repeat beep): move to "Turn on sound".
+  // On: move to the words "Sound is on" (read out when focused). From on to off, or to failed (a
+  // fast failure can skip "on" on screen): move to "Turn on sound", unless focus is somewhere else.
   useEffect(() => {
     if (state === "on") onWords.current?.focus();
-    else if (wasOn.current) turnOnButton.current?.focus();
+    else if ((wasOn.current || state === "failed") && focusNearBox()) turnOnButton.current?.focus();
     wasOn.current = state === "on";
   }, [state]);
 
@@ -70,11 +88,11 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   // If the phone will not play the beep, the box goes back to "off" so the page can say so.
   useEffect(() => {
     const tick = () => {
-      if (beeping.current || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
-      beeping.current = true;
       const mine = attempt.current;
-      void playAlert().then((ok) => {
-        beeping.current = false;
+      if (beeping.current === mine || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
+      beeping.current = mine;
+      void playAlert(() => mine === attempt.current).then((ok) => {
+        if (beeping.current === mine) beeping.current = null;
         if (!ok && mine === attempt.current) setState("off");
       });
     };
@@ -87,10 +105,19 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     };
   }, [status, soundOn]);
 
+  // When the box leaves the page ("I'm on my way"), a beep that still waits must not play, and a
+  // vibration must stop.
+  useEffect(() => {
+    return () => {
+      attempt.current += 1;
+      stopVibration();
+    };
+  }, []);
+
   const note = soundNote(status, state);
 
   return (
-    <div className="clean-card space-y-2">
+    <div ref={box} className="clean-card space-y-2">
       <p className="text-base">{t.notice}</p>
       {soundOn ? (
         <>
diff --git a/components/patient/alertSound.test.ts b/components/patient/alertSound.test.ts
index f31fbe9..97b5825 100644
--- a/components/patient/alertSound.test.ts
+++ b/components/patient/alertSound.test.ts
@@ -6,7 +6,7 @@ import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 class FakeContext {
   /** Every fake player made, so a test can close or pause them as the phone would. */
   static made: FakeContext[] = [];
-  static resumeResult: "run" | "hang" | "reject-late" = "run";
+  static resumeResult: "run" | "hang" | "reject-late" | "slow" = "run";
   state: "suspended" | "running" | "closed" = "suspended";
   currentTime = 0;
   destination = {};
@@ -19,10 +19,13 @@ class FakeContext {
       return Promise.resolve();
     }
     if (FakeContext.resumeResult === "hang") return new Promise(() => {});
+    if (FakeContext.resumeResult === "slow") {
+      return new Promise((resolve) => setTimeout(() => ((this.state = "running"), resolve()), 500));
+    }
     return new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 2000));
   }
   createOscillator() {
-    return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
+    return { type: "", frequency: { value: 0 }, connect() {}, start, stop: vi.fn() };
   }
   createGain() {
     return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
@@ -30,6 +33,8 @@ class FakeContext {
 }
 
 const vibrate = vi.fn();
+/** Called when a beep really starts, so a test can see that sound was made, not only a true result. */
+const start = vi.fn();
 
 /** A fresh copy of the module, so the shared player starts empty in each test. */
 async function load() {
@@ -46,6 +51,7 @@ beforeEach(() => {
   FakeContext.made = [];
   FakeContext.resumeResult = "run";
   vibrate.mockClear();
+  start.mockClear();
   vi.stubGlobal("window", { AudioContext: FakeContext });
   vi.stubGlobal("navigator", { vibrate });
 });
@@ -90,6 +96,20 @@ describe("playAlert", () => {
     const { unlockSound, playAlert } = await load();
     await unlockSound();
     expect(await playAlert()).toBe(true);
+    expect(start).toHaveBeenCalledTimes(1);
+    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
+  });
+
+  it("does not start the beep when it is no longer wanted after the wait for the player", async () => {
+    vi.useFakeTimers();
+    const { unlockSound, playAlert } = await load();
+    await unlockSound();
+    setAll("suspended");
+    FakeContext.resumeResult = "slow";
+    const result = playAlert(() => false);
+    await vi.advanceTimersByTimeAsync(500);
+    expect(await result).toBe(false);
+    expect(start).not.toHaveBeenCalled();
   });
 
   it("still vibrates when there is no player", async () => {
@@ -107,6 +127,7 @@ describe("playAlert", () => {
     const result = playAlert();
     await vi.advanceTimersByTimeAsync(1000);
     expect(await result).toBe(false);
+    expect(start).not.toHaveBeenCalled();
   });
 
   it("leaves no unhandled error when resume() fails after the wait", async () => {
diff --git a/components/patient/alertSound.ts b/components/patient/alertSound.ts
index 440de97..6589093 100644
--- a/components/patient/alertSound.ts
+++ b/components/patient/alertSound.ts
@@ -46,9 +46,10 @@ export async function unlockSound(): Promise<boolean> {
 
 /**
  * Plays one short beep (BEEP_HZ, BEEP_SECONDS long, at BEEP_VOLUME; see lib/calledAlert.ts) and a vibration where the phone allows it.
- * Gives true when the beep played. Gives false when it did not play (no player, or the player would not start).
+ * Gives true when the beep played. Gives false when it did not play (no player, the player would not start,
+ * or `stillWanted` says no after the wait: the patient tapped "Turn off sound" or left the screen).
  */
-export async function playAlert(): Promise<boolean> {
+export async function playAlert(stillWanted: () => boolean = () => true): Promise<boolean> {
   try {
     // Vibrate first, so the phone still vibrates when the beep cannot play.
     vibrate();
@@ -57,7 +58,7 @@ export async function playAlert(): Promise<boolean> {
     // iPhone can pause the player while the page is hidden; start it again before each beep.
     if (!isRunning(ctx)) {
       await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
-      if (!isRunning(ctx)) return false;
+      if (!isRunning(ctx) || !stillWanted()) return false;
     }
     const oscillator = ctx.createOscillator();
     const gain = ctx.createGain();
diff --git a/components/staff/FollowUpPanel.test.ts b/components/staff/FollowUpPanel.test.ts
index b862064..2347f1d 100644
--- a/components/staff/FollowUpPanel.test.ts
+++ b/components/staff/FollowUpPanel.test.ts
@@ -1,11 +1,11 @@
 // Checks the words that screen readers hear for a staff flag: they leave out the minute count,
 // so they do not change (and are not read again) every minute.
 
-import type { ReactElement } from "react";
+import { createElement, type ReactElement } from "react";
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it, vi } from "vitest";
 import { checkInAtDesk } from "@/lib/visitActions";
-import { flagFor } from "./FollowUpPanel";
+import { FollowUpPanel, flagFor } from "./FollowUpPanel";
 
 // The panel's buttons save through Supabase; this test never presses them.
 vi.mock("@/data/staffActions", () => ({}));
@@ -34,3 +34,26 @@ describe("flagFor spoken words", () => {
     expect(flag?.spoken).toBe(flag?.text);
   });
 });
+
+/** The whole panel as HTML, for a visit called back `calledMinutesAgo` minutes ago with no phone call yet. */
+function panelHtml(calledMinutesAgo: number): string {
+  const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), status: "called" as const, called_at: minutesAgo(calledMinutesAgo) };
+  return renderToStaticMarkup(createElement(FollowUpPanel, { visit, now, saving: false, act: vi.fn() }));
+}
+
+/** The words in the panel's role="status" line, which screen readers hear. */
+const statusWords = (html: string) => html.match(/<p role="status"[^>]*>(.*?)<\/p>/)?.[1] ?? "";
+
+describe("FollowUpPanel phone and review flags", () => {
+  it.each([
+    ["phone", 12, "10 minutes"],
+    ["phone_again", 22, "20 minutes"],
+    ["review", 32, "30 minutes"],
+  ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min'", (kind, calledMinutesAgo, words) => {
+    const html = panelHtml(calledMinutesAgo);
+    expect(html).toContain(`data-testid="flag-${kind}"`);
+    expect(html).toContain(`<span class="sr-only">${words}</span>`);
+    expect(statusWords(html)).toContain(words);
+    expect(statusWords(html)).not.toMatch(/\bmin\b/);
+  });
+});
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
index fa1700c..00d040b 100644
--- a/components/staff/FollowUpPanel.tsx
+++ b/components/staff/FollowUpPanel.tsx
@@ -8,6 +8,8 @@ import { confirmUnableToReachFor, recordPhoneCallFor } from "@/data/staffActions
 import { CALL_PHONE_AGAIN_MINUTES, CALL_REVIEW_MINUTES, CALL_SECOND_ALERT_MINUTES } from "@/lib/demoTimes";
 import { canRecordPhoneCall, staffFollowUp, type StaffFollowUp } from "@/lib/followUp";
 import { formatMinutes } from "@/lib/duration";
+import { enDuration } from "@/lib/text/en";
+import { formatDuration } from "@/lib/waitText";
 import { minutesBetween } from "@/lib/queue";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -36,24 +38,43 @@ type Flag = { text: string; tone: string; spoken: string; body?: ReactNode };
 /** A flag whose spoken words are the same as its words on screen. */
 const same = (text: string, tone: string): Flag => ({ text, tone, spoken: text });
 
+/**
+ * A flag with a fixed time in it: "10 min" on screen, "10 minutes" for screen readers, which can
+ * read "min" as letters. The time is a fixed step (not a count), so the words stay the same each minute.
+ */
+const withTime = (before: string, minutes: number, after: string, tone: string): Flag => ({
+  text: `${before}${formatMinutes(minutes)}${after}`,
+  tone,
+  spoken: `${before}${formatDuration(minutes, enDuration)}${after}`,
+  body: (
+    <>
+      {before}
+      <Duration minutes={minutes} />
+      {after}
+    </>
+  ),
+});
+
 /**
  * The words and colour of each flag; null when there is nothing to flag. `spoken` leaves out
- * minute counts, so the words do not change, and are not read again, every minute.
+ * minute counts that go up, so the words do not change, and are not read again, every minute.
  */
 export function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): Flag | null {
   switch (followUp.kind) {
     case "phone":
-      return same(`No reply ${CALL_SECOND_ALERT_MINUTES} min after call-back. Phone the patient now.`, AMBER);
+      return withTime("No reply ", CALL_SECOND_ALERT_MINUTES, " after call-back. Phone the patient now.", AMBER);
     case "phone_again": {
       // "again" only if someone already phoned; staff may have missed the first flag.
       const ask = visit.phone_attempts === 0 ? "Phone the patient now." : "Phone the patient again.";
-      return same(`Still no reply ${CALL_PHONE_AGAIN_MINUTES} min after call-back. ${ask}`, AMBER);
+      return withTime("Still no reply ", CALL_PHONE_AGAIN_MINUTES, ` after call-back. ${ask}`, AMBER);
     }
     case "paused":
       return same(`Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, AMBER);
     case "review":
-      return same(
-        `Review: unable to reach. No answered call ${CALL_REVIEW_MINUTES} min after the call-back. Stays in the line until a nurse confirms.`,
+      return withTime(
+        "Review: unable to reach. No answered call ",
+        CALL_REVIEW_MINUTES,
+        " after the call-back. Stays in the line until a nurse confirms.",
         RED,
       );
     case "contacted_not_arrived":
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index 3c1ca72..eec941f 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -71,8 +71,8 @@ export const ar: PatientText = {
     placeInLine: "مكانك في الطابور:",
     placeCanChange: "يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
     waitLabel: "الوقت المقدر حتى يتم استدعاؤك للعودة:",
-    waitRange: "من {low} إلى {high} دقيقة",
-    // Used when the range reaches an hour; each end is built from the Duration words below.
+    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
+    // from an hour, each end is built from the Duration words below.
     waitRangeLong: "من {low} إلى {high}",
     simulated: "هذا التقدير محاكى للعرض التجريبي.",
     calledHeading: "يرجى العودة الآن",
diff --git a/lib/text/en.ts b/lib/text/en.ts
index 32079d4..e223961 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -85,8 +85,8 @@ export const en = {
     placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
     // SPEC
     waitLabel: "Estimated time until you're called back:",
-    waitRange: "{low} to {high} minutes",
-    // Used when the range reaches an hour; each end is built from the Duration words below.
+    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
+    // from an hour, each end is built from the Duration words below.
     waitRangeLong: "{low} to {high}",
     simulated: "This estimate is simulated for the demo.",
 
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index 827a707..5b1a420 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -71,8 +71,8 @@ export const fr: PatientText = {
     placeInLine: "Votre place dans la file d'attente :",
     placeCanChange: "Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.",
     waitLabel: "Temps estimé avant d'être rappelé :",
-    waitRange: "{low} à {high} minutes",
-    // Used when the range reaches an hour; each end is built from the Duration words below.
+    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
+    // from an hour, each end is built from the Duration words below.
     waitRangeLong: "{low} à {high}",
     simulated: "Cette estimation est simulée pour la démonstration.",
     calledHeading: "Veuillez revenir maintenant",
diff --git a/lib/text/text.test.ts b/lib/text/text.test.ts
index fc28bfc..6a5d99c 100644
--- a/lib/text/text.test.ts
+++ b/lib/text/text.test.ts
@@ -52,7 +52,7 @@ describe("SPEC's fixed sentences", () => {
       "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
     );
     expect(t.patient.waitLabel).toBe("Estimated time until you're called back:");
-    expect(fill(t.patient.waitRange, { low: 40, high: 60 })).toBe("40 to 60 minutes");
+    expect(fill(t.patient.waitRangeLong, { low: "40", high: "60 minutes" })).toBe("40 to 60 minutes");
     expect(t.returnNow.text).toBe("Please return now. Staff will review your visit if you do not respond.");
     expect(t.survey.question).toBe("How would you rate your waiting experience?");
   });
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index 9c8708d..d0ee280 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -71,8 +71,8 @@ export const ur: PatientText = {
     placeInLine: "لائن میں آپ کی جگہ:",
     placeCanChange: "اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
     waitLabel: "واپس بلائے جانے تک کا تخمینہ وقت:",
-    waitRange: "{low} سے {high} منٹ",
-    // Used when the range reaches an hour; each end is built from the Duration words below.
+    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
+    // from an hour, each end is built from the Duration words below.
     waitRangeLong: "{low} سے {high}",
     simulated: "یہ تخمینہ ڈیمو کے لیے فرضی ہے۔",
     calledHeading: "براہ کرم اب واپس آ جائیں",
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index 2edb11c..1ac5821 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -71,8 +71,8 @@ export const zh: PatientText = {
     placeInLine: "您的排队位置：",
     placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
     waitLabel: "预计还需多久叫您回来：",
-    waitRange: "{low} 到 {high} 分钟",
-    // Used when the range reaches an hour; each end is built from the Duration words below.
+    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
+    // from an hour, each end is built from the Duration words below.
     waitRangeLong: "{low} 到 {high}",
     simulated: "此估计时间是为演示而模拟的。",
     calledHeading: "请现在回来",
diff --git a/lib/waitText.test.ts b/lib/waitText.test.ts
index e605be9..d4f95a2 100644
--- a/lib/waitText.test.ts
+++ b/lib/waitText.test.ts
@@ -30,6 +30,15 @@ describe("formatDuration (English)", () => {
 describe("formatWaitRange", () => {
   it("keeps the short line when both ends are under an hour", () => {
     expect(formatWaitRange(20, 45, "en")).toBe("20 to 45 minutes");
+    expect(formatWaitRange(20, 45, "fr")).toBe("20 à 45 minutes");
+    expect(formatWaitRange(20, 45, "ur")).toBe("20 سے 45 منٹ");
+    expect(formatWaitRange(20, 45, "zh")).toBe("20 到 45 分钟");
+    expect(formatWaitRange(20, 45, "ar")).toBe("من 20 إلى 45 دقيقة");
+  });
+
+  it("Arabic short line: the minute word follows the high number (3 to 10 take دقائق)", () => {
+    expect(formatWaitRange(5, 10, "ar")).toBe("من 5 إلى 10 دقائق");
+    expect(formatWaitRange(10, 15, "ar")).toBe("من 10 إلى 15 دقيقة");
   });
 
   it("English", () => {
@@ -40,6 +49,7 @@ describe("formatWaitRange", () => {
 
   it("French", () => {
     expect(formatWaitRange(45, 80, "fr")).toBe("45 minutes à 1 heure 20 minutes");
+    expect(formatWaitRange(60, 120, "fr")).toBe("1 heure à 2 heures");
   });
 
   it("Urdu, with گھنٹے for a whole hour before سے", () => {
@@ -57,6 +67,7 @@ describe("formatWaitRange", () => {
 
   it("Mandarin", () => {
     expect(formatWaitRange(45, 80, "zh")).toBe("45 分钟 到 1 小时 20 分钟");
+    expect(formatWaitRange(60, 120, "zh")).toBe("1 小时 到 2 小时");
   });
 
   it("gives English for a language with no words of its own", () => {
diff --git a/lib/waitText.ts b/lib/waitText.ts
index c95c4a6..b19c418 100644
--- a/lib/waitText.ts
+++ b/lib/waitText.ts
@@ -34,10 +34,14 @@ export function formatDuration(minutes: number, words: DurationWords, end: "low"
   return fill(words.join, { h: hourText, m: pickForm(words.minute, rest, words.locale) });
 }
 
-/** The wait range line: "20 to 45 minutes" under an hour, else both ends in hours and minutes. */
+/**
+ * The wait range line: "20 to 45 minutes" under an hour, else both ends in hours and minutes.
+ * Under an hour the minute word follows the high number only, so Arabic gets the right form
+ * for it ("من 5 إلى 10 دقائق", but "من 10 إلى 15 دقيقة").
+ */
 export function formatWaitRange(low: number, high: number, language: string | null | undefined): string {
   const t = textFor(language).patient;
-  if (high < 60) return fill(t.waitRange, { low, high });
   const words = (language && WORDS[language]) || enDuration;
+  if (high < 60) return fill(t.waitRangeLong, { low, high: formatDuration(high, words) });
   return fill(t.waitRangeLong, { low: formatDuration(low, words, "low"), high: formatDuration(high, words, "high") });
 }
\ No newline at end of file
```


## Response

Gemini Hydrogen 4, High, 2026-11-15 (pasted by the owner).

### 1. Race cases in the sound box that the attempt counter still misses

1.1 Stale `status` closure in `turnOn()` skips the test beep when `status` changes from `"called"` to `"waiting"` during `unlockSound()` (`components/patient/SoundSwitch.tsx`, line 48). Case: the visit starts on `called`; the patient taps "Turn on sound"; while `unlockSound()` waits, staff undo the recall, so `status` becomes `waiting`. `turnOn()` reads the old `called` and skips `playAlert()`; the effect sees `waiting` and does not beep either. If `playAlert()` would have failed, the box stays on "Sound is on". Fix: keep the latest status in a ref and check it on line 48.

1.2 A change from `called` back to `waiting` (or the tab becoming hidden) while `tick()`'s `playAlert()` waits on `ctx.resume()` still plays the recall beep and can turn the sound off (`SoundSwitch.tsx` lines 91 to 96; `alertSound.ts` lines 55 and 61). `attempt.current` does not change when `status` changes, so `stillWanted()` stays true; if `playAlert()` fails, line 96 sets `off`. Also `vibrate()` runs before `stillWanted()` is checked. Fix: refs for the latest status and sound state, `stillWanted` = same attempt and `shouldAlert(...)`, guard line 96 with the latest status, and check `stillWanted()` before `vibrate()`.

### 2. Focus rule leaving focus nowhere

2.1 `focusNearBox()` checks `document.body` but not `document.documentElement` (line 74). Claim: Safari/WebKit and Firefox set `document.activeElement` to `<html>` when the focused node is removed, so focus stays at the top of the page. Fix: also accept `document.documentElement`.

### 3. Empty-then-failed status line and screen readers

3.1 React 19 can batch `setState("off")` and `setState("failed")` into one render when `unlockSound()` fails at once, so the status line never clears. Even with two commits (failed, empty, failed) a few milliseconds apart, VoiceOver (iOS and macOS), TalkBack, NVDA and JAWS can merge the quick polite updates or skip the same text again. Fix: when retrying from `failed`, wait about 50 ms (`setTimeout`) before calling `unlockSound()`.

### 4. Arabic, French, Urdu or Mandarin range lines for 5 to 59

No problem found. French, Urdu and Mandarin are unchanged; Arabic gives "من {low} إلى {high} دقائق" for high 5 to 10 and "من {low} إلى {high} دقيقة" for high 11 to 59.

### 5. Do the tests prove each point?

5.1 The retry test holds the second `unlockSound()` open with `later()`, so it forces two renders. With both calls `mockResolvedValueOnce(false)`, React could batch them. Fix: add that test.

5.2 The phone-tap focus test still passes if `|| state === "failed"` is deleted from line 83, because `unlockSound()` succeeds first (`wasOn` becomes true). A phone tap where `unlockSound()` itself fails is not tested. Fix: add that test.

5.3 The status race test covers only `waiting` to `called` during `unlockSound()`. Fix: add `called` to `waiting` during `unlockSound()` and during the wait in `tick()`.

5.4 `alertSound.test.ts` (lines 103 to 113) does not check that `vibrate()` is skipped when `stillWanted()` is already false. Fix: clear `vibrate` first and expect no call.

### Claude's check

- 1.1 and 1.2, `called` back to `waiting`: not accepted. The case cannot happen. Statuses only move forward (`statusBeforeClose` in `lib/visitActions.ts`); there is no undo for a recall ("There is no undo: recalled patients stay recalled", `components/staff/RecallAllPanel.tsx`). The sound box is shown only for `waiting` and `called` (`app/patient/page.tsx:140`); every way out of `called` (on the way, arrived, removed) takes the box off the page, and the unmount raises the attempt counter.
- 1.2, page hidden while the repeat beep waits for the player: accepted. A patient who locks the phone in the second while a repeat beep waits gets `false` back, and line 96 turns the sound off, so on return the screen says the sound is off although nothing is wrong with it. Fix: the repeat beep is wanted only while the attempt is the same and the page is on screen, and line 96 turns the sound off only when the beep was still wanted. The next `visibilitychange` tick then tries again.
- 1.2, `vibrate()` before `stillWanted()`: not accepted. `stillWanted()` is true by construction when `playAlert()` starts (both callers create it in the same step), so checking it before `vibrate()` changes nothing. 5.4 falls with it: `playAlert(() => false)` from the start is not a case the app makes.
- 2.1: not accepted. The HTML standard says `document.activeElement` gives the body when nothing has focus (the html element only when there is no body), and the focus fixup after a removed element leaves the body as the focused area. Safari and Firefox follow this. Not changed.
- 3.1: accepted in part. The risk that screen readers merge "empty" and "failed" when they come a few milliseconds apart is real. The suggested fix is not safe: a wait before `unlockSound()` moves `resume()` out of the tap, and iPhone Safari can then refuse to start the sound. Fix instead: `unlockSound()` still runs at once; when a retry from `failed` fails again, the box waits until the line has been empty for `STATUS_CLEAR_MS` before it shows `failed`. React 19 does not merge the two changes here: the click flushes `setState("off")` before the code after `await` runs; the wait covers the screen reader side.
- 4: agreed, no change.
- 5.1: accepted, as the test for 3.1 (an at-once `false` on the retry, fake timers: the line is empty first, then `failed`).
- 5.2: accepted. New test: phone tap, `unlockSound()` gives `false`, focus moves to "Turn on sound". Checked that it fails with `|| state === "failed"` taken out.
- 5.3: not accepted for `called` to `waiting` (see 1.1). Replaced by a test for the hidden page case in 1.2.
