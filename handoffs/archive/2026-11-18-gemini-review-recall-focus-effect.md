# Gemini review: recall focus in an effect, and useId for the question

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-18. No keys and no patient data in this file; all visits are synthetic.

## Question to ask

You review a small change in a Next.js (App Router, React 19) concept prototype of a virtual ER waiting room. Staff recall a patient from a staff screen. Find problems; do not confirm that the change is good. For each problem give the file and line, what goes wrong, and the smallest fix.

The change fixes 2 points from an earlier review:
1. After a saved recall, focus moved to the row's progress line after `setTimeout(0)`, which does not wait for React to draw the row as `called`. Now a saved recall sets a state flag `recallSaved`, and an effect on `[recallSaved, visit.status]` focuses the progress line when the flag is true and the status is `called`. A ref `focusDone` makes it run once. The list can get the called visit before or after `callBackVisit` returns "saved" (the real save puts the new visit in the list first, but React can draw it later), so the flag is state, not a ref.
2. The question id was `recall-question-${code}`. Now it comes from `useId()`.

Not changed, on purpose: while the save runs, focus waits on "Recall patient" (`aria-disabled`), because "Yes" has left the page. A click is a discrete event in React 19, so a second click on "Yes" sees `saving === true`; "Cancel" saves nothing.

Questions:
a. Can the effect miss the focus move (for example the row unmounts, the status skips `called` and goes to `on_the_way` before the effect runs, or the parent keys the row again)? What happens then?
b. `focusDone` is never reset. Can a row need a second focus move in its lifetime?
c. Do the tests prove both orders of the list change and "saved" in a way that holds in a real browser? Name any path that has no test.

## Changed files (lines now)

- `components/staff/VisitRow.tsx`: 142 lines (16 changed)
- `components/staff/RecallPanel.tsx`: 77 lines (8 changed)
- `components/staff/VisitRow.click.test.tsx`: 139 lines (68 changed)
- `components/staff/RecallPanel.click.test.tsx`: 125 lines (21 added)

## Checked

- After commit `7c355ea`: `npm test` 65 test files, 375 tests pass; `npm run lint` 0 errors, 2 warnings (old helper files, not in this diff); `npm run build` passed.
- The test for "the list changes after saved" and the two-panels id test failed before the fix (commit `362d866`) and pass after.
- The tests for a slow `not_saved` and `refused`, and for "the list changes before saved", passed before the fix too.

## Not checked

- Not checked in a real browser or with a real screen reader.

## Helpers the changed lines call (not in the diff)

`act` in `components/staff/VisitRow.tsx`:

```tsx
const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string): Promise<ChangeResult | undefined> => {
  if (saving) return; // while one change is on its way, further presses do nothing
  setSaving(true);
  setOkNote("");
  const result = await change();
  setSaving(false);
  if (result === "saved" && leftListMessage) {
    onLeftList(leftListMessage);
  }
  setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
  return result;
};
```

`returnToRecall` and `confirm` in `components/staff/RecallPanel.tsx` (not changed):

```tsx
const returnToRecall = () => {
  setMode("idle");
  window.setTimeout(() => {
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost) recallButton.current?.focus();
  }, 0);
};
const confirm = () => { if (saving) return; onConfirm(); returnToRecall(); };
```

`changeVisit` (`data/staffActions.ts`) puts the new visit into the list (`putVisit`) before it returns "saved". The staff page keys each row by `visit.id`. The row shows `<RecallPanel>` only while `visit.status === "waiting"`. The progress line is `<p ref={progressLine} tabIndex={-1} data-testid="progress">`. Visit statuses after `called`: `on_the_way`, then the visit leaves the list.

## Diff (commits 362d866 and 7c355ea)

