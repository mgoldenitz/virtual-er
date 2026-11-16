# Gemini review: fixes from the DeepSeek review of the sound box

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Prompt to paste

You review a small change to a concept prototype of a virtual ER waiting room (synthetic data only). Next.js 16, React 19, TypeScript, vitest with happy-dom. Find problems; do not confirm. For each problem, give the file and line, a case that shows it, and the smallest fix.

The change:
1. `unlockSound()` waits at most 1 second (`RESUME_WAIT_MS`) for the phone's sound player, then gives false, so "Turn on sound" shows the failed line in place of a dead button.
2. When a repeat beep fails while the visit is called and nobody tapped, the box moves focus to "Turn on sound" only when focus was in the box just before the change. Focus on the page body (a phone after a tap on plain text) or on another button stays where it is. After a tap, focus on the body still counts as near the box.
3. New tests: the phone-tap tests first check that focus is on the body; a waiting beep is no longer wanted after the box leaves; the staff flag shows "10 min" on screen.

Questions:
1. Is there a case where `backgroundFocus` keeps an old value and changes a later focus decision?
2. Is there a case where focus drops to the page body after this change, inside the sound box?
3. Can the 1 second limit in `unlockSound()` refuse a phone that would have started a little later? Is 1 second a good value for iPhone Safari and Android Chrome?
4. Do the new tests fail if the code is wrong? Name any test that passes with a wrong fix.

## Checked

- `npm test`: Test Files 44 passed, Tests 269 passed.
- `npm run lint`: no problems.
- `npm run build`: compiled successfully.
- The new tests for items 1 and 2 failed before the fixes (save point `ff39a70`).

## Not checked

- A real phone, a real screen reader.

## Diff

