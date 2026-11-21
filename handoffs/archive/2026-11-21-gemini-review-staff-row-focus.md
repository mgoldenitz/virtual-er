# Gemini review: staff row focus when another screen changes the visit

Model: Gemini Hydrogen 4, High, in a new chat. Find problems; do not confirm.

## Context

A concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19). Synthetic data only. Staff see a list of off-site patients; each row (`VisitRow`) has buttons. Several staff screens can be open at once; a realtime list redraws each row when another screen changes the visit.

The bug: when another screen changes a visit, a focused button in that row can leave the page (for example "Recall patient" after the visit is recalled, or "Phoned, answered" when the follow-up step changes), and keyboard focus falls to the page body. When another screen marks the visit arrived, the whole row leaves.

The fix:

1. Row stays: the `<li>` remembers the last element inside it that got focus (`onFocus` bubbles in React). When `visit` changes, if focus is on nobody and that element is no longer connected, focus goes to the row's progress line (`tabIndex={-1}`) with `preventScroll`. It does not use `blur`, because browsers do not agree on a blur when a focused element is removed.
2. Row leaves: `useReportFocusOnLeave` (layout-effect cleanup that checks `contains(document.activeElement)`) on the `<li>` calls `onFocusLost`; the page's `useRescueFocus("list-heading", ...)` moves focus to the list heading.

Settled, please do not report:

- The rescue runs only when `visit` changes, not after every render (`components/staff/useRowFocusRescue.ts:20-26`). After every render it took focus before `RecallPanel`'s one-tick refocus after Yes or Cancel, and 6 recall tests failed.
- `FocusBox` is not used for the row: a `<div>` in an `<ol>` is not valid HTML, and the phone-call buttons leave while `FollowUpPanel` stays.
- The staff files import the hooks from `components/patient/` (reuse, not copy). Moving them is a later clean-up.
- `RecallPanel.tsx:37` checks `body` only (not `<html>`); separate, not in this fix.

## Questions

1. Is there an order of React commits or browser events where focus is still lost, or moves when it must not (for example a phone tap, a focus the user moved on purpose, or a row the user's own action removed)?
2. Can `lastFocused` point to a stale element and move focus at a later, unrelated visit change?
3. Do the tests prove the fix, or can they pass for the wrong reason in happy-dom?
4. Is anything simpler that does the same job?

## Changed files (line counts after the change)

- `lib/rowFocus.ts`: 11 (new)
- `lib/rowFocus.test.ts`: 22 (new)
- `components/staff/useRowFocusRescue.ts`: 29 (new)
- `components/staff/VisitRow.tsx`: 167
- `app/staff/page.tsx`: 187
- `components/staff/VisitRow.click.test.tsx`: 203

## Checked

- Tests first: the 3 new tests in `VisitRow.click.test.tsx` failed before the fix (3 failed, 11 passed) and pass after it.
- The 2 guard tests ("a focused button that stays keeps focus", "after a phone tap ... focus does not move") fail when `focusLeftWithPart` returns `true`.
- `npm test`: 90 test files, 595 tests pass. `npm run lint`: exit 0. `npm run build`: passed.

## Not checked

- No e2e test with two staff screens open; the unit tests draw the changed visit as the realtime list does.
- Not tried with a real screen reader.
- `FollowUpPanel` phone-call buttons leaving: covered by the same code path, but no test of its own.

## Helpers the changed lines call (not in the diff)

`components/patient/noFocus.ts`:

```ts
export function focusIsOnNobody(): boolean {
  const focused = document.activeElement;
  return !focused || focused === document.body || focused === document.documentElement;
}
```

`components/patient/useFocusRescue.ts`:

```ts
export function useReportFocusOnLeave(part: RefObject<HTMLElement | null>, onLost?: () => void): void {
  const latest = useRef(onLost);
  useLayoutEffect(() => {
    latest.current = onLost;
  });
  useLayoutEffect(() => {
    const node = part.current;
    return () => {
      if (node?.contains(document.activeElement)) latest.current?.();
    };
  }, [part]);
}

export function useRescueFocus(targetId: string, lostRef: RefObject<boolean>): () => void {
  useEffect(() => {
    if (!lostRef.current) return;
    lostRef.current = false;
    if (!focusIsOnNobody() && document.activeElement?.isConnected) return;
    const target = document.getElementById(targetId);
    if (target) target.focus({ preventScroll: true });
  });
  return () => {
    lostRef.current = true;
  };
}
```

`components/staff/RecallPanel.tsx` (the one-tick refocus):

```ts
const returnToRecall = () => {
  setMode("idle");
  window.setTimeout(() => {
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost) recallButton.current?.focus();
  }, 0);
};
```

## The diff

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 5f7a668..dce2223 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -23,6 +23,7 @@ import { VisitSlip } from "@/components/staff/VisitSlip";
 import { WaitingOnSite } from "@/components/staff/WaitingOnSite";
 import { StaffShell } from "@/components/staff/StaffShell";
 import { Button } from "@/components/Button";
+import { useRescueFocus } from "@/components/patient/useFocusRescue";
 import { useNow } from "@/components/useNow";
 
 export default function StaffPage() {
@@ -43,6 +44,10 @@ export default function StaffPage() {
     if (homeVisit) document.getElementById("checkin-heading")?.focus();
   }, [homeVisit]);
   const listHeading = useRef<HTMLHeadingElement>(null);
+  // Another screen took a patient off the list while a button in that row had focus:
+  // focus goes to the list heading, so it is never lost.
+  const lostRowFocus = useRef(false);
+  const markRowLost = useRescueFocus("list-heading", lostRowFocus);
 
   // A patient just left the list: say so, and move keyboard focus from the vanished row
   // to the list heading, so it is never lost.
@@ -161,6 +166,7 @@ export default function StaffPage() {
                   now={now}
                   onShowSlip={setSlip}
                   onLeftList={onLeftList}
+                  onFocusLost={markRowLost}
                 />
               ))}
             </ol>
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index 6ea98e5..ffb2d21 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -11,11 +11,13 @@ import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 import { switchedAt } from "@/lib/switchToOffsite";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
+import { useReportFocusOnLeave } from "@/components/patient/useFocusRescue";
 import { Duration } from "./Duration";
 import { DemoTag } from "./DemoTag";
 import { FollowUpPanel } from "./FollowUpPanel";
 import { NewLinkPanel } from "./NewLinkPanel";
 import { RecallPanel } from "./RecallPanel";
