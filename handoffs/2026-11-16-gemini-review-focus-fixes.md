# Gemini review: fixes from the focus-rescue review

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste

You review a small change in a Next.js App Router and React 19 prototype of a virtual ER waiting room (synthetic data only). Find problems. Do not confirm that the change is good. For each problem, give the file, the steps that make it happen, and the smallest fix.

Background. On the patient screen, `PatientStatus` shows one of 4 screens: `Expired`, `Waiting`, `Called` (for `called` and `on_the_way`) and `OtherStatus` (all other statuses). Each screen has its own `<h2 id="status-heading" tabIndex={-1}>`. `useRescueFocus(targetId, trigger, lostRef)` is an effect on `[targetId, trigger, lostRef]`: if `lostRef.current` is true, it sets it to false and moves focus to `#status-heading`, unless focus is still on an element that is on the page. `useReportFocusOnLeave(ref, onLost)` calls `onLost` in a layout-effect cleanup when the part leaves while focus is inside it. The page (`app/patient/page.tsx`) gives `PatientStatus` and `SoundSwitch` one shared `lostFocus` ref.

The bug from the last review: after `called`, a tap on "I'm on my way" moves focus to the heading of `Called`. When staff then mark the visit `arrived`, React removes that heading, and focus fell to the page body. The fix puts each screen in a `ViewBox` with a key per screen, and the box reports lost focus when it leaves.

Also: a new test renders `PatientStatus` and `SoundSwitch` together with one shared flag; the unlock test now checks that a `visibilitychange` while the phone is still locked does not start a beep; a test regex now reads across new lines.

Not changed on purpose: no test for `backgroundFocus.current = null` in `turnOn()` of `SoundSwitch`. Reason: `turnOn()` runs only from the "Turn on sound" button, which is on the page only when the state is not `on`; repeat beeps run only while the state is `on`; when a failed repeat beep sets the state to `off`, the `[state]` effect sets `backgroundFocus` back to null before the button can be tapped.

Questions:
1. Does the keyed `ViewBox` catch every case where a focused element inside `PatientStatus` leaves the page? Name any case it misses, for example a change inside one screen (`arrived` to `removed`, both `OtherStatus`) or `expired` changing.
2. Does the extra `<div>` around each screen change the page layout or what a screen reader reads?
3. `OnMyWayButton` still reports lost focus on its own, and `ViewBox` now reports too. Can the two reports together move focus when it should not move, or move it twice?
4. Is the reasoning for no `turnOn()` test right? Give a sequence of events that proves it wrong, if there is one.
5. Do the new tests check the behaviour, or can they pass with the bug still there?

## The fix (`components/patient/PatientStatus.tsx`)

```diff
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 01b1a09..bae1c2e 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -4,7 +4,7 @@
 // Waiting, Please head back now, Ready at the desk, and the states before and after those.
 
 import Link from "next/link";
-import { useRef, type RefObject } from "react";
+import { useRef, type ReactNode, type RefObject } from "react";
 import type { PatientView } from "@/lib/patientView";
 import { textFor, type PatientText } from "@/lib/text";
 import { formatWaitRange } from "@/lib/waitText";
@@ -151,10 +151,33 @@ export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }:
   const ownFlag = useRef(false);
   // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
   const markLost = useRescueFocus("status-heading", `${view.expired}-${view.status}`, lostFocus ?? ownFlag);
-  if (view.expired) return <Expired t={t} />;
-  if (view.status === "waiting") return <Waiting view={view} language={language} t={t} />;
-  if (view.status === "called" || view.status === "on_the_way") {
-    return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />;
-  }
-  return <OtherStatus view={view} t={t} />;
+  const kind = viewKind(view);
+  return (
+    <ViewBox key={kind} onFocusLost={markLost}>
+      {kind === "expired" && <Expired t={t} />}
+      {kind === "waiting" && <Waiting view={view} language={language} t={t} />}
+      {kind === "called" && (
+        <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />
+      )}
+      {kind === "other" && <OtherStatus view={view} t={t} />}
+    </ViewBox>
+  );
+}
+
+/** Which screen the view shows. Called and on the way share one screen. */
+function viewKind(view: PatientView): "expired" | "waiting" | "called" | "other" {
+  if (view.expired) return "expired";
+  if (view.status === "waiting") return "waiting";
+  if (view.status === "called" || view.status === "on_the_way") return "called";
+  return "other";
+}
+
+/**
+ * Holds one screen. A new screen gets a new box (the key above), so the old box leaves the page.
+ * If focus was inside it (for example on the old heading), it tells the status screen.
+ */
+function ViewBox({ onFocusLost, children }: { onFocusLost: () => void; children: ReactNode }) {
+  const box = useRef<HTMLDivElement>(null);
+  useReportFocusOnLeave(box, onFocusLost);
+  return <div ref={box}>{children}</div>;
 }
```