```diff
diff --git a/components/patient/SoundSwitch.click.test.tsx b/components/patient/SoundSwitch.click.test.tsx
index a9d1ba9..e8e8a64 100644
--- a/components/patient/SoundSwitch.click.test.tsx
+++ b/components/patient/SoundSwitch.click.test.tsx
@@ -121,6 +121,7 @@ describe("SoundSwitch taps", () => {
     vi.mocked(playAlert).mockResolvedValue(false);
     show("waiting");
     // A finger tap on a phone does not focus the button, so focus stays on the page body.
+    expect(document.activeElement).toBe(document.body);
     await act(async () => button(t.turnOn)?.click());
     expect(document.activeElement).toBe(button(t.turnOn));
   });
@@ -162,6 +163,7 @@ describe("SoundSwitch taps", () => {
   it("moves focus to Turn on sound after a phone tap (focus on the page) when the sound cannot start", async () => {
     vi.mocked(unlockSound).mockResolvedValue(false);
     show("waiting");
+    expect(document.activeElement).toBe(document.body);
     await act(async () => button(t.turnOn)?.click());
     expect(document.activeElement).toBe(button(t.turnOn));
   });
@@ -215,6 +217,21 @@ describe("SoundSwitch while called", () => {
     // "I'm on my way" takes the sound box off the page.
     act(() => root.render(<></>));
     expect(stopVibration).toHaveBeenCalledTimes(1);
+    // The beep that still waits asks "still wanted?" before it plays; the answer must now be no.
+    const stillWanted = vi.mocked(playAlert).mock.calls[0][0];
+    expect(stillWanted?.()).toBe(false);
+  });
+
+  it("leaves focus on the page when a repeat beep fails after the patient tapped somewhere else on the phone", async () => {
+    const beep = later<boolean>();
+    vi.mocked(playAlert).mockReturnValue(beep.promise);
+    show("called");
+    await press(t.turnOn);
+    // A finger tap on plain text further down the page takes focus away to the page body.
+    (document.activeElement as HTMLElement | null)?.blur();
+    await settle(beep, false);
+    expect(button(t.turnOn)).toBeDefined();
+    expect(document.activeElement).toBe(document.body);
   });
 
   it("leaves focus on another button when a repeat beep fails in the background", async () => {
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index f2f1a15..5381e2d 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -15,6 +15,29 @@ function waitMs(ms: number): Promise<void> {
   return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
 }
 
+/**
+ * True when moving focus takes it from nobody: focus is inside the sound box, or on the page body
+ * (after a phone tap, or because the focused "Sound is on" words just went away). False when the
+ * patient is on another button, such as "I'm still here", so a background beep failure leaves it there.
+ */
+function focusNearBox(box: HTMLElement | null): boolean {
+  const focused = document.activeElement;
+  if (!focused || focused === document.body) return true;
+  return box?.contains(focused) === true;
+}
+
+/**
+ * Asked when a repeat beep fails with no tap (the sound goes off while called), just before the
+ * "Sound is on" words go away. True: focus may move to "Turn on sound". False: focus stays where it is.
+ * On a phone, focus is on the page body after the patient taps plain text elsewhere on the page.
+ */
+function mayTakeFocusInBackground(box: HTMLElement | null): boolean {
+  const focused = document.activeElement;
+  // With no tap, focus on the page body means the patient is somewhere else on the page.
+  if (!focused || focused === document.body) return false;
+  return box?.contains(focused) === true;
+}
+
 export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
   const t = textFor(language).sound;
   const [state, setState] = useState<SoundState>("off");
@@ -32,6 +55,8 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
   const beeping = useRef<number | null>(null);
   // True when the last state shown was "on", so focus can move when the sound goes off.
   const wasOn = useRef(false);
+  // Set by a repeat beep that failed in the background: may the box take focus? null after a tap.
+  const backgroundFocus = useRef<boolean | null>(null);
 
   async function turnOn() {
     if (busy.current) return;
@@ -76,24 +101,16 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     stopVibration();
   }
 
-  /**
-   * True when moving focus takes it from nobody: focus is inside the sound box, or on the page body
-   * (after a phone tap, or because the focused "Sound is on" words just went away). False when the
-   * patient is on another button, such as "I'm still here", so a background beep failure leaves it there.
-   */
-  function focusNearBox(): boolean {
-    const focused = document.activeElement;
-    if (!focused || focused === document.body) return true;
-    return box.current?.contains(focused) === true;
-  }
-
   // Focus follows the change, so it never drops to the top of the page when a button goes away.
   // On: move to the words "Sound is on" (read out when focused). From on to off, or to failed (a
   // fast failure can skip "on" on screen): move to "Turn on sound", unless focus is somewhere else.
   useEffect(() => {
     if (state === "on") onWords.current?.focus();
-    else if ((wasOn.current || state === "failed") && focusNearBox()) turnOnButton.current?.focus();
+    else if ((wasOn.current || state === "failed") && (backgroundFocus.current ?? focusNearBox(box.current))) {
+      turnOnButton.current?.focus();
+    }
     wasOn.current = state === "on";
+    backgroundFocus.current = null;
   }, [state]);
 
   // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
@@ -108,7 +125,10 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
       const wanted = () => mine === attempt.current && document.visibilityState === "visible";
       void playAlert(wanted).then((ok) => {
         if (beeping.current === mine) beeping.current = null;
-        if (!ok && wanted()) setState("off");
+        if (!ok && wanted()) {
+          backgroundFocus.current = mayTakeFocusInBackground(box.current);
+          setState("off");
+        }
       });
     };
     tick();
diff --git a/components/patient/alertSound.test.ts b/components/patient/alertSound.test.ts
index 97b5825..47860b8 100644
--- a/components/patient/alertSound.test.ts
+++ b/components/patient/alertSound.test.ts
@@ -84,6 +84,15 @@ describe("unlockSound", () => {
     expect(await playAlert()).toBe(true);
   });
 
+  it("gives false after 1 second when the player will not start, so the tap does not wait for ever", async () => {
+    vi.useFakeTimers();
+    FakeContext.resumeResult = "hang";
+    const { unlockSound } = await load();
+    const result = unlockSound();
+    await vi.advanceTimersByTimeAsync(1000);
+    expect(await result).toBe(false);
+  });
+
   it("gives false when the browser has no sound player", async () => {
     vi.stubGlobal("window", {});
     const { unlockSound } = await load();
diff --git a/components/patient/alertSound.ts b/components/patient/alertSound.ts
index 6589093..8b304b4 100644
--- a/components/patient/alertSound.ts
+++ b/components/patient/alertSound.ts
@@ -5,7 +5,7 @@ import { BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME } from "@/lib/calledAlert";
 /** The one shared sound player. It is made by unlockSound() after a tap, then reused. */
 let context: AudioContext | null = null;
 
-/** The longest time playAlert() waits for the player to start again, in milliseconds. */
+/** The longest time unlockSound() and playAlert() wait for the player to start, in milliseconds. */
 const RESUME_WAIT_MS = 1000;
 
 /** The browser's audio player class (Safari older versions use the webkit name). */
@@ -37,8 +37,10 @@ export async function unlockSound(): Promise<boolean> {
       context = new AudioClass();
     }
     // resume() is called during the tap (the browser allows sound then); the wait comes after.
-    await context.resume();
-    return context.state === "running";
+    // A player that never answers gives false after RESUME_WAIT_MS, so the box can say so.
+    const ctx = context;
+    await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
+    return isRunning(ctx);
   } catch {
     return false;
   }
diff --git a/components/staff/FollowUpPanel.test.ts b/components/staff/FollowUpPanel.test.ts
index 2347f1d..baf12ea 100644
--- a/components/staff/FollowUpPanel.test.ts
+++ b/components/staff/FollowUpPanel.test.ts
@@ -46,12 +46,13 @@ const statusWords = (html: string) => html.match(/<p role="status"[^>]*>(.*?)<\/
 
 describe("FollowUpPanel phone and review flags", () => {
   it.each([
-    ["phone", 12, "10 minutes"],
-    ["phone_again", 22, "20 minutes"],
-    ["review", 32, "30 minutes"],
-  ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min'", (kind, calledMinutesAgo, words) => {
+    ["phone", 12, "10 minutes", "10 min"],
+    ["phone_again", 22, "20 minutes", "20 min"],
+    ["review", 32, "30 minutes", "30 min"],
+  ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min', and shows '%s'", (kind, calledMinutesAgo, words, shown) => {
     const html = panelHtml(calledMinutesAgo);
     expect(html).toContain(`data-testid="flag-${kind}"`);
+    expect(html).toContain(`<span aria-hidden="true">${shown}</span>`);
     expect(html).toContain(`<span class="sr-only">${words}</span>`);
     expect(statusWords(html)).toContain(words);
     expect(statusWords(html)).not.toMatch(/\bmin\b/);
```

