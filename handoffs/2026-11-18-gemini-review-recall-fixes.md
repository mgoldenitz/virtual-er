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
