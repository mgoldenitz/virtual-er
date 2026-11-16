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