```diff
diff --git a/components/staff/RecallPanel.click.test.tsx b/components/staff/RecallPanel.click.test.tsx
index b0789d8..c805c4b 100644
--- a/components/staff/RecallPanel.click.test.tsx
+++ b/components/staff/RecallPanel.click.test.tsx
@@ -101,4 +101,25 @@ describe("RecallPanel taps", () => {
     expect(document.getElementById(id ?? "")?.textContent).toContain("Recall visit ABC234?");
     expect(document.getElementById(id ?? "")?.textContent).toContain("There is no undo.");
   });
+
+  it("two open questions for the same code each have their own question id", async () => {
+    act(() =>
+      root.render(
+        <>
+          <div data-testid="first"><RecallPanel code="ABC234" saving={false} onConfirm={vi.fn()} /></div>
+          <div data-testid="second"><RecallPanel code="ABC234" saving={false} onConfirm={vi.fn()} /></div>
+        </>,
+      ),
+    );
+    for (const panel of ["first", "second"]) {
+      const open = container.querySelector(`[data-testid="${panel}"] button`) as HTMLButtonElement;
+      await act(async () => open.click());
+    }
+    for (const panel of ["first", "second"]) {
+      const box = container.querySelector(`[data-testid="${panel}"]`) as HTMLElement;
+      const yes = [...box.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Yes"));
+      const question = document.getElementById(yes?.getAttribute("aria-describedby") ?? "");
+      expect(box.contains(question)).toBe(true);
+    }
+  });
 });
diff --git a/components/staff/RecallPanel.tsx b/components/staff/RecallPanel.tsx
index 55df158..bef8714 100644
--- a/components/staff/RecallPanel.tsx
+++ b/components/staff/RecallPanel.tsx
@@ -3,7 +3,7 @@
 // The "Recall patient" button for one waiting visit. Staff must confirm first, because a recall
 // has no undo: the phone shows "Please head back now" at once. This file only asks; the parent saves.
 
-import { useEffect, useRef, useState } from "react";
+import { useEffect, useId, useRef, useState } from "react";
 import { Button } from "@/components/Button";
 
 type Props = {
@@ -21,6 +21,8 @@ export function RecallPanel({ code, saving, onConfirm }: Props) {
   const [mode, setMode] = useState<Mode>("idle");
   const recallButton = useRef<HTMLButtonElement>(null);
   const yesButton = useRef<HTMLButtonElement>(null);
+  /** A page-wide unique id for the question, so each "Yes" points to its own question. */
+  const questionId = useId();
 
   // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
   useEffect(() => {
@@ -55,13 +57,13 @@ export function RecallPanel({ code, saving, onConfirm }: Props) {
   return (
     <div className="w-full space-y-2">
       {/* "Yes" points to this question, so a screen reader reads the code and "There is no undo." */}
-      <p id={`recall-question-${code}`} className="font-semibold">
+      <p id={questionId} className="font-semibold">
         {`Recall visit ${code}? The patient's phone will show "Please head back now". There is no undo.`}
       </p>
       <div className="flex flex-wrap gap-2">
         <Button variant="danger" ref={yesButton}
           aria-disabled={saving}
-          aria-describedby={`recall-question-${code}`}
+          aria-describedby={questionId}
           onClick={confirm}
         >
           Yes, recall patient
diff --git a/components/staff/VisitRow.click.test.tsx b/components/staff/VisitRow.click.test.tsx
index ee48210..3834540 100644
--- a/components/staff/VisitRow.click.test.tsx
+++ b/components/staff/VisitRow.click.test.tsx
@@ -3,11 +3,11 @@
 // and focus then moves to the progress line, because the "Recall patient" button leaves the page.
 
 import { act } from "react";
-import { flushSync } from "react-dom";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { callBackVisit } from "@/data/staffActions";
 import { callBack, checkInAtDesk } from "@/lib/visitActions";
+import type { ChangeResult, Visit } from "@/lib/visit";
 import { VisitRow } from "./VisitRow";
 
 // The save is replaced, so the test controls what it returns.