## Response (Gemini Hydrogen 4, High)

## Problems Found

1. **`backgroundFocus` is not cleared on taps and can stay stale across batched state updates**

* **File and line:** `components/patient/SoundSwitch.tsx`, lines 59, 108–114, and 129–130.

* **Case that shows it:** Sound is `"on"` while `status === "called"` and focus is on `document.body`. A repeat beep fails (`playAlert` resolves `false`), setting `backgroundFocus.current = false` and calling `setState("off")`. Before React flushes the passive `useEffect(..., [state])` that resets `backgroundFocus.current = null`, the patient taps **Turn on sound**, calling `setState("on")`. React batches `"on" -> "off" -> "on"` into no net `state` change, so `useEffect(..., [state])` never runs and `backgroundFocus.current` remains `false` (despite the comment on line 58 stating it is `null after a tap`). When the patient later taps **Turn off sound** (`"on" -> "off"`), `useEffect` reads the stale `backgroundFocus.current === false` instead of `focusNearBox(box.current)`, leaving focus on `document.body` when `"Sound is on"` unmounts.

* **Smallest fix:** Reset `backgroundFocus.current = null;` at the top of `turnOn()` and `turnOff()` in `components/patient/SoundSwitch.tsx`, in addition to clearing it in `useEffect`.

2. **`focusNearBox` checks `document.body` but not `document.documentElement`, dropping focus to the top of the page in Safari/WebKit and Firefox**

* **File and line:** `components/patient/SoundSwitch.tsx`, lines 23–27 (`focusNearBox`).