+import { useRowFocusRescue } from "./useRowFocusRescue";
 
 type Props = {
   visit: Visit;
@@ -23,6 +25,8 @@ type Props = {
   onShowSlip: (visit: Visit) => void;
   /** Called after a change takes this patient off the list, so the page can say so and move focus. */
   onLeftList: (message: string) => void;
+  /** Called when the row leaves the page with focus inside it (another screen took the patient off the list). */
+  onFocusLost?: () => void;
 };
 
 const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
@@ -62,7 +66,7 @@ function progress(visit: Visit, now: Date): ReactNode {
   );
 }
 
-export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
+export function VisitRow({ visit, now, onShowSlip, onLeftList, onFocusLost }: Props) {
   const [note, setNote] = useState("");
   const [saving, setSaving] = useState(false);
   /** A short "it worked" message, for a change that keeps the patient on the list. */
@@ -82,6 +86,11 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   };
   /** The progress line, which stays on the page when the "Recall patient" button leaves it. */
   const progressLine = useRef<HTMLParagraphElement>(null);
+  // When another screen changes this visit, a button with focus can leave the page (for example
+  // "Recall patient"): focus goes to the progress line. When the whole row leaves, the page is told.
+  const row = useRef<HTMLLIElement>(null);
+  const rememberFocus = useRowFocusRescue(progressLine, visit);
+  useReportFocusOnLeave(row, onFocusLost);
   /** True once a recall from this row is saved. */
   const [recallSaved, setRecallSaved] = useState(false);
   /** True once focus has moved after that recall, so it moves only once. */