## The test that showed the bug (`components/patient/PatientStatus.click.test.tsx`)

```diff
@@ -65,6 +65,17 @@ describe("PatientStatus focus", () => {
     expect(document.activeElement).toBe(heading());
   });
 
+  it("moves focus to the new heading when the old heading had focus and staff mark the visit arrived", () => {
+    show("called");
+    button(p.onMyWay)?.focus();
+    show("on_the_way");
+    // Focus is now on the heading of the called screen. That heading leaves when the screen changes.
+    expect(document.activeElement).toBe(heading());
+    show("arrived");
+    expect(heading()?.textContent).toBe(p.arrivedHeading);
+    expect(document.activeElement).toBe(heading());
+  });
+
   it("moves focus to the heading when the sound box below leaves with focus inside", () => {
     const lost = { current: false };
     act(() =>
```

## The other tests

```diff
diff --git a/components/patient/PatientStatus.sound.click.test.tsx b/components/patient/PatientStatus.sound.click.test.tsx
new file mode 100644
index 0000000..fbe360b
--- /dev/null
+++ b/components/patient/PatientStatus.sound.click.test.tsx
@@ -0,0 +1,91 @@
+// @vitest-environment happy-dom
+// Checks the status screen and the sound box together, as app/patient/page.tsx puts them:
+// one shared flag, so focus goes to the status heading when the sound box leaves with focus inside.
+
+import { act, useRef } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import type { PatientView } from "@/lib/patientView";
+import { textFor } from "@/lib/text";
+import type { VisitStatus } from "@/lib/visit";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { PatientStatus } from "./PatientStatus";
+import { SoundSwitch } from "./SoundSwitch";
+
+// Replace the real sound player, so no real sound plays in the test.
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const t = textFor("en");
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
+/** The same parts and the same shared flag as the patient page. */
+function Page({ status }: { status: VisitStatus }) {
+  const lostFocus = useRef(false);
+  return (
+    <>
+      <PatientStatus view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lostFocus} />
+      {(status === "waiting" || status === "called") && (
+        <SoundSwitch
+          status={status}
+          language="en"
+          onFocusLost={() => {
+            lostFocus.current = true;
+          }}
+        />
+      )}
+    </>
+  );
+}
+
+let container: HTMLDivElement;
+let root: Root;
+
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
+
+beforeEach(() => {
+  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
+  // A beep that never ends, so no failed beep changes the box during the test.
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
+describe("PatientStatus with the sound box", () => {
+  it("moves focus to the heading when staff mark the visit arrived while focus is on Sound is on", async () => {
+    act(() => root.render(<Page status="called" />));
+    const turnOn = button(t.sound.turnOn);
+    turnOn?.focus();
+    await act(async () => turnOn?.click());
+    const soundOn = container.querySelector('[data-testid="sound-on"]');
+    expect(document.activeElement).toBe(soundOn);
+    act(() => root.render(<Page status="arrived" />));
+    const heading = container.querySelector("#status-heading");
+    expect(heading?.textContent).toBe(t.patient.arrivedHeading);
+    expect(document.activeElement).toBe(heading);
+  });
+});
diff --git a/components/patient/SoundSwitch.repeat.click.test.tsx b/components/patient/SoundSwitch.repeat.click.test.tsx
index 260813f..97abb84 100644
--- a/components/patient/SoundSwitch.repeat.click.test.tsx
+++ b/components/patient/SoundSwitch.repeat.click.test.tsx
@@ -88,6 +88,9 @@ describe("SoundSwitch repeat beep", () => {
     const beep = await soundOnWhileCalled();
     hidePage(true);
     await act(async () => beep.finish(false));
+    // A visibilitychange while the phone is still locked must not start a beep.
+    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
+    expect(playAlert).toHaveBeenCalledTimes(1);
     hidePage(false);
     await act(async () => document.dispatchEvent(new Event("visibilitychange")));
     expect(playAlert).toHaveBeenCalledTimes(2);
diff --git a/components/staff/FollowUpPanel.test.ts b/components/staff/FollowUpPanel.test.ts
index fbef8be..d56cca5 100644
--- a/components/staff/FollowUpPanel.test.ts
+++ b/components/staff/FollowUpPanel.test.ts
@@ -52,7 +52,7 @@ describe("FollowUpPanel phone and review flags", () => {
   ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min', and shows '%s'", (kind, calledMinutesAgo, words, shown) => {
     const html = panelHtml(calledMinutesAgo);
     // Look only inside this flag, so a time shown elsewhere in the panel cannot make the test pass.
-    const flag = html.match(new RegExp(`<p[^>]*data-testid="flag-${kind}"[^>]*>(.*?)</p>`))?.[1] ?? "";
+    const flag = html.match(new RegExp(`<p[^>]*data-testid="flag-${kind}"[^>]*>([\\s\\S]*?)</p>`))?.[1] ?? "";
     expect(flag).toContain(`<span aria-hidden="true">${shown}</span>`);
     expect(flag).toContain(`<span class="sr-only">${words}</span>`);
     expect(statusWords(html)).toContain(words);
```