* **Case that shows it:** In iOS/macOS Safari or Firefox, the patient has focus on `"Sound is on"` (`onWords`) or **Turn off sound** while `state === "on"` and taps **Turn off sound**. React unmounts the focused element before `useEffect` runs; WebKit/Gecko resets `document.activeElement` to `document.documentElement` (`<html>`) rather than `document.body`. `focusNearBox` returns `false`, skipping `turnOnButton.current?.focus()` and stranding focus at the top of the document.

* **Smallest fix:** Change line 25 of `components/patient/SoundSwitch.tsx` to:

```ts
if (!focused || focused === document.body || focused === document.documentElement) return true;

```

3. **Tapping plain text inside the sound box (or using a mobile screen reader cursor) drops focus to `document.body` when a repeat beep fails**

* **File and line:** `components/patient/SoundSwitch.tsx`, lines 34–39 (`mayTakeFocusInBackground`) and 129–130.

* **Case that shows it:** While `status === "called"` and `state === "on"`, the patient taps the notice paragraph or `"Sound is on"` text *inside* `<section ref={box}>` on a phone (blurs `"Sound is on"`, setting `document.activeElement = document.body`), or navigates with VoiceOver/TalkBack where DOM focus stays on `document.body`. When a repeat beep fails, `mayTakeFocusInBackground` sees `document.activeElement === document.body` and returns `false`, removing `"Sound is on"` without focusing **Turn on sound**.

* **Smallest fix:** Track whether the user last interacted inside `box.current` (e.g., an `onPointerDown` / `onFocusIn` flag on `<section ref={box}>` cleared on outside pointerdown/focusin) so `mayTakeFocusInBackground` returns `true` when the last tap was inside the sound box even if `document.activeElement` fell back to `document.body`.

4. **1-second timeout in `unlockSound()` can fail cold iOS/Android audio startups while leaving the singleton `AudioContext` running**

* **File and line:** `components/patient/alertSound.ts`, lines 9 and 41–43.

* **Case that shows it:** On an iPhone connected to Bluetooth headphones/hearing aids or a budget Android phone waking its audio HAL, `ctx.resume()` on the first tap takes 1.2 seconds. `Promise.race([ctx.resume(), waitAtMost(1000)])` returns at 1,000 ms while `ctx.state` is still `"suspended"`, so `unlockSound()` returns `false` and the UI displays the failure message (`t.failed`). 200 ms later `ctx.resume()` resolves and `context.state` becomes `"running"` in the background while the screen claims sound failed.

* **Smallest fix:** Increase `RESUME_WAIT_MS` in `components/patient/alertSound.ts` (line 9) from `1000` to `2500` (and update the test timer in `components/patient/alertSound.test.ts` line 92 to `2500`).

5. **New tests leave wrong implementations undetected (`stillWanted`, repeat-beep focus move, and `RESUME_WAIT_MS` timing)**

* **File and line:** `components/patient/SoundSwitch.click.test.tsx`, lines 220–235, and `components/patient/alertSound.test.ts`, lines 87–94.

* **Case that shows it:**
* In `SoundSwitch.click.test.tsx` (lines 221–222), `stillWanted?.()` is only checked after `root.render(<></>)` unmounts the component, so a broken `wanted` function that only checks `isMounted` (ignoring `attempt.current` after **Turn off sound** and ignoring `document.visibilityState === "visible"` when hidden) still passes.

* In `SoundSwitch.click.test.tsx` (lines 225–235), `.blur()` runs before `settle(beep, false)`, so hardcoding `mayTakeFocusInBackground` to `return false` always passes unless paired with a test where focus stays inside the box during a failed repeat beep.

* In `alertSound.test.ts` (lines 87–94), advancing timers by `1000` ms in one jump without checking that `result` is still pending at `999` ms passes a broken `RESUME_WAIT_MS = 0`, and `vi.useFakeTimers()` is never restored with `vi.useRealTimers()`.

* **Smallest fix:** Assert `stillWanted?.()` becomes `false` when `document.visibilityState` is `"hidden"` while still mounted; add a test where a repeat beep fails while `"Sound is on"` has focus and asserts focus moves to **Turn on sound**; and in `alertSound.test.ts`, assert `unlockSound()` does not resolve before `RESUME_WAIT_MS - 1` ms and restore `vi.useRealTimers()` in cleanup.

