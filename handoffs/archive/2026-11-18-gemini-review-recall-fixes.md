# Gemini review: fixes from the review of the consistency fixes

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-18. No keys and no patient data in this file; all visits are synthetic.

## Question to ask

You review a small change in a Next.js (App Router, React 19) concept prototype of a virtual ER waiting room. Staff recall a patient from a staff screen. Find problems; do not confirm that the change is good. For each problem give the file and line, what goes wrong, and the smallest fix.

The change fixes 3 points from an earlier review:
1. "Recall patient" opened the confirm question again while a recall was saving. Now its `onClick` does nothing while `saving` is true.
2. "Yes, recall patient" was not tied to the question text. Now it has `aria-describedby` on the question `<p>`.
3. After a saved recall, focus moved to the row's progress line before React drew the row as `called`. Now the focus moves after `setTimeout(0)`.

Questions:
a. Can the `setTimeout(0)` in `VisitRow.tsx` run before React draws the `called` row in a real browser (React 19, the parent list gets the new visit before `callBackVisit` returns "saved")? If yes, what is a safer way?
b. `RecallPanel.tsx` also has a `setTimeout(0)` (`returnToRecall`) that focuses "Recall patient" only when focus is on the page body. After a saved recall, can the two timers fight, so focus ends on the wrong element or a screen reader hears two moves?
c. Is the `id` `recall-question-${code}` safe if the same visit code can show twice on one page?
d. Do the new tests prove each fix? Name any path that has no test.

## Changed files (lines now)

- `components/staff/RecallPanel.tsx`: 75 lines (11 changed)
- `components/staff/VisitRow.tsx`: 132 lines (3 changed)
- `components/staff/RecallPanel.click.test.tsx`: 104 lines (20 added)
- `components/staff/VisitRow.click.test.tsx`: 107 lines (36 changed)

## Checked

- After commit `12e111f`: `npm test` 65 test files, 371 tests pass; `npm run lint` 0 errors, 2 warnings (old helper files, not in this diff); `npm run build` passed.
- The 3 tests for the fixes failed before the fix (commit `311632b`) and pass after.

## Not checked

- Not checked in a real browser or with a real screen reader.
- Not checked whether a visit code can show twice on one staff page.

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

`returnToRecall` and `confirm` in `components/staff/RecallPanel.tsx`:

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

`changeVisit` (`data/staffActions.ts`) puts the new visit into the list (`putVisit`) before it returns "saved". `Button` (`components/Button.tsx`) uses `aria-disabled`, not `disabled`, so `onClick` still runs.

In `components/staff/VisitRow.tsx`, the row shows `<RecallPanel>` only while `visit.status === "waiting"`. The progress line is `<p ref={progressLine} tabIndex={-1} data-testid="progress">`.

## Diff (commits 311632b and 12e111f)

```diff
diff --git a/components/staff/RecallPanel.click.test.tsx b/components/staff/RecallPanel.click.test.tsx
index 500d453..b0789d8 100644
--- a/components/staff/RecallPanel.click.test.tsx
+++ b/components/staff/RecallPanel.click.test.tsx
@@ -81,4 +81,24 @@ describe("RecallPanel taps", () => {
     expect(onConfirm).not.toHaveBeenCalled();
     expect(button("Yes, recall patient")).toBeDefined();
   });
+
+  it("Recall patient does not open the question again while the recall is still saving", async () => {
+    const onConfirm = show(false);
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    show(true, onConfirm);
+    await press("Recall patient");
+    expect(button("Yes, recall patient")).toBeUndefined();
+    expect(onConfirm).toHaveBeenCalledTimes(1);
+  });
+
+  it("Yes is described by the question, so a screen reader hears the code and There is no undo", async () => {
+    show(false);
+    await press("Recall patient");
+    const yes = button("Yes, recall patient");
+    const id = yes?.getAttribute("aria-describedby");
+    expect(id).toBeTruthy();
+    expect(document.getElementById(id ?? "")?.textContent).toContain("Recall visit ABC234?");
+    expect(document.getElementById(id ?? "")?.textContent).toContain("There is no undo.");
+  });
 });
diff --git a/components/staff/RecallPanel.tsx b/components/staff/RecallPanel.tsx
index 901b6e9..55df158 100644
--- a/components/staff/RecallPanel.tsx
+++ b/components/staff/RecallPanel.tsx
@@ -47,18 +47,23 @@ export function RecallPanel({ code, saving, onConfirm }: Props) {
 
   if (mode === "idle") {
     return (
-      <Button ref={recallButton} aria-disabled={saving} onClick={() => setMode("confirm")}>
+      <Button ref={recallButton} aria-disabled={saving} onClick={() => !saving && setMode("confirm")}>
         Recall patient<span className="sr-only"> {code}</span>
       </Button>
     );
   }
   return (
     <div className="w-full space-y-2">
-      <p className="font-semibold">
+      {/* "Yes" points to this question, so a screen reader reads the code and "There is no undo." */}
+      <p id={`recall-question-${code}`} className="font-semibold">
         {`Recall visit ${code}? The patient's phone will show "Please head back now". There is no undo.`}
       </p>
       <div className="flex flex-wrap gap-2">