@@ -105,7 +114,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;
 
   return (
-    <li className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
+    <li ref={row} onFocus={rememberFocus} className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
       <div className="flex flex-wrap items-baseline justify-between gap-2">
         <p className="font-mono text-xl font-bold tracking-widest">
           {visit.code}
diff --git a/components/staff/useRowFocusRescue.ts b/components/staff/useRowFocusRescue.ts
new file mode 100644
index 0000000..cf7117c
--- /dev/null
+++ b/components/staff/useRowFocusRescue.ts
@@ -0,0 +1,29 @@
+"use client";
+
+// Keeps keyboard focus in a staff row when another staff screen changes the visit, and the button
+// that had focus leaves the page (for example "Recall patient"): focus goes to the target instead.
+// It does not use blur, because browsers do not agree on a blur when a focused button is removed.
+
+import { useEffect, useRef, type FocusEvent, type RefObject } from "react";
+import { focusLeftWithPart } from "@/lib/rowFocus";
+import { focusIsOnNobody } from "@/components/patient/noFocus";
+
+/**
+ * Gives back an onFocus handler for the row. Focus events bubble, so it learns each part that gets
+ * focus. Each time `visit` changes, if that part left the page and nothing has focus, the target gets focus.
+ * It runs only on a visit change, not after every render: when the row's own question closes
+ * (Yes or Cancel), RecallPanel puts focus back itself one tick later, and this must not take it first.
+ */
+export function useRowFocusRescue(target: RefObject<HTMLElement | null>, visit: unknown): (event: FocusEvent<HTMLElement>) => void {
+  /** The last part of the row that had focus, or null. */
+  const lastFocused = useRef<HTMLElement | null>(null);
+  useEffect(() => {
+    const last = lastFocused.current;
+    if (!focusLeftWithPart(focusIsOnNobody(), last ? last.isConnected : null)) return;
+    lastFocused.current = null;
+    target.current?.focus({ preventScroll: true });
+  }, [target, visit]);
+  return (event) => {
+    lastFocused.current = event.target;
+  };
+}
diff --git a/lib/rowFocus.test.ts b/lib/rowFocus.test.ts
new file mode 100644
index 0000000..83908ff
--- /dev/null
+++ b/lib/rowFocus.test.ts
@@ -0,0 +1,22 @@
+// Checks when a staff row takes focus back after a part with focus leaves the page.
+
+import { describe, expect, it } from "vitest";
+import { focusLeftWithPart } from "./rowFocus";
+
+describe("focusLeftWithPart", () => {
+  it("is true when focus is on nobody and the focused part left the page", () => {
+    expect(focusLeftWithPart(true, false)).toBe(true);
+  });
+
+  it("is false when the focused part is still on the page (focus moved away on purpose)", () => {
+    expect(focusLeftWithPart(true, true)).toBe(false);
+  });
+
+  it("is false when another part of the page has focus", () => {
+    expect(focusLeftWithPart(false, false)).toBe(false);
+  });
+
+  it("is false when no part of the row had focus (a phone tap)", () => {
+    expect(focusLeftWithPart(true, null)).toBe(false);
+  });
+});
diff --git a/lib/rowFocus.ts b/lib/rowFocus.ts
new file mode 100644
index 0000000..b3935e4
--- /dev/null
+++ b/lib/rowFocus.ts
@@ -0,0 +1,11 @@
+// Decides when a staff row must take keyboard focus back: the part that had focus left the page
+// (for example "Recall patient" after another screen recalled the visit), and nothing has focus now.
+
+/**
+ * True when focus is on nobody and the last part of the row that had focus is no longer on the page.
+ * `lastFocusedOnPage` is null when no part of the row had focus.
+ * Focus on a part that stays, or on the page body after a phone tap, is left where it is.
+ */
+export function focusLeftWithPart(focusOnNobody: boolean, lastFocusedOnPage: boolean | null): boolean {
+  return focusOnNobody && lastFocusedOnPage === false;
+}
diff --git a/components/staff/VisitRow.click.test.tsx b/components/staff/VisitRow.click.test.tsx
index 14c2984..c681dc8 100644
--- a/components/staff/VisitRow.click.test.tsx
+++ b/components/staff/VisitRow.click.test.tsx
@@ -1,8 +1,9 @@
 // @vitest-environment happy-dom
 // Presses "Recall patient" on a staff row in a test browser (happy-dom): it saves only after "Yes",
 // and focus then moves to the progress line, because the "Recall patient" button leaves the page.
+// Also: when another staff screen changes the row, focus in a button that leaves is not lost.
 
-import { act } from "react";
+import { StrictMode, act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { callBackVisit } from "@/data/staffActions";
@@ -153,3 +154,50 @@ describe("VisitRow recall", () => {
     expect(container.textContent).toContain(result === "not_saved" ? "Not saved" : "The list just changed");
   });
 });