---

## Answers to Questions 1–4

### 1. Case where `backgroundFocus` keeps an old value and changes a later focus decision

Yes. `backgroundFocus.current` is only cleared inside `useEffect(..., [state])` (line 113) and is never reset inside `turnOn()` or `turnOff()`. If a repeat beep fails (`backgroundFocus.current = false; setState("off")` at lines 129–130) and the user taps **Turn on sound** (`setState("on")`) before React commits and runs the `"off"` effect, React batches `"on" -> "off" -> "on"` into no state change. Because `state` remains `"on"`, `useEffect(..., [state])` does not execute, leaving `backgroundFocus.current === false`. On a subsequent tap of **Turn off sound** (`"on" -> "off"`), `useEffect` evaluates `backgroundFocus.current ?? focusNearBox(box.current)` as `false` and skips focusing **Turn on sound**.

### 2. Case where focus drops to the page body after this change, inside the sound box

Yes, in three ways:

* **Tapping text inside the sound box before a repeat beep fails:** Tapping `<p>{t.notice}</p>` or `<p>{t.on}</p>` inside `<section ref={box}>` on a phone blurs `"Sound is on"` and puts `document.activeElement` on `document.body`. When a repeat beep fails while `status === "called"`, `mayTakeFocusInBackground` returns `false` because `document.activeElement === document.body`, unmounting `"Sound is on"` without focusing **Turn on sound** and leaving focus on `document.body`.

* **Mobile screen readers (VoiceOver / TalkBack):** Screen reader swipe navigation or tapping `"Sound is on"` can leave DOM `document.activeElement` on `document.body`; a failed repeat beep then leaves focus on `document.body` when `"Sound is on"` disappears.

* **Safari/WebKit & Firefox root fallback + stale `backgroundFocus`:** Unmounting `"Sound is on"` or **Turn off sound** sets `document.activeElement` to `document.documentElement` in WebKit/Gecko (failing `focused === document.body` in `focusNearBox`), and the batched `"on" -> "off" -> "on"` race in Question 1 drops focus to `document.body` when the patient later taps **Turn off sound**.

### 3. Can the 1-second limit in `unlockSound()` refuse a phone that would have started a little later, and is 1 second a good value for iPhone Safari and Android Chrome?

Yes, 1 second can refuse a phone that would have started shortly afterward, and **1 second is slightly too tight** for real iPhone Safari and Android Chrome devices. While an already-warm audio session resumes in 10–150 ms, cold initialization of CoreAudio on iPhone Safari (especially when routing to Bluetooth headphones/hearing aids or interrupting background audio from another app) and audio-hardware wake-up on lower-end Android Chrome devices can take **1.0 to 2.0 seconds**. At 1,001 ms, `Promise.race` returns `false` and shows `t.failed`, while the uncancelled `ctx.resume()` finishes moments later and leaves the singleton `context` in `"running"`. Raising `RESUME_WAIT_MS` to **2,500–3,000 ms** still prevents indefinite hangs on broken WebViews without falsely failing slow mobile audio handshakes.

### 4. Do the new tests fail if the code is wrong? Tests that pass with a wrong fix

Several new tests pass with broken implementations:

* **`SoundSwitch.click.test.tsx` — `"stops vibrating when the box leaves the screen"` (lines 212–223):** Checks `stillWanted?.()` only after `root.render(<></>)` unmounts the component. A wrong implementation of `wanted` that only checks `isMounted`—forgetting `mine === attempt.current` (after **Turn off sound**) and forgetting `document.visibilityState === "visible"` (when the phone locks or tab hides)—still passes.

* **`SoundSwitch.click.test.tsx` — `"leaves focus on the page when a repeat beep fails after the patient tapped somewhere else on the phone"` (lines 225–235):** Calls `.blur()` before `settle(beep, false)`. Hardcoding `mayTakeFocusInBackground` to `return false` unconditionally (or removing `wasOn.current` focus return on repeat-beep failure) still passes this test unless another test explicitly verifies that focus *does* move to **Turn on sound** when `"Sound is on"` is focused during a repeat-beep failure.

