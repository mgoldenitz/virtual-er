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