+
+describe("VisitRow focus when another screen changes the row", () => {
+  /** Draws the row in StrictMode, which runs each effect twice, as the dev server does. */
+  const drawStrict = (visit: Visit | null, onFocusLost = vi.fn()) =>
+    act(() =>
+      root.render(
+        <StrictMode>
+          {visit && <VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} onFocusLost={onFocusLost} />}
+        </StrictMode>,
+      ),
+    );
+
+  beforeEach(() => drawStrict(waiting));
+
+  it("when another screen recalls the patient, focus moves from Recall patient to the progress line", () => {
+    button("Recall patient")?.focus();
+    drawStrict(called);
+    expect(document.activeElement).toBe(progressLine());
+  });
+
+  it("when another screen recalls the patient during the question, focus moves from Yes to the progress line", async () => {
+    await press("Recall patient");
+    expect(document.activeElement).toBe(button("Yes, recall patient"));
+    drawStrict(called);
+    expect(document.activeElement).toBe(progressLine());
+  });
+
+  it("a focused button that stays keeps focus", () => {
+    button("Mark arrived")?.focus();
+    drawStrict(called);
+    expect(document.activeElement).toBe(button("Mark arrived"));
+  });
+
+  it("after a phone tap (focus on the page body), focus does not move", async () => {
+    await act(async () => button("Show QR again")?.click());
+    drawStrict(called);
+    expect(document.activeElement).toBe(document.body);
+  });
+
+  it("when the row leaves the list with focus inside it, it reports the lost focus once", () => {
+    const onFocusLost = vi.fn();
+    drawStrict(waiting, onFocusLost);
+    button("Mark arrived")?.focus();
+    drawStrict(null, onFocusLost);
+    expect(onFocusLost).toHaveBeenCalledTimes(1);
+  });
+});
```

## Response

Gemini Hydrogen 4, High, 2026-11-21 (pasted by the owner):

### 1. Orders of commits or events where focus is still lost or moves when it must not

- Phone tap after earlier focus in the row moves focus to `progressLine` when it must not (`useRowFocusRescue.ts`, `VisitRow.tsx`, `RecallPanel.tsx`). Sequence: a control in the row that can leave gets focus (for example "Recall patient" on desktop, or "Recall patient" then "Cancel" on a phone, which focuses `yesButton` and then `recallButton`, so `lastFocused` becomes "Recall patient" even on touch). Next the user taps "Show QR again" or blank space on a phone: the tap blurs "Recall patient" to `document.body` without a `focus` event on the tapped element, so `lastFocused` stays "Recall patient". When another screen later recalls the visit, "Recall patient" leaves, `focusIsOnNobody()` is true, and focus moves to `progressLine`. Smallest fix: clear `lastFocused` on document `pointerdown` outside it, not with `onBlur`.
- Focus the user moved on purpose outside the row is taken back later. Sequence: focus "Recall patient" in row A, then Tab or click outside row A. `lastFocused` in row A is never cleared. If focus later rests on `document.body` when row A updates and the button is gone, focus moves into row A's `progressLine`. Smallest fix: on the `<li>` `onBlur` (or a document `focusin`), clear `lastFocused` when `relatedTarget` is non-null and outside the row.
- `RecallPanel`'s `setTimeout(0)` races with a `visit` update. Sequence: staff open the question and click "Cancel" (or "Yes" with a failed or slow save). `returnToRecall` sets `idle` (the focused button leaves, focus drops to body) and queues the refocus. If a `visit` update that keeps the row `waiting` commits before the timer, the rescue moves focus to `progressLine`; the timer then sees focus not lost and "Recall patient" never gets focus. Smallest fix: replace the `setTimeout(0)` with a ref-flagged `useEffect`.
- List reordering (`insertBefore`) in a real browser can still lose focus: focus on a button that stays ("Mark arrived"), another screen changes the `<ol>` order; React's `insertBefore` blurs it to `document.body` although it stays connected, so `focusLeftWithPart(true, true)` is false and focus stays on the body.

### 2. Stale `lastFocused` moving focus on a later, unrelated `visit` change

- `lastFocused` keeps a detached node when a part leaves while focus is elsewhere: focus "Recall patient" in row A, move focus to row B; another screen recalls row A; the rescue returns before `lastFocused.current = null` because focus is not on nobody. Later, with focus on the body and an unrelated change for row A, focus is taken to row A's `progressLine`.
- Same through `RecallPanel`: open the question (`lastFocused` = Yes), click Cancel (Yes leaves), move focus outside the row before the timer runs. `lastFocused` stays on the detached Yes.
- Smallest fix: in the effect, always clear `lastFocused` when `last && !last.isConnected`, whatever `focusIsOnNobody()` says, and also clear it when focus moves outside the row or on a pointer tap.

### 3. Tests that pass for the wrong reason in happy-dom

- The tests still pass if `focusIsOnNobody()` is ignored (`return lastFocusedOnPage === false;`). No test has a focused button leave while focus is on another element. Fix: a test that focuses "Recall patient", moves focus to a button outside the row, draws `called`, and expects the outside button to keep focus.
- The phone-tap test passes only because the row never had focus first. Fix: a test that focuses "Recall patient" (or Recall then Cancel), blurs to the body, draws `called`, and expects focus to stay on the body.
- The row-leave rescue in `app/staff/page.tsx` is not tested: test 5 only checks the `vi.fn()` spy; deleting `onFocusLost={markRowLost}` or a wrong id keeps all tests green. Fix: a test with `useRescueFocus("list-heading", ...)`, an `<h2 id="list-heading" tabIndex={-1}>` and a `VisitRow` that leaves with focus inside, expecting focus on the heading.
- happy-dom hides real-browser `insertBefore` blur; `FollowUpPanel` buttons leaving and the `setTimeout(0)` order have no tests.

### 4. Simpler options

- Inline `lib/rowFocus.ts` into the hook (removes 2 files, 33 lines): `if (!last || last.isConnected) return; lastFocused.current = null; if (!focusIsOnNobody()) return;`, which also fixes the stuck detached element.
- Move `RecallPanel`'s refocus from `setTimeout(0)` into a `useEffect` on the commit that returns to `idle`; child effects run before parent effects, so it refocuses before the row's rescue.
- Alternative: `useReportFocusOnLeave` on `RecallPanel`'s wrapper and around `FollowUpPanel`'s phone-call buttons, in place of `onFocus` + `lastFocused`; keeping `onFocus` on the `<li>` with the fixes above covers every row button.

## Check (Claude, 2026-11-21)

- 1a, phone tap after earlier focus: valid. A tap on a part that cannot take focus gives no `focus` event, so `lastFocused` stays. Accept: clear `lastFocused` on a `pointerdown` in the row or on the page. Not `onBlur` with a null `relatedTarget`, because a removed button can also give that blur in Chrome.
- 1b, focus moved out of the row on purpose: valid. Accept: `onBlur` on the `<li>` clears `lastFocused` when `relatedTarget` is not null and is outside the row.
- 1c and 4b, `setTimeout(0)` race in `RecallPanel`: valid, but the window is one tick. React runs child effects before parent effects, so a `useEffect` in `RecallPanel` refocuses before the row rescue. Accept as an option; it changes `RecallPanel.tsx`, which the 6 recall tests cover.
- 1d, `insertBefore` blur: partly valid. Chrome loses focus when React moves a node that holds focus. But `activeLine` (`lib/queue.ts:24`) sorts by triage time, which a status change does not change, so existing rows do not move; React only inserts or removes other rows. Reject as a fix now; add it to "Not covered" in known-issues.
- 2, detached `lastFocused` kept when focus is elsewhere: valid. Accept: the effect clears a detached `last` first, then checks `focusIsOnNobody()`.
- 3, tests that pass for the wrong reason: valid, all 3. Accept: (a) focus outside the row keeps focus when the part leaves; (b) earlier focus in the row, then a tap to the body, then `draw(called)`: focus stays on the body; (c) a page-level test where the row leaves and focus goes to `#list-heading`.
- 4a, inline `lib/rowFocus.ts`: reject. CLAUDE.md says each function that decides goes in `lib/` with a test. Keep the file; the new order of checks (clear a detached part first) goes in the hook, and `lib/rowFocus.ts` keeps the decision.
- 4c, `useReportFocusOnLeave` on the panels: reject. It needs a wrapper per panel, and the `FollowUpPanel` buttons leave while the panel stays (settled point in this handoff).

Owner chose (2026-11-21): the stale-part fix (2, 1a, 1b) and the 3 new tests (3). Not done: the `RecallPanel` `useEffect` (1c, 4b), listed as a limit in `docs/known-issues.md`. Done: tests first in `1d883f1` (2 failed), then the fix; 91 test files, 600 tests pass; lint exit 0; build passed.