* **`SoundSwitch.click.test.tsx` — phone-tap tests (lines 124 and 166):** Asserting `expect(document.activeElement).toBe(document.body)` passes even when `focusNearBox` omits `document.documentElement`, because happy-dom resets `activeElement` to `document.body` rather than `<html>`.

* **`alertSound.test.ts` — `"gives false after 1 second when the player will not start, so the tap does not wait for ever"` (lines 87–94):** Jumps `vi.advanceTimersByTimeAsync(1000)` in one step without verifying that `unlockSound()` is still unresolved before 1,000 ms, so a broken `RESUME_WAIT_MS = 0` or `10` ms passes.

* **`FollowUpPanel.test.ts` — `"the %s flag... gives screen readers '%s', never 'min', and shows '%s'"` (lines 49–58):** Uses substring `html.toContain(...)` across the whole panel HTML rather than scoping inside `data-testid="flag-${kind}"`, so if the same duration string appeared elsewhere in the panel, the test would pass even if the flag itself lacked `<Duration>`.

### Check of the response (Claude, 2026-11-15)

I checked each point against the code. For the test gaps I made a temporary change to the code, ran the tests, and put the code back (a mutation check). The output is in this session.

1. Old `backgroundFocus` value: the case as written cannot occur. While `state` is `"on"`, "Turn on sound" is not on the screen, so the patient cannot tap it before the `"off"` commit. A close case can occur: the beep fails (with focus outside the box, so the value is `false`) and the patient taps "Turn off sound" in the same few milliseconds. The two `"off"` updates make one commit, and the effect reads `false` from the beep, not the answer for the tap. The window is very small, but the fix is 2 lines and makes the code match its comment ("null after a tap"). Accepted: reset `backgroundFocus.current = null` in `turnOn()` and `turnOff()`, with a test that resolves the failed beep and taps "Turn off sound" inside one `act()`.
2. `document.documentElement`: I cannot confirm that Safari or Firefox give `<html>` as `activeElement` after the focused part leaves. The HTML spec says `activeElement` gives the body. The check costs nothing, so accepted as a guard: one small helper "focus is on nobody" (null, body or `<html>`), used by `focusNearBox()`, `mayTakeFocusInBackground()` and the new `useRescueFocus`, with a unit test that fakes `activeElement` as `<html>`. Not checked on a real Safari or Firefox.
3. Tap on text inside the box: not accepted. A finger tap user does not use keyboard focus, so focus on the body after a tap loses nothing for that user. A screen reader user hears the change from the `role="status"` line ("offWhileCalled"). A pointer tracking flag adds code and a new state for no clear gain.
4. `RESUME_WAIT_MS` 1000 to 2500: not accepted now. The 1.0 to 2.0 second numbers have no source. If a slow start is refused, the next tap works at once, because the player is then running. A longer wait makes every broken phone wait 2.5 seconds with no sign on the screen. For the owner to decide; I propose to measure it in the real phone tests.
5. Test gaps:
   - `stillWanted` while mounted and hidden: correct, add the test. (Note: the mutation "`wanted` does not check `visibilityState`" already fails the locked phone test, so this is extra cover.)
   - "No test where a repeat beep fails with focus inside the box": wrong. Mutation "`mayTakeFocusInBackground` always gives false": the test "moves focus to Turn on sound when a beep fails and the sound goes off" fails.
   - happy-dom never gives `<html>`: correct; the unit test of the helper in item 2 covers it.
   - `alertSound` 999 ms: correct. Mutation `RESUME_WAIT_MS = 10`: all 30 tests pass. Add a check that the result is still pending at 999 ms. The claim that real timers are not restored is wrong: `afterEach` calls `vi.useRealTimers()` (`alertSound.test.ts` line 60).
   - `FollowUpPanel` `toContain` over the whole panel: correct but low. The only other `Duration` in the panel is for `on_the_way`, and this test renders `called`. Accepted as a small change: check the text inside the `flag-...` element only.

Accepted: 1 (close case), 2 (guard), 5 (stillWanted while hidden, 999 ms, FollowUpPanel scope). Not accepted: 3, 4 (owner decides).