## Bring back

Paste the full answer into Claude Code. Claude adds it below under "Response", with its check.

## Checked (this session, 2026-11-16)

- The new test in `PatientStatus.click.test.tsx` failed before the fix (focus on the page body) and passes after it.
- `PatientStatus.sound.click.test.tsx` fails when `lostFocus ?? ownFlag` is changed to `ownFlag`; code put back from a copy.
- The unlock test fails when the visible check in `tick()` is replaced by `true`; code put back from a copy.
- `npm test`: 52 files, 293 tests pass. `npm run lint` and `npm run build` exit 0.

## Not checked

- A real screen reader or a real phone.
- The layout with the extra `<div>` in a browser (no Playwright run this session).

## Response

Two answers from Gemini Hydrogen 4 (2026-11-16): first at the normal effort, then again at high effort. Answer 1 is below with its points kept and its wording only lightly cut; answer 2 is shortened to what it adds or changes.

### Answer 1

### 1. Does the keyed `ViewBox` catch every case where a focused element inside `PatientStatus` leaves the page?

No. `ViewBox` is keyed only by `viewKind(view)` (`"expired" | "waiting" | "called" | "other"`), so it only unmounts and fires `useReportFocusOnLeave` when `viewKind` changes. Any focused element that unmounts while `viewKind` stays the same is missed—or fails to move focus if `useRescueFocus` skips it:

