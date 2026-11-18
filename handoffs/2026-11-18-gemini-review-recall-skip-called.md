# Gemini review: recall focus when the next status skips `called`

Model: Gemini Hydrogen 4, High, in a new chat. Synthetic data only; this file holds no keys, tokens, passwords or patient data.

## Prompt to paste

You review one small change in a Next.js 16 / React 19 app (a virtual ER waiting room prototype). Find problems; do not confirm that it works. For each problem give the file, the line, a concrete order of events that breaks it, and the smallest fix. If you find no problem in an area, say "none found" for that area.

Context: on the staff list, each row is one visit, keyed by `visit.id`. "Recall patient" opens a confirm question (`RecallPanel`); "Yes" saves. The "Recall patient" button is drawn only while the status is `waiting`, so after a recall it leaves the page and focus must go to the progress line (`<p tabIndex={-1} data-testid="progress">`). The list shows only `waiting`, `called` and `on_the_way` visits. A row that leaves the list unmounts.

Allowed moves: `waiting` to `called`, `arrived` or `removed`; `called` to `on_the_way`, `arrived`, `removed` or `unable_to_reach`; `on_the_way` to `arrived` or `removed`. The database refuses other moves (for example `called` to `called`).

The change: the focus effect used to wait for `visit.status === "called"`. A patient tap on "I'm on my way" can make the next drawn status `on_the_way`, and then focus stayed on the page body. Now the effect returns only while the status is `waiting`.

The progress text for `called` and `on_the_way` both start with "Called N min ago" (`on_the_way` adds " · On the way").

### The fix (components/staff/VisitRow.tsx, 143 lines after the change; diff)

```diff
   const recall = async () => {
     if ((await act(() => callBackVisit(visit.id))) === "saved") setRecallSaved(true);
   };
-  // Focus moves only once React has drawn the row as called, so a screen reader reads the called
-  // text. The list can get the called visit before or after the save says "saved"; this works both ways.
+  // Focus moves only once React has drawn the row as no longer waiting, so a screen reader reads the
+  // called text. The list can get the called visit before or after the save says "saved"; this works
+  // both ways. The next status can also be on_the_way if the patient taps first; that line also says "Called".
   useEffect(() => {
-    if (!recallSaved || visit.status !== "called" || focusDone.current) return;
+    if (!recallSaved || visit.status === "waiting" || focusDone.current) return;
     focusDone.current = true;
     progressLine.current?.focus();
   }, [recallSaved, visit.status]);
```

Code around it, not changed (same file):

```tsx
  const act = async (change: () => Promise<ChangeResult>) => {
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
  const progressLine = useRef<HTMLParagraphElement>(null);
  const [recallSaved, setRecallSaved] = useState(false);
  const focusDone = useRef(false);
```

`callBackVisit` saves, and on "saved" puts the updated visit into the page's list (a React state update) before it returns.

### The tests (components/staff/VisitRow.click.test.tsx, 155 lines after the change; diff)

```diff
-import { callBack, checkInAtDesk } from "@/lib/visitActions";
+import { callBack, checkInAtDesk, confirmOnMyWay } from "@/lib/visitActions";
@@ "when the row shows the called visit before the save says saved, focus lands on the called text"
     await press("Recall patient");
     await press("Yes, recall patient");
+    await nextTick(); // the panel's one-tick focus wait runs while the save is still on its way
     draw(called); // the real save puts the called visit in the list before it returns
     await finish("saved");
     await nextTick();
     expect(document.activeElement).toBe(progressLine());
     expect(textAtFocus).toContain("Called");
+    expect(textAtFocus).not.toContain("Waiting off-site");
+  });
+
+  it("when the next drawn status skips called (the patient tapped I'm on my way), focus still lands on the progress line", async () => {
+    const onTheWay = confirmOnMyWay(called, now);
+    if (!onTheWay) throw new Error("confirmOnMyWay refused the test visit");
+    const finish = slowSave();
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    await finish("saved");
+    await nextTick();
+    draw(onTheWay);
+    await nextTick();
+    expect(document.activeElement).toBe(progressLine());
+    expect(progressLine().textContent).toContain("On the way");
   });
```

Test helpers (not changed):

```tsx
const draw = (visit: Visit) => act(() => root.render(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
function slowSave() {
  let finish: (result: ChangeResult) => void = () => {};
  vi.mocked(callBackVisit).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  return (result: ChangeResult) => act(async () => finish(result));
}
async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  target.focus();
  await act(async () => target.click());
}
```

`RecallPanel`, after a "Yes", waits one tick (`setTimeout(0)`) and puts focus back on "Recall patient" only if focus was lost.

Settled, do not report: the flag is not reset (every way back to `waiting` goes through a status outside the list, so the row unmounts); focus loss when another staff screen changes the visit (a known Phase 5 item); the progress line has no focus ring (it is not a tab stop).

Questions:
a. Can the new check move focus at a wrong moment, for example on a status that is not a result of this recall?
b. Does the new test prove the bug it names (it must fail with the old `!== "called"` check)?
c. Is any other order of events still not covered?

## Checked

- `npm test`: 65 test files, 376 tests pass (after `91ee6f3`).
- `npm run lint`: 0 errors, 2 warnings (the `.playwright-mcp` helpers).
- `npm run build`: passed.
- The new test failed before the fix (focus was on the page body), commit `ee87bea`.

## Not checked

- Not checked in a browser.