-        <Button variant="danger" ref={yesButton} aria-disabled={saving} onClick={confirm}>
+        <Button variant="danger" ref={yesButton}
+          aria-disabled={saving}
+          aria-describedby={`recall-question-${code}`}
+          onClick={confirm}
+        >
           Yes, recall patient
         </Button>
         <Button variant="secondary" onClick={returnToRecall}>
diff --git a/components/staff/VisitRow.click.test.tsx b/components/staff/VisitRow.click.test.tsx
index ee024aa..ee48210 100644
--- a/components/staff/VisitRow.click.test.tsx
+++ b/components/staff/VisitRow.click.test.tsx
@@ -3,10 +3,11 @@
 // and focus then moves to the progress line, because the "Recall patient" button leaves the page.
 
 import { act } from "react";
+import { flushSync } from "react-dom";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { callBackVisit } from "@/data/staffActions";
-import { checkInAtDesk } from "@/lib/visitActions";
+import { callBack, checkInAtDesk } from "@/lib/visitActions";
 import { VisitRow } from "./VisitRow";
 
 // The save is replaced, so the test controls what it returns.
@@ -29,6 +30,9 @@ let root: Root;
 
 const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
 
+/** Lets the one-tick focus waits (setTimeout 0) run. */
+const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
+
 async function press(words: string) {
   const target = button(words);
   if (!target) throw new Error(`No button "${words}"`);
@@ -59,6 +63,7 @@ describe("VisitRow recall", () => {
     vi.mocked(callBackVisit).mockResolvedValue("saved");
     await press("Recall patient");
     await press("Yes, recall patient");
+    await nextTick(); // focus moves one tick later, after the row shows the called text
     expect(callBackVisit).toHaveBeenCalledWith("v1");
     expect(document.activeElement).toBe(container.querySelector('[data-testid="progress"]'));
   });
@@ -70,4 +75,33 @@ describe("VisitRow recall", () => {
     expect(container.textContent).toContain("Not saved");
     expect(document.activeElement).not.toBe(container.querySelector('[data-testid="progress"]'));
   });
+
+  it("after a save, the progress line already shows the called text when focus lands on it", async () => {
+    const called = callBack(waiting, now);
+    if (!called) throw new Error("callBack refused the test visit");
+    // Like the real save: the list gets the called visit before the save says "saved", but a
+    // browser draws that change in a later task, not at once. flushSync draws it in that task.
+    vi.mocked(callBackVisit).mockImplementation(async () => {
+      window.setTimeout(() =>
+        flushSync(() => root.render(<VisitRow visit={called} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />)),
+      );
+      return "saved";
+    });
+    const progress = container.querySelector('[data-testid="progress"]') as HTMLElement;
+    let textAtFocus = "";
+    progress.addEventListener("focus", () => (textAtFocus = progress.textContent ?? ""));
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    await nextTick();
+    expect(textAtFocus).toContain("Called");
+    expect(textAtFocus).not.toContain("Waiting off-site");
+  });
+
+  it("after a failed save, focus goes back to Recall patient on the next tick", async () => {
+    vi.mocked(callBackVisit).mockResolvedValue("not_saved");
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    await nextTick();
+    expect(document.activeElement).toBe(button("Recall patient"));
+  });
 });
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index 54dc7b2..e9a808d 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -71,7 +71,8 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   /** The progress line, which stays on the page when the "Recall patient" button leaves it. */
   const progressLine = useRef<HTMLParagraphElement>(null);
   const recall = async () => {
-    if ((await act(() => callBackVisit(visit.id))) === "saved") progressLine.current?.focus();
+    // Wait one tick, so the row shows the called text before a screen reader reads it.
+    if ((await act(() => callBackVisit(visit.id))) === "saved") window.setTimeout(() => progressLine.current?.focus(), 0);
   };
   /** After "Issue a new link" saves: open the slip with the new QR code and say what happened. */
   const showNewLink = (updated: Visit) => {
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted as given (formatting made plain).

### Problems found

1. `setTimeout(0)` in `VisitRow.tsx` can fire before React 19 commits or paints the `called` row (question a)
- File and line: `components/staff/VisitRow.tsx`, line 75.
- What goes wrong: `putVisit` schedules a React 19 update (through React's `MessageChannel` scheduler), while `recall` queues a separate timer task with `setTimeout(0)`. The browser can take tasks from these two queues in any order, and React 19 can yield before it commits. `setTimeout(0)` also does not wait for the layout pass or the accessibility tree, so focus can land while the progress line still reads "Waiting off-site".
- Smallest fix: a ref flag set to true when `act(...)` returns "saved", and the focus inside a `useEffect` that runs after React commits `visit.status === "called"`:
  `const focusProgress = useRef(false); useEffect(() => { if (!focusProgress.current || visit.status !== "called") return; focusProgress.current = false; progressLine.current?.focus(); }, [visit.status]);`

2. The two `setTimeout(0)` timers in `RecallPanel.tsx` and `VisitRow.tsx` cause two focus moves on a saved recall (question b)
- File and line: `components/staff/RecallPanel.tsx`, `returnToRecall` and `confirm` (lines 36 to 45), and `components/staff/VisitRow.tsx`, line 75.
- What goes wrong: "Yes" calls `confirm()`, which calls `onConfirm()` and `returnToRecall()`. `returnToRecall()` sets `mode` to "idle" (focus drops to the page body) and its timer moves focus to "Recall patient" (`aria-disabled={saving}`). When the save takes more than 0 ms: the panel timer focuses the disabled "Recall patient"; when "saved" comes, the panel leaves, focus drops to the body again, and the `VisitRow` timer moves focus a second time to the progress line. A screen reader says "Recall patient", then a second focus move. When the save resolves in a microtask, both timers run in the same turn and focus jumps twice. When the save fails after more than 0 ms, the panel timer runs too early (while `saving` is true), and nothing moves focus when "not_saved" or "refused" comes later.
- Smallest fix: `confirm()` calls `onConfirm()` and `setMode("idle")` only; keep the `returnToRecall()` timer only for "Cancel" (with `clearTimeout` on unmount); restore focus to "Recall patient" in a `useEffect` when `saving` goes from true to false while the panel is still on the page (only a failed or refused save).

3. The `id` `recall-question-${code}` is not unique if the same visit code shows twice on one page (question c)
- File and line: `components/staff/RecallPanel.tsx`, lines 58 and 64.
- What goes wrong: if the same code shows twice (two list sections, or a duplicate row before a refresh) and both questions are open, both `<p>` have the same `id`, and the second "Yes" points to the first `<p>`.
- Smallest fix: `const questionId = useId();` in `RecallPanel.tsx`, used for both `id` and `aria-describedby`.

4. A fast double click on "Yes, recall patient" in the same frame can send two recalls, and "Cancel" has no guard while `saving`
- File and line: `components/staff/RecallPanel.tsx`, lines 45 and 69; `components/staff/VisitRow.tsx`, `act`.
- What goes wrong: `confirm` and `act` read `saving` from the current render. Because `Button` uses `aria-disabled`, two fast clicks in the same event batch, before React renders again, both see `saving === false` and call `callBackVisit` twice. "Cancel" has no `aria-disabled={saving}` and no `saving` check.
- Smallest fix: a ref (`const inFlight = useRef(false);`) in `act` next to `saving`, and `aria-disabled={saving}` plus `if (saving) return;` on "Cancel".

5. `VisitRow.click.test.tsx` forces the timer order with `flushSync` and misses real async paths (question d)
- File and line: `components/staff/VisitRow.click.test.tsx`, lines 62 to 69, 79 to 98 and 100 to 106; `components/staff/RecallPanel.click.test.tsx`, lines 85 to 103.
- What goes wrong: the mock queues a `setTimeout` with `flushSync` before it returns "saved", so the test fixes a task order and a synchronous commit that a real browser does not have. The first saved test uses `mockResolvedValue("saved")` and never draws the row as `called`, so it passes while the progress line reads "Waiting off-site". The failed-save test resolves "not_saved" in 0 ms, so it passes only because the `returnToRecall` timer ran on the click, not after the failure.
- Smallest fix: replace the `flushSync` timer with a delayed `callBackVisit` promise and a normal re-render; check that focus moves only once, straight to the progress line after "Called" shows; add tests for a delayed "not_saved", "refused", and a double click on "Yes" in one tick.

### Answers to questions a to d

a. Yes. `putVisit` schedules the React 19 update through `MessageChannel` (or a concurrent lane); `setTimeout(0)` uses the timer queue and does not wait for React's commit or the accessibility tree. Safer: a ref flag set on "saved", and the focus in a `useEffect` on `visit.status === "called"`.

b. Yes. `confirm()` calls `returnToRecall()`, whose timer focuses "Recall patient" after "Yes" leaves the page. When "saved" comes, the panel leaves, focus drops to the body, and the `VisitRow` timer moves focus a second time. A screen reader hears two focus moves.

c. No. Duplicate codes give duplicate `id` values, and `aria-describedby` points to the first `<p>`. `useId()` makes each `id` unique.

d. Fix 1 is proven for re-renders one after the other (`RecallPanel.click.test.tsx` lines 85 to 93). No test: a tap on "Recall patient" during a real pending `callBackVisit` in `VisitRow.click.test.tsx`; a fast double click on "Yes" in one frame; "Cancel" while `saving`. Fix 2 is proven for one panel (lines 95 to 103). No test: two panels with the same code; where focus lands when the question opens. Fix 3 is not proven for a real browser, because of the `flushSync` timer. No test: a "saved" that takes more than 0 ms (shows the double focus move); a "not_saved" that takes more than 0 ms; "refused"; the row leaving the list before the focus runs.

## Claude's check

Checked against the code on 2026-11-18 (`components/staff/VisitRow.tsx` 132 lines, `components/staff/RecallPanel.tsx` 75 lines).

1. Valid. `setTimeout(0)` does not wait for React to draw the `called` row. But Gemini's fix has a fault: `changeVisit` calls `putVisit` before it returns "saved", so the row can get `visit.status === "called"` before the ref is set. Then the effect on `[visit.status]` runs while the ref is still false, and focus never moves. My fix: a state flag (`focusAfterSave`), set to true on "saved", and an effect on `[focusAfterSave, visit.status]` that focuses the progress line when both are true. This works in the two orders. Two tests: the row is drawn as `called` before "saved", and after "saved".

2. Partly valid. On a slow save, focus goes first to "Recall patient" (`aria-disabled`), then to the progress line. I keep the first move: while the save runs, the "Yes" button is gone, and without it focus falls to the page body; the second move is needed because "Recall patient" leaves the page. A screen reader hears "Recall patient", "Saving…", then the called text, which is what happened. Gemini's "nothing moves focus after a late `not_saved`" is not a fault: focus is already on "Recall patient", which stays on the page. I add tests for a late `not_saved` and a late `refused` to prove this.

3. Not a real risk now: visit codes are `unique` in the database (`supabase/migrations/20261110060756_tables_and_security.sql` line 29) and the staff page keys rows by `visit.id`. I still use `useId()`, because it is a small, standard change and does not depend on the data. One test: two panels with the same code each point to their own question.

4. Not valid. A click is a discrete event in React 19: its state updates are drawn before the next click event runs, so the second click sees `saving === true`. Also, the first click on "Yes" closes the question (`setMode("idle")`), so there is no second "Yes" to click. The database also stops a second recall (the version check and the step check). "Cancel" saves nothing; it only closes the question, so it needs no guard. No change.

5. Partly valid. The `flushSync` mock fixes one order. I replace it with a promise that the test resolves, and normal re-renders in the two orders (point 1). The old test "after Yes and a save" must now also re-render the row as `called`, because focus waits for the called row; the check stays the same. New tests: a late `not_saved`, a late `refused`, two panels with the same code. No double-click test, because of point 4.

## Outcome

2026-11-18. Points 1 and 3 fixed: test `362d866`, fix `7c355ea`. Focus after a saved recall now waits in an effect until the row is drawn as `called` (both orders tested); the question id comes from `useId`. Point 2: kept (focus waits on "Recall patient" while the save runs); tests for a slow `not_saved` and `refused` added. Point 4: not valid, no change. Point 5: the `flushSync` timer test is replaced by two slow-save tests. Checks after `7c355ea`: 65 test files, 375 tests pass; lint 0 errors, 2 warnings (the `.playwright-mcp` helpers); build passed. Next review: handoffs/archive/2026-11-18-gemini-review-recall-focus-effect.md.