* Case A — Focused element inside `OtherStatus` unmounts on a status change within `"other"` (e.g., `"arrived"` to `"removed"`): File: `components/patient/PatientStatus.tsx` (`viewKind`, `OtherStatus`, `ViewBox`). Steps that make it happen: Suppose `OtherStatus` renders an interactive control or focused sub-heading for `"arrived"` that is not rendered for `"removed"` (or `OtherStatus` keys an inner element by `view.status`), and focus is inside it when `view.status` changes from `"arrived"` to `"removed"`. Because `viewKind` returns `"other"` for both, `ViewBox` stays mounted and `useReportFocusOnLeave` never runs; focus drops to `document.body`. Smallest fix: Key `ViewBox` by `${view.expired}-${view.status}` (matching `useRescueFocus`'s trigger) rather than only `viewKind(view)`, or wrap any status-specific interactive subtree in its own `useReportFocusOnLeave` box.
* Case B — Focused element inside `Waiting` or `Called` unmounts without changing `viewKind` (e.g., a conditional link/prompt inside `Waiting`, or `OnMyWayButton` without its own reporter): While `view.status === "waiting"`, `viewKind` remains `"waiting"` across updates to `placeInLine`, `waitLow`/`waitHigh`, or `lastStillHereAt`. If any conditional element inside `Waiting` has focus and unmounts while `viewKind` stays `"waiting"`, `ViewBox` does not unmount and focus drops to `document.body`. Smallest fix: Ensure every conditionally rendered interactive child inside `Waiting` and `OtherStatus` either persists in the DOM or uses `useReportFocusOnLeave` (and see Problem 3 below regarding `useRescueFocus`'s `trigger`).
* Case C — `view.expired` changes from `true` back to `false` while `view.status` is `"called"` or `"on_the_way"`: When `view.expired` flips, `viewKind` changes, so `ViewBox` does catch `expired` changing in both directions. If `view.expired` is already `true` and `view.status` changes underneath, `viewKind` stays `"expired"`, which is fine because `Expired` renders identical markup regardless of `view.status`.

### 2. Does the extra `<div>` around each screen change the page layout or what a screen reader reads?

* What a screen reader reads: No change. A plain `<div>` with no ARIA `role`, `aria-label`, or `tabIndex` has no semantic role in the accessibility tree.
* Page layout: Potentially yes, if `PatientStatus` is placed inside a CSS Flex or Grid container. Wrapping the root in `<div ref={box}>` introduces an extra block-level box between `PatientStatus`'s parent (in `app/patient/page.tsx`) and the screen's outer element. If the parent uses `flex` or `grid`, `<div>` becomes the flex/grid item instead of `<section>`, which can alter width stretching or margin collapsing. Smallest fix: Add `className="contents"` (note: verify in Safari/Firefox that `contains(activeElement)` works, or keep a normal `<div>` if `app/patient/page.tsx` is a simple block flow).

### 3. `OnMyWayButton` and `ViewBox` both report. Can they move focus when it should not, or twice?

* Twice: No. Both call the same `markLost` callback, and `useRescueFocus` calls `.focus()` at most once per commit.
* When it should not: Yes, if `OnMyWayButton` (or `SoundSwitch`) ever unmounts in a commit where `${view.expired}-${view.status}` did not change (for instance, if `OnMyWayButton` is hidden while `sending` is true, or `SoundSwitch` unmounts due to a prop/condition change while `status` stays `"called"`). `lostFocus.current` is set to true, the `useRescueFocus` effect does not run in that commit, and the stale flag moves focus to `#status-heading` at a later status change for a departure that happened earlier.
* `"called"` to `"on_the_way"` (the normal path) is safe.
* Smallest fix: Remove `OnMyWayButton`'s `onFocusLost` if `ViewBox` is keyed per status, or remove `trigger` from `useRescueFocus`'s dependency array so the effect runs on every commit.

### 4. Is the reasoning for no `turnOn()` test right?

No. It assumes React flushes `setState("off")` and runs the `[state]` effect before the user can tap "Turn on sound". React 19 runs passive effects after paint, so a tap can arrive before the `[state]` effect runs, React batches `"on" -> "off" -> "on"` with no net change, the effect never runs, and `backgroundFocus.current` stays `false`. A later "Turn off sound" then reads the stale `false` and strands focus on `document.body`. Smallest fix: Set `backgroundFocus.current = null;` at the start of `turnOn()` (and `turnOff()`), and add a test that clicks "Turn on sound" before flushing effects.

### 5. Do the new tests check the behaviour?

1. `PatientStatus.sound.click.test.tsx` has its own `Page` harness instead of the real `app/patient/page.tsx`, so it passes if the page forgot to pass `lostFocus` or `onFocusLost`. Fix: render the real page with mocked hooks, or extract a shared part from `app/patient/page.tsx` that the test renders.
2. `SoundSwitch.repeat.click.test.tsx` does not check other non-visible states such as `"prerender"`, and never settles the second `playAlert()` call. Fix: settle it with `false` while visible and assert that "Turn on sound" returns and gets focus.
3. `FollowUpPanel.test.ts`: `panelHtml` calls `flagFor(...)` directly rather than rendering `<FollowUpPanel>`. Fix: render `<FollowUpPanel>` and query `[data-testid="flag-${kind}"]` with `DOMParser`.
4. `PatientStatus.click.test.tsx` does catch the `"on_the_way"` to `"arrived"` heading-focus bug.

### Answer 2 (high effort)

1. Same finding on `OtherStatus` (`arrived` to `removed`) and on a conditional element inside `Waiting`. Adds: keying `ViewBox` by `${view.expired}-${view.status}` catches every status or expiry change without needing to know which statuses share a screen.
2. Screen readers: no change. Layout: withdraws `className="contents"` (it says `display: contents` has had `contains()` and layout problems in Safari and older Chromium). Better fix: a normal `<div className="w-full">` if the parent is a flex column, or put the ref on the outer `<section>` of each screen instead of a wrapper.
3. Says the first answer was wrong: if `OnMyWayButton` unmounts in a commit where `${view.expired}-${view.status}` did not change (for example if `sending` hides the button while the status is still `called`), the flag stays true and fires late at the next status change. Fix: key `ViewBox` by `${view.expired}-${view.status}`, remove `onFocusLost` from `Called` and `OnMyWayButton`, and drop `trigger` from the `useRescueFocus` dependency array.
4. Same as answer 1: the reasoning is wrong; reset `backgroundFocus.current = null` inside `turnOn()` and `turnOff()`, and add a test.
5. Two more gaps. Gap A: `PatientStatus.sound.click.test.tsx` never tests focus on "Turn on sound" (sound still off) followed by `arrived`, and does not use the real page's condition for showing the sound box. Gap B: `SoundSwitch.repeat.click.test.tsx` never settles the second `playAlert()` call with `false` while visible.

## Claude's check of the response (2026-11-16)

Checked against the code on branch `phase3-review-fixes` at `01cec03`.

1. ViewBox misses (cases A and B): not a reachable bug today. `OtherStatus`, `Waiting` and `Expired` have no part that can take focus except the heading (and the `Expired` link, whose screen does not change with the status). `CallReminder` has no button, link or `tabIndex`. In `arrived` to `removed` the same `h2` stays on the page and only its words change, so focus stays on it. Both answers start with "Suppose ..." a control that does not exist. Not changed. Keying by status would also remount `Called` on `called` to `on_the_way` and reset `CallReminder`, for no gain. A guard, not a missing fix (known-issues rule).
2. Layout: no change. In `app/patient/page.tsx` the status sits inside the plain `div` with `data-testid="status-frame"` (block flow, no flex or grid). `space-y-5` on `main` acts on that frame, not on the new box. Answer 1's `contents` fix is withdrawn by answer 2. Not checked in a browser yet.
3. Stale flag: the steps are not reachable today. `sending` changes only the button's words (`label={sending ? p.sending : p.onMyWay}`); the button leaves only when the status becomes `on_the_way`, which changes the trigger. The sound box shows only for `waiting` and `called` (`app/patient/page.tsx`), so it leaves only when the status changes. So both reports always land in a commit where the trigger changes. Option for the owner: drop `trigger` so the rescue effect runs after every render of `PatientStatus` (one-line guard; every reporter sits under the same page, so `PatientStatus` renders in the same commit). Not changed yet.
4. `turnOn()`: the fix Gemini asks for is already in the code. `turnOn()` sets `backgroundFocus.current = null` (`components/patient/SoundSwitch.tsx:73`) and so does `turnOff()` (`:111`); the handoff asked only why that line has no test. Gemini's sequence cannot happen as written: "Turn on sound" is not on the page while the state is `on`, so it cannot be tapped until React has committed `off`, and `turnOn()` sets the state to `off` first, not `on`. Gemini is right on one detail: the `[state]` effect after a beep failure (an update from a promise, not a tap) may not have run when the button can first be tapped. The line in `turnOn()` covers that window, which is why it is there. Correction to the handoff's reasoning: "the effect sets it back before the button can be tapped" is not guaranteed; the line in `turnOn()` is the guard. A test cannot open that window: `act()` runs all effects before it returns.
5. Tests:
   - 5.1 and gap A (own `Page` harness): correct. The test copies the page's wiring, so a mistake in `app/patient/page.tsx` would not fail it. Fix needs a shared part taken out of the page, which touches `app/` and `components/` (plan mode per CLAUDE.md). Owner to choose.
   - 5.2 and gap B (second beep not settled): a failed beep while visible is already tested ("moves focus to Turn on sound after a tap on Turn off sound that comes right after a failed beep", `SoundSwitch.repeat.click.test.tsx`). Settling the second beep would add a small check that the unlocked retry still turns the box off on failure. Small, optional. `"prerender"`: the code checks `=== "visible"`, so every other state already counts as not visible. Not accepted.
   - 5.3 (`FollowUpPanel`): wrong. `panelHtml` renders the panel: `renderToStaticMarkup(createElement(FollowUpPanel, ...))` (`components/staff/FollowUpPanel.test.ts:41`). Not accepted.
   - 5.4: agrees with the check in this file (the test failed before the fix).

Not checked: a real screen reader or phone; the layout in a browser.