@@ -24,15 +24,28 @@ vi.mock("@/data/staffActions", () => ({
 const now = new Date("2026-11-18T20:00:00Z");
 const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
 const waiting = checkInAtDesk(input, "waiting", new Date(now.getTime() - 30 * 60_000));
+const called = callBack(waiting, now);
+if (!called) throw new Error("callBack refused the test visit");
 
 let container: HTMLDivElement;
 let root: Root;
 
 const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+const progressLine = () => container.querySelector('[data-testid="progress"]') as HTMLElement;
+
+/** Draws the row for this visit, as the page does when the list changes. */
+const draw = (visit: Visit) => act(() => root.render(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));
 
 /** Lets the one-tick focus waits (setTimeout 0) run. */
 const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
 
+/** A save that only finishes when the test calls `finish`, like a slow network. */
+function slowSave() {
+  let finish: (result: ChangeResult) => void = () => {};
+  vi.mocked(callBackVisit).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
+  return (result: ChangeResult) => act(async () => finish(result));
+}
+
 async function press(words: string) {
   const target = button(words);
   if (!target) throw new Error(`No button "${words}"`);
@@ -45,7 +58,7 @@ beforeEach(() => {
   container = document.createElement("div");
   document.body.appendChild(container);
   root = createRoot(container);
-  act(() => root.render(<VisitRow visit={waiting} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));
+  draw(waiting);
 });
 
 afterEach(() => {
@@ -63,9 +76,10 @@ describe("VisitRow recall", () => {
     vi.mocked(callBackVisit).mockResolvedValue("saved");
     await press("Recall patient");
     await press("Yes, recall patient");
-    await nextTick(); // focus moves one tick later, after the row shows the called text
+    draw(called); // the list gets the called visit, so the row shows it
+    await nextTick();
     expect(callBackVisit).toHaveBeenCalledWith("v1");
-    expect(document.activeElement).toBe(container.querySelector('[data-testid="progress"]'));
+    expect(document.activeElement).toBe(progressLine());
   });
 
   it("after Yes and a failed save, shows the not-saved note and keeps the progress line out of focus", async () => {
@@ -73,26 +87,33 @@ describe("VisitRow recall", () => {
     await press("Recall patient");
     await press("Yes, recall patient");
     expect(container.textContent).toContain("Not saved");
-    expect(document.activeElement).not.toBe(container.querySelector('[data-testid="progress"]'));
+    expect(document.activeElement).not.toBe(progressLine());
   });
 
-  it("after a save, the progress line already shows the called text when focus lands on it", async () => {
-    const called = callBack(waiting, now);
-    if (!called) throw new Error("callBack refused the test visit");
-    // Like the real save: the list gets the called visit before the save says "saved", but a
-    // browser draws that change in a later task, not at once. flushSync draws it in that task.
-    vi.mocked(callBackVisit).mockImplementation(async () => {
-      window.setTimeout(() =>
-        flushSync(() => root.render(<VisitRow visit={called} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />)),
-      );
-      return "saved";
-    });
-    const progress = container.querySelector('[data-testid="progress"]') as HTMLElement;
+  it("when the row shows the called visit before the save says saved, focus lands on the called text", async () => {
+    const finish = slowSave();
     let textAtFocus = "";
-    progress.addEventListener("focus", () => (textAtFocus = progress.textContent ?? ""));
+    progressLine().addEventListener("focus", () => (textAtFocus = progressLine().textContent ?? ""));
     await press("Recall patient");
     await press("Yes, recall patient");
+    draw(called); // the real save puts the called visit in the list before it returns
+    await finish("saved");
     await nextTick();
+    expect(document.activeElement).toBe(progressLine());
+    expect(textAtFocus).toContain("Called");
+  });
+
+  it("when the row shows the called visit after the save says saved, focus waits for the called text", async () => {
+    const finish = slowSave();
+    let textAtFocus = "";
+    progressLine().addEventListener("focus", () => (textAtFocus = progressLine().textContent ?? ""));
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    await finish("saved");
+    await nextTick();
+    draw(called); // the browser draws the list change later
+    await nextTick();
+    expect(document.activeElement).toBe(progressLine());
     expect(textAtFocus).toContain("Called");
     expect(textAtFocus).not.toContain("Waiting off-site");
   });
@@ -104,4 +125,15 @@ describe("VisitRow recall", () => {
     await nextTick();
     expect(document.activeElement).toBe(button("Recall patient"));
   });
+
+  it.each(["not_saved", "refused"] as const)("after a slow save that ends %s, focus is on Recall patient", async (result) => {
+    const finish = slowSave();
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    await nextTick();
+    await finish(result);
+    await nextTick();
+    expect(document.activeElement).toBe(button("Recall patient"));
+    expect(container.textContent).toContain(result === "not_saved" ? "Not saved" : "The list just changed");
+  });
 });
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index e9a808d..05362a9 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -3,7 +3,7 @@
 // One patient in the staff's off-site list: minutes waited, call-back progress and actions.
 // The no-response flags and phone-call buttons are in FollowUpPanel.
 
-import { useRef, useState, type ReactNode } from "react";
+import { useEffect, useRef, useState, type ReactNode } from "react";
 import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
 import { minutesBetween } from "@/lib/queue";
 import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
@@ -70,10 +70,20 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   };
   /** The progress line, which stays on the page when the "Recall patient" button leaves it. */
   const progressLine = useRef<HTMLParagraphElement>(null);
+  /** True once a recall from this row is saved. */
+  const [recallSaved, setRecallSaved] = useState(false);
+  /** True once focus has moved after that recall, so it moves only once. */
+  const focusDone = useRef(false);
   const recall = async () => {
-    // Wait one tick, so the row shows the called text before a screen reader reads it.
-    if ((await act(() => callBackVisit(visit.id))) === "saved") window.setTimeout(() => progressLine.current?.focus(), 0);
+    if ((await act(() => callBackVisit(visit.id))) === "saved") setRecallSaved(true);
   };
+  // Focus moves only once React has drawn the row as called, so a screen reader reads the called
+  // text. The list can get the called visit before or after the save says "saved"; this works both ways.
+  useEffect(() => {
+    if (!recallSaved || visit.status !== "called" || focusDone.current) return;
+    focusDone.current = true;
+    progressLine.current?.focus();
+  }, [recallSaved, visit.status]);
   /** After "Issue a new link" saves: open the slip with the new QR code and say what happened. */
   const showNewLink = (updated: Visit) => {
     onShowSlip(updated);
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted as given (formatting made plain).

### Problems found

1. Focus drops to `document.body` if `visit.status` skips `called` before the effect runs. `components/staff/VisitRow.tsx` lines 82 to 86. If the patient taps "I'm on my way" (or other staff mark the visit arrived) before the staff browser draws `called`, the status goes from `waiting` straight to `on_the_way` (or `arrived` / `needs_reassessment`). `<RecallPanel>` unmounts with focus on "Recall patient", the effect stops because the status is not `called`, and focus falls to the body. Fix: check `visit.status === "waiting"` (return) instead of `!== "called"`.

2. `focusDone` and `recallSaved` are never reset, so a second recall of the same visit gets no focus move. `components/staff/VisitRow.tsx` lines 74 to 86. A visit can go back to `waiting` with the same `visit.id` (from `needs_reassessment`, or a closed `unable_to_reach` visit opened again). Fix: remove `focusDone`, and call `setRecallSaved(false)` in the effect before the focus:
   `useEffect(() => { if (!recallSaved || visit.status === "waiting") return; setRecallSaved(false); progressLine.current?.focus(); }, [recallSaved, visit.status]);`

3. A window for a second recall after "saved" and before `visit.status` changes. `components/staff/VisitRow.tsx` lines 74 to 79. `act()` sets `saving` to false when "saved" comes, before the list draws `called`; the panel is already `idle`, so "Recall patient" is active and staff can confirm a second recall. Fix: `saving={saving || recallSaved}` on `<RecallPanel>`.

4. Focus drops to the body when other staff change the visit while focus is in the panel. `components/staff/VisitRow.tsx` lines 82 to 86 and `components/staff/RecallPanel.tsx` lines 55 to 69. Also after a `refused` "Yes" because other staff recalled first: `recallSaved` stays false, the panel unmounts, focus falls to the body. Fix: a wrapper ref in `RecallPanel` and an `onFocusLost` callback in a `useLayoutEffect` cleanup, wired to focus the progress line.

5. The "called before saved" test skips the panel's `setTimeout(0)` before the panel unmounts. `components/staff/VisitRow.click.test.tsx` lines 93 to 104. The test calls `draw(called)` straight after "Yes", without `await nextTick()`, so the real browser order (focus on "Recall patient", then body on unmount, then the progress line on "saved") is not run. It also has no `not.toContain("Waiting off-site")`. Fix: add `await nextTick()` after "Yes" and the missing check.

### Answers to questions a to c

a. Yes, in 4 ways: the status skips `called` (and `recallSaved` stays true); the row unmounts while the save runs (focus to body); a new key remounts the row with fresh state; a recall from another screen makes this one `refused` while the panel unmounts.

b. Yes. A visit keeps its `visit.id` when it goes to `needs_reassessment` and back to `waiting`, or when a closed visit such as `unable_to_reach` is opened again. `focusDone` stays true and blocks the second focus move.

c. No. `act()` runs effects at once and hides real draw timing. The "called before saved" test misses the `nextTick()`. No test: status skips `called`; row unmounts while saving; a second recall on the same row; another screen recalls while this save returns `refused` or `not_saved`; `nextTick()` between "Yes" and `draw(called)`; `draw(called)` and `finish("saved")` in one `act()`; clicks on "Recall patient" or a double tap on "Yes" while saving or after "saved"; Enter, Space, Tab and "Cancel" in `VisitRow.click.test.tsx`; the two `useId()` values are not compared (`id1 !== id2`).

## Claude's check

2026-11-18. Checked against the code on `phase3-review-fixes` at `cde7768`.

1. Valid, adopt. Our own `putVisit` puts `called` into the list before "saved", so the skip is rare, but a patient tap or another staff screen can make the next drawn status `on_the_way`. The effect then never runs and focus stays on the body. Fix: return when the status is `waiting`, not when it is not `called`. The `progress` text for `on_the_way` also starts with "Called", so the screen reader still reads the right line. New test: the row is drawn as `on_the_way` after "saved"; focus must be on the progress line.

2. Not valid in practice. `activeLine` (`lib/queue.ts` line 25) keeps only `ACTIVE_STATUSES` (`lib/visit.ts` line 54: `waiting`, `called`, `on_the_way`). From `called` or `on_the_way` a visit can get back to `waiting` only through `arrived` or `removed` (undo) or through `unable_to_reach` and `needs_reassessment` (`lib/allowedSteps.ts`). None of those is in the list, so the row unmounts and React resets `recallSaved` and `focusDone` when it comes back. The suggested fix also calls `setRecallSaved(false)` in the effect, which the lint rule `react-hooks/set-state-in-effect` refuses. No change.

3. Not valid. In `act` (`components/staff/VisitRow.tsx` lines 59 to 70), `callBackVisit` queues the list update before it returns "saved", and `setSaving(false)` comes after it, so React draws both in one update. If a second "Yes" ever got through, the database step check refuses `called` to `called` and the row shows "The list just changed". No change.

4. Known item, no change now. This is the Phase 5 item in `docs/known-issues.md` line 48 (focus falls to the body when another staff screen changes a visit). The `refused` case is part of it: another screen made the change.

5. Valid, adopt. The "called before saved" test gets `await nextTick()` after "Yes" and `expect(textAtFocus).not.toContain("Waiting off-site")`.

Questions a to c: a is covered by points 1 and 4; b by point 2 (the row unmounts); c by points 1 and 5. The other paths with no test (keys, "Cancel", double taps) are covered in `RecallPanel.click.test.tsx`, which already tests "Yes" while `saving` and "Cancel". The `useId` test checks that each panel's question is inside its own box, which fails if the two ids are the same.

Plan: test first (point 1 test and point 5 changes), "Test:" commit, then the fix, "Fix:" commit.

## Outcome

2026-11-18. Points 1 and 5 fixed: test `ee87bea`, fix `91ee6f3`. Focus after a saved recall now moves once the row is no longer `waiting`, so it also moves when the next drawn status is `on_the_way`. The "called before saved" test waits one tick after "Yes" and checks the focus text has no "Waiting off-site". Point 2: not valid (the row unmounts on every way back to `waiting`). Point 3: not valid. Point 4: the Phase 5 item in `docs/known-issues.md`. Checks after `91ee6f3`: 65 test files, 376 tests pass; lint 0 errors, 2 warnings (the `.playwright-mcp` helpers); build passed. Next review: handoffs/archive/2026-11-18-gemini-review-recall-skip-called.md.
