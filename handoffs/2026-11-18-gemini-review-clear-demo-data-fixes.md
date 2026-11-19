# Gemini review: fixes for "Clear demo data" (round 2)

Model: Gemini Hydrogen 4, High. Use a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Give Gemini everything below the line "Text for Gemini". Bring back its full answer and paste it here in chat.

---

## Text for Gemini

You review a concept prototype: a virtual ER waiting room (Next.js App Router, React 19, Supabase Postgres, vitest with happy-dom). All data is synthetic. Staff have a "Clear demo data" action. It deletes every demo visit and demo dashboard row, and switches the demo simulator off.

An earlier review (round 1) of this action found these faults, and the diff below is meant to fix them:

1. Cancel worked while a save ran, because the shared `Button` uses `aria-disabled` only, and `aria-disabled` does not stop a click. The same gap was in two other staff components, `RecallAllPanel` and `PauseSwitch`.
2. The result words showed at the top of the off-site list, far from the button. They now go in a `role="status"` line next to the button.
3. Two identical results in a row were not read again by screen readers, because the status text did not change.
4. The "There is no undo" text was not tied to the Yes button.
5. `clearDemoData()` did not wait for the visit list to be read again (`void loadVisits()`).
6. More tests were needed: a press while a save runs, `data/demoData.ts`, and two SQL cases.

Your job: find problems. Do not confirm that the fixes work. For each problem, give the file and line, a concrete scenario (what the user or the database does, and what goes wrong), how serious it is (high, medium, low), and the smallest fix. If you find nothing in an area, say "nothing found" for that area. Do not invent problems.

Areas to check:

- Concurrency: the Cancel guard in all three components. Are there other paths that can close a box or start a second save while a save runs (Escape key, the open button, a re-render, the component unmounting while the promise is pending)?
- The status line: is it read by screen readers in each case (first result, same result twice, failure twice, after the question opens again)? Can emptying it with `setMessage("")` and setting it again in the same tick be merged by React, so that nothing changes in the DOM?
- Focus: after a good clear, after a failed clear, after Cancel.
- `clearDemoData()`: is `await loadVisits().catch(() => {})` right? Note that `loadVisits()` already catches its own errors (code below). Can the wait leave staff on "Saving…" for a long time? Is that a problem?
- Tests: does any test pass for the wrong reason? Is any case missing?
- SQL check: do checks 08 and 09 test what they say? Can a fault in one check hide a fault in another?

Settled by the owner (do not report these as faults):

- "Saving…" and "Not saved:" stay, the same as in the rest of the app.
- The box text: "This deletes every demo visit and demo dashboard number, and switches the demo simulator off. Real visits and real dashboard numbers stay. There is no undo."
- The line under "Demo data": "For the demo only. Clear demo data before real testers start."
- The result words go in a status line in the "Demo data" section.
- In `PauseSwitch`, `save()` calls `close()` directly, so a good save still closes; only the Cancel buttons use the guarded `cancel`.
- A 50 ms timer for focus and status words was rejected in round 1. An `anon` SQL case is covered by another check file.

### Checked (output in this session)

- `npm test`: "Test Files 71 passed (71)", "Tests 406 passed (406)".
- `npm run lint`: no errors. `npm run build`: passed.
- The test for point 5 failed before the fix (1 failing, 5 passing), then passed after it.
- The owner ran `supabase/checks/demo_clear.sql` in the Supabase SQL Editor: all 10 rows as expected (00 0, 01 1, 02 2, 03 0, 04 2, 05 0, 06 1, 07 0, 08 1, 09 0).

- The owner checked the buttons in a real browser (local app, signed in as staff): the box opens with focus on the question; Cancel closes it, focus goes back to "Clear demo data", and no words show; Yes shows the result line under the button, not at the top of the off-site list.

### Not checked

- A press of Cancel or Yes while a save runs, in a real browser (only in the test browser).
- A real screen reader (NVDA, VoiceOver).
- Two staff screens that clear at the same time.

### Line counts of the changed files

- components/staff/ClearDemoData.tsx: 85
- components/staff/ClearDemoData.click.test.tsx: 190
- components/staff/PauseSwitch.tsx: 161
- components/staff/PauseSwitch.click.test.tsx: 68 (new)
- components/staff/RecallAllPanel.tsx: 85
- components/staff/RecallAllPanel.click.test.tsx: 100 (new)
- data/demoData.ts: 17
- data/demoData.test.ts: 71 (new)
- supabase/checks/demo_clear.sql: 114
- app/staff/page.tsx: 162 (2 lines changed)

### Helpers that the changed lines call (not in the diff)

components/Button.tsx:

```tsx
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-xl px-4 py-2 text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
```

lib/clearDemoMessage.ts:

```ts
export function clearDemoMessage(result: number | "failed"): string {
  if (result === "failed") {
    return "Not saved: the database could not be reached. Demo data was not cleared. Try again.";
  }
  if (result === 0) return "No demo visits to delete. The demo simulator is off.";
  const visits = result === 1 ? "visit" : "visits";
  return `${result} demo ${visits} deleted. The demo simulator is off.`;
}
```

data/visitCache.ts, `loadVisits`:

```ts
export async function loadVisits(): Promise<void> {
  const thisLoad = ++latestLoad;
  const since = new Date(Date.now() - LIST_HOURS * 3_600_000).toISOString();
  let rows: StoredVisit[] | null = null;
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte."${since}",closed_at.gte."${since}"`);
    if (!error && Array.isArray(data)) rows = data as StoredVisit[];
  } catch {
    // Treated like any other failed read below.
  }
  if (thisLoad !== latestLoad) return; // a newer read or a saved change has happened since; it wins
  if (rows) show(rows, false);
  else show(list.visits, true); // keep what was on screen, marked as possibly out of date
}
```

supabase/migrations/20261118010000_clear_demo_data.sql (the database function), and `is_staff()`:

```sql
create function public.clear_demo_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick'));
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits'));
  update public.demo_settings set running = false where id = 1;
  delete from public.visits where is_demo = true;
  get diagnostics v_deleted = row_count;
  delete from public.daily_stats where is_demo = true;
  return v_deleted;
end;
$$;

revoke execute on function public.clear_demo_data() from public, anon, service_role;
grant execute on function public.clear_demo_data() to authenticated;

-- is_staff(), from 20261110060756_tables_and_security.sql:
create function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false);
$$;
```

### The diff (git diff b08a334..57c31c9, code and tests only)

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index ff59175..b3f7afd 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -153,8 +153,8 @@ export default function StaffPage() {
 
       <section aria-labelledby="demo-heading" className="glass-panel space-y-3">
         <h2 id="demo-heading" className="text-xl font-bold">Demo data</h2>
-        <p>For the demo only. Run this before real testers start.</p>
-        <ClearDemoData onResult={setAnnouncement} />
+        <p>For the demo only. Clear demo data before real testers start.</p>
+        <ClearDemoData />
       </section>
     </main>
     </StaffShell>
diff --git a/components/staff/ClearDemoData.click.test.tsx b/components/staff/ClearDemoData.click.test.tsx
index 5d4c503..d460199 100644
--- a/components/staff/ClearDemoData.click.test.tsx
+++ b/components/staff/ClearDemoData.click.test.tsx
@@ -1,6 +1,6 @@
 // @vitest-environment happy-dom
 // Presses the "Clear demo data" buttons in a test browser (happy-dom): one tap only asks, Cancel
-// calls nothing, Yes clears once and reports the count, and a failed clear keeps the question open.
+// calls nothing, Yes clears once and shows the count in the status line, and a failed clear keeps the question open.
 
 import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
@@ -20,9 +20,8 @@ vi.mock("@/lib/clearDemoMessage", () => ({
 let container: HTMLDivElement;
 let root: Root;
 
-function show(onResult = vi.fn()) {
-  act(() => root.render(<ClearDemoData onResult={onResult} />));
-  return onResult;
+function show() {
+  act(() => root.render(<ClearDemoData />));
 }
 
 /** The button whose words start with `words`. */
@@ -30,6 +29,9 @@ const button = (words: string) => [...container.querySelectorAll("button")].find
 
 const question = () => container.querySelector<HTMLElement>('[data-testid="clear-demo-confirm"]');
 
+/** The words in the status line under the buttons. */
+const status = () => container.querySelector('[role="status"]')?.textContent;
+
 async function press(words: string) {
   const target = button(words);
   if (!target) throw new Error(`No button "${words}"`);
@@ -55,46 +57,134 @@ afterEach(() => {
 
 describe("ClearDemoData taps", () => {
   it("asks first: one tap clears nothing and moves focus to the question", async () => {
-    const onResult = show();
+    show();
     await press("Clear demo data");
     await nextTick();
     expect(clearDemoData).not.toHaveBeenCalled();
-    expect(onResult).not.toHaveBeenCalled();
+    expect(status()).toBe("");
     expect(question()?.textContent).toContain("Clear all demo data?");
     expect(button("Clear demo data")).toBeUndefined();
     expect(document.activeElement).toBe(question()?.querySelector("h3"));
   });
 
   it("Cancel closes the question, clears nothing, and brings focus back to Clear demo data", async () => {
-    const onResult = show();
+    show();
     await press("Clear demo data");
     await press("Cancel");
     await nextTick();
     expect(clearDemoData).not.toHaveBeenCalled();
-    expect(onResult).not.toHaveBeenCalled();
+    expect(status()).toBe("");
     expect(question()).toBeNull();
     expect(document.activeElement).toBe(button("Clear demo data"));
   });
 
-  it("Yes clears once, reports the count, and closes the question", async () => {
+  it("Yes clears once, shows the count in the status line, and closes the question", async () => {
     vi.mocked(clearDemoData).mockResolvedValue(3);
-    const onResult = show();
+    show();
     await press("Clear demo data");
     await press("Yes, clear demo data");
     await nextTick();
     expect(clearDemoData).toHaveBeenCalledTimes(1);
-    expect(onResult).toHaveBeenCalledWith("words:3");
+    expect(status()).toBe("words:3");
     expect(question()).toBeNull();
   });
 
-  it("when the clear fails, reports the failure and keeps the question open", async () => {
+  it("when the clear fails, shows the failure and keeps the question open", async () => {
     vi.mocked(clearDemoData).mockResolvedValue("failed");
-    const onResult = show();
+    show();
     await press("Clear demo data");
     await press("Yes, clear demo data");
     await nextTick();
-    expect(onResult).toHaveBeenCalledWith("words:failed");
+    expect(status()).toBe("words:failed");
     expect(question()).not.toBeNull();
     expect(button("Yes, clear demo data")).toBeDefined();
   });
+
+  it("while a clear is pending, a second Yes and Cancel do nothing; after it ends, focus is on Clear demo data", async () => {
+    let finish!: (v: number | "failed") => void;
+    vi.mocked(clearDemoData).mockReturnValue(
+      new Promise<number | "failed">((resolve) => {
+        finish = resolve;
+      }),
+    );
+    show();
+    await press("Clear demo data");
+    await press("Yes, clear demo data");
+    expect(status()).toBe("");
+    // The Yes button now reads "Saving…", so it is found by that text.
+    await press("Saving…");
+    expect(clearDemoData).toHaveBeenCalledTimes(1);
+    await press("Cancel");
+    expect(question()).not.toBeNull();
+    expect(status()).toBe("");
+    await act(async () => finish(3));
+    await nextTick();
+    expect(question()).toBeNull();
+    expect(document.activeElement).toBe(button("Clear demo data"));
+  });
+
+  it("the same result twice is shown again", async () => {
+    vi.mocked(clearDemoData).mockResolvedValue(0);
+    show();
+    await press("Clear demo data");
+    await press("Yes, clear demo data");
+    await nextTick();
+    expect(status()).toBe("words:0");
+
+    let finish!: (v: number | "failed") => void;
+    vi.mocked(clearDemoData).mockReturnValue(
+      new Promise<number | "failed">((resolve) => {
+        finish = resolve;
+      }),
+    );
+    await press("Clear demo data");
+    await press("Yes, clear demo data");
+    expect(status()).toBe("");
+
+    await act(async () => finish(0));
+    await nextTick();
+    expect(status()).toBe("words:0");
+  });
+
+  it("a failed clear pressed again: the same failure words are shown again", async () => {
+    vi.mocked(clearDemoData).mockResolvedValue("failed");
+    show();
+    await press("Clear demo data");
+    await press("Yes, clear demo data");
+    await nextTick();
+    expect(status()).toBe("words:failed");
+
+    let finish!: (v: number | "failed") => void;
+    vi.mocked(clearDemoData).mockReturnValue(
+      new Promise<number | "failed">((resolve) => {
+        finish = resolve;
+      }),
+    );
+    // The question stays open after a failure, so Yes is pressed again without reopening it.
+    await press("Yes, clear demo data");
+    expect(status()).toBe("");
+
+    await act(async () => finish("failed"));
+    await nextTick();
+    expect(status()).toBe("words:failed");
+  });
+
+  it("opening the question clears an old message", async () => {
+    vi.mocked(clearDemoData).mockResolvedValue(3);
+    show();
+    await press("Clear demo data");
+    await press("Yes, clear demo data");
+    await nextTick();
+    expect(status()).toBe("words:3");
+    await press("Clear demo data");
+    expect(status()).toBe("");
+  });
+
+  it("Yes points to the no-undo text", async () => {
+    show();
+    await press("Clear demo data");
+    const yes = button("Yes, clear demo data");
+    expect(yes?.getAttribute("aria-describedby")).toBe("clear-demo-warning");
+    expect(container.querySelector("#clear-demo-warning")?.textContent).toContain("There is no undo.");
+  });
 });
diff --git a/components/staff/ClearDemoData.tsx b/components/staff/ClearDemoData.tsx
index dec530f..22259a2 100644
--- a/components/staff/ClearDemoData.tsx
+++ b/components/staff/ClearDemoData.tsx
@@ -2,20 +2,19 @@
 
 // The "Clear demo data" button for staff, with a question first. Clearing deletes every demo
 // visit and its dashboard numbers, and switches the demo simulator off (SPEC "Demo mode").
+// The result words go in a status line under the button or the question. That line is always on
+// the page, so screen readers hear the words and the buttons do not move.
 
 import { useEffect, useRef, useState } from "react";
 import { clearDemoData } from "@/data/demoData";
 import { clearDemoMessage } from "@/lib/clearDemoMessage";
 import { Button } from "@/components/Button";
 
-type Props = {
-  /** Called with words for staff and screen readers after a clear, or after a failed one. */
-  onResult: (message: string) => void;
-};
-
-export function ClearDemoData({ onResult }: Props) {
+export function ClearDemoData() {
   const [asking, setAsking] = useState(false);
   const [saving, setSaving] = useState(false);
+  // The result words. Empty while a clear runs and when the question opens again.
+  const [message, setMessage] = useState("");
   const question = useRef<HTMLHeadingElement>(null);
   const openButton = useRef<HTMLButtonElement>(null);
 
@@ -24,46 +23,63 @@ export function ClearDemoData({ onResult }: Props) {
     if (asking) question.current?.focus();
   }, [asking]);
 
-  const cancel = () => {
+  // Opening the question removes the words from an earlier clear.
+  const open = () => {
+    setMessage("");
+    setAsking(true);
+  };
+
+  const close = () => {
     setAsking(false);
     // Focus goes back to the button once it is shown again.
     window.setTimeout(() => openButton.current?.focus(), 0);
   };
 
+  // Cancel does nothing while a clear runs: aria-disabled does not stop a click.
+  const cancel = () => {
+    if (saving) return;
+    close();
+  };
+
   const confirm = async () => {
     if (saving) return;
     setSaving(true);
+    // Empty first, so the same words twice are read again by screen readers.
+    setMessage("");
     const result = await clearDemoData();
     setSaving(false);
-    if (result !== "failed") cancel();
-    onResult(clearDemoMessage(result));
+    if (result !== "failed") close();
+    setMessage(clearDemoMessage(result));
   };
 
-  if (!asking) {
-    return (
-      <Button ref={openButton} variant="danger" onClick={() => setAsking(true)}>
-        Clear demo data
-      </Button>
-    );
-  }
-
   return (
-    <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="clear-demo-confirm">
-      <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
-        Clear all demo data?
-      </h3>
-      <p>
-        This deletes every demo visit at Demo Site A and B and their dashboard numbers, and switches the demo
-        simulator off. Real visits stay. There is no undo.
-      </p>
-      <div className="flex flex-wrap gap-2">
-        <Button variant="danger" aria-disabled={saving} onClick={confirm}>
-          {saving ? "Saving…" : "Yes, clear demo data"}
-        </Button>
-        <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
-          Cancel
+    <div className="space-y-3">
+      {!asking ? (
+        <Button ref={openButton} variant="danger" onClick={open}>
+          Clear demo data
         </Button>
-      </div>
+      ) : (
+        <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="clear-demo-confirm">
+          <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
+            Clear all demo data?
+          </h3>
+          <p id="clear-demo-warning">
+            This deletes every demo visit and demo dashboard number, and switches the demo simulator off. Real visits and
+            real dashboard numbers stay. There is no undo.
+          </p>
+          <div className="flex flex-wrap gap-2">
+            <Button variant="danger" aria-disabled={saving} aria-describedby="clear-demo-warning" onClick={confirm}>
+              {saving ? "Saving…" : "Yes, clear demo data"}
+            </Button>
+            <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
+              Cancel
+            </Button>
+          </div>
+        </div>
+      )}
+      <p role="status" className="min-h-6 font-semibold">
+        {message}
+      </p>
     </div>
   );
 }
diff --git a/components/staff/PauseSwitch.click.test.tsx b/components/staff/PauseSwitch.click.test.tsx
new file mode 100644
index 0000000..0cf00f7
--- /dev/null
+++ b/components/staff/PauseSwitch.click.test.tsx
@@ -0,0 +1,68 @@
+// @vitest-environment happy-dom
+// Presses the pause buttons in a test browser (happy-dom): while a pause is being saved, Cancel
+// must not close the "Pause off-site waiting" question.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { setSitePaused } from "@/data/sitePauses";
+import { PauseSwitch } from "./PauseSwitch";
+
+vi.mock("@/data/sitePauses", () => ({ setSitePaused: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+let container: HTMLDivElement;
+let root: Root;
+
+function show() {
+  act(() => root.render(<PauseSwitch site="A" paused={false} offSiteCount={2} onResult={vi.fn()} />));
+}
+
+/** The button whose words start with `words`. */
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+const pauseQuestion = () => container.querySelector<HTMLElement>('[data-testid="pause-confirm"]');
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+/** Lets the pending save and the switch's one-tick focus wait (setTimeout 0) run. */
+const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
+
+beforeEach(() => {
+  vi.mocked(setSitePaused).mockReset();
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
+describe("PauseSwitch taps", () => {
+  it("while a pause is pending, Cancel does not close the question; it closes after the save ends", async () => {
+    let finish!: (v: "saved") => void;
+    vi.mocked(setSitePaused).mockReturnValue(
+      new Promise<"saved">((resolve) => {
+        finish = resolve;
+      }),
+    );
+    show();
+    await press("Pause off-site waiting at Demo Site A");
+    await press("Yes, pause off-site waiting");
+    await press("Cancel");
+    expect(pauseQuestion()).not.toBeNull();
+    await act(async () => finish("saved"));
+    await nextTick();
+    expect(pauseQuestion()).toBeNull();
+  });
+});
diff --git a/components/staff/PauseSwitch.tsx b/components/staff/PauseSwitch.tsx
index 90e9f6a..15305d1 100644
--- a/components/staff/PauseSwitch.tsx
+++ b/components/staff/PauseSwitch.tsx
@@ -53,6 +53,12 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
     window.setTimeout(() => (resumeButton.current ?? pauseButton.current)?.focus(), 0);
   };
 
+  // Cancel does nothing while a save runs: aria-disabled does not stop a click.
+  const cancel = () => {
+    if (saving) return;
+    close();
+  };
+
   const save = async (pause: boolean) => {
     if (saving) return;
     if (!pause && !checked) {
@@ -118,7 +124,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
             <Button variant="danger" aria-disabled={saving} onClick={() => save(true)}>
               {saving ? "Saving…" : "Yes, pause off-site waiting"}
             </Button>
-            <Button variant="secondary" aria-disabled={saving} onClick={close}>
+            <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
               Cancel
             </Button>
           </div>
@@ -138,7 +144,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
             <Button aria-disabled={saving || !checked} onClick={() => save(false)}>
               {saving ? "Saving…" : "Yes, turn it back on"}
             </Button>
-            <Button variant="secondary" aria-disabled={saving} onClick={close}>
+            <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
               Cancel
             </Button>
           </div>
diff --git a/components/staff/RecallAllPanel.click.test.tsx b/components/staff/RecallAllPanel.click.test.tsx
new file mode 100644
index 0000000..e3db92e
--- /dev/null
+++ b/components/staff/RecallAllPanel.click.test.tsx
@@ -0,0 +1,100 @@
+// @vitest-environment happy-dom
+// Presses the "Recall all off-site patients" buttons in a test browser (happy-dom): while a recall
+// is being saved, Cancel must not close the confirmation box.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { recallAll } from "@/data/staffActions";
+import type { RecallAllResult } from "@/lib/recallAll";
+import type { Visit } from "@/lib/visit";
+import { RecallAllPanel } from "./RecallAllPanel";
+
+vi.mock("@/data/staffActions", () => ({ recallAll: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+let container: HTMLDivElement;
+let root: Root;
+
+/** A synthetic waiting visit at Demo Site A that has been triaged, so it is in the off-site line. */
+function waitingVisit(id: string, code: string): Visit {
+  return {
+    id,
+    code,
+    access_token: "test-token-" + id,
+    site: "A",
+    source: "desk",
+    ctas_level: 5,
+    language: "en",
+    status: "waiting",
+    removed_reason: null,
+    created_at: "2026-11-18T10:00:00.000Z",
+    triaged_at: "2026-11-18T10:05:00.000Z",
+    offered_at: null,
+    last_still_here_at: null,
+    called_at: null,
+    seen_at: null,
+    confirmed_at: null,
+    review_flagged_at: null,
+    arrived_at: null,
+    closed_at: null,
+    phone_attempts: 0,
+    last_phone_result: null,
+    followup_paused_until: null,
+    survey_score: null,
+    is_demo: true,
+  };
+}
+
+function show(visits: Visit[]) {
+  act(() => root.render(<RecallAllPanel visits={visits} site="A" onResult={vi.fn()} />));
+}
+
+/** The button whose words start with `words`. */
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+const confirmBox = () => container.querySelector<HTMLElement>('[data-testid="recall-all-confirm"]');
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+/** Lets the pending save and the panel's one-tick focus wait (setTimeout 0) run. */
+const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
+
+beforeEach(() => {
+  vi.mocked(recallAll).mockReset();
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
+describe("RecallAllPanel taps", () => {
+  it("while a recall is pending, Cancel does not close the confirmation; it closes after the save ends", async () => {
+    let finish!: (v: RecallAllResult) => void;
+    vi.mocked(recallAll).mockReturnValue(
+      new Promise<RecallAllResult>((resolve) => {
+        finish = resolve;
+      }),
+    );
+    show([waitingVisit("v1", "A101"), waitingVisit("v2", "A102")]);
+    await press("Recall all off-site patients");
+    await press("Yes, recall all");
+    await press("Cancel");
+    expect(confirmBox()).not.toBeNull();
+    await act(async () => finish({ recalled: 2, changed: 0, notSaved: false }));
+    await nextTick();
+    expect(confirmBox()).toBeNull();
+  });
+});
diff --git a/components/staff/RecallAllPanel.tsx b/components/staff/RecallAllPanel.tsx
index 8ee38cf..78f43e3 100644
--- a/components/staff/RecallAllPanel.tsx
+++ b/components/staff/RecallAllPanel.tsx
@@ -35,7 +35,9 @@ export function RecallAllPanel({ visits, site, onResult }: Props) {
     if (asked) question.current?.focus();
   }, [asked]);
 
+  // Cancel does nothing while a recall runs: aria-disabled does not stop a click.
   const cancel = () => {
+    if (saving) return;
     setAsked(null);
     // Focus goes back to the button once it is shown again.
     window.setTimeout(() => openButton.current?.focus(), 0);
diff --git a/data/demoData.test.ts b/data/demoData.test.ts
new file mode 100644
index 0000000..ecf4a51
--- /dev/null
+++ b/data/demoData.test.ts
@@ -0,0 +1,71 @@
+// Checks that clearDemoData() returns "failed" when the database call fails, returns the number of deleted visits when it works, waits for the visit re-read, and still returns the count when the re-read fails.
+
+import { beforeEach, describe, expect, it, vi } from "vitest";
+import { clearDemoData } from "./demoData";
+import { supabaseBrowser } from "./supabaseBrowser";
+import { loadVisits } from "./visitCache";
+
+// Replace the real Supabase connection and the visit re-read.
+vi.mock("./supabaseBrowser", () => ({ supabaseBrowser: vi.fn() }));
+vi.mock("./visitCache", () => ({ loadVisits: vi.fn() }));
+
+function mockRpc(rpc: (name: string) => unknown) {
+  vi.mocked(supabaseBrowser).mockReturnValue({ rpc } as unknown as ReturnType<typeof supabaseBrowser>);
+}
+
+beforeEach(() => {
+  vi.resetAllMocks();
+  vi.mocked(loadVisits).mockResolvedValue(undefined);
+});
+
+describe("clearDemoData", () => {
+  it("returns failed and does not re-read when the database answers with an error", async () => {
+    mockRpc(async () => ({ data: null, error: { message: "x" } }));
+    await expect(clearDemoData()).resolves.toBe("failed");
+    expect(loadVisits).not.toHaveBeenCalled();
+  });
+
+  it("returns failed and does not re-read when the database answers with something that is not a number", async () => {
+    mockRpc(async () => ({ data: "3", error: null }));
+    await expect(clearDemoData()).resolves.toBe("failed");
+    expect(loadVisits).not.toHaveBeenCalled();
+  });
+
+  it("returns failed and does not re-read when the database call throws", async () => {
+    mockRpc(() => {
+      throw new Error("offline");
+    });
+    await expect(clearDemoData()).resolves.toBe("failed");
+    expect(loadVisits).not.toHaveBeenCalled();
+  });
+
+  it("returns the number of deleted visits, re-reads once, and calls clear_demo_data", async () => {
+    const rpc = vi.fn(async () => ({ data: 2, error: null }));
+    mockRpc(rpc);
+    await expect(clearDemoData()).resolves.toBe(2);
+    expect(loadVisits).toHaveBeenCalledTimes(1);
+    expect(rpc).toHaveBeenCalledWith("clear_demo_data");
+  });
+
+  it("waits for the visit re-read before it returns the count", async () => {
+    mockRpc(async () => ({ data: 2, error: null }));
+    let releaseRead!: () => void;
+    vi.mocked(loadVisits).mockReturnValue(new Promise<void>((resolve) => (releaseRead = resolve)));
+    let done = false;
+    const pending = clearDemoData().then((count) => {
+      done = true;
+      return count;
+    });
+    // Let every pending step run; the re-read is still held, so clearDemoData must not be done.
+    await new Promise((resolve) => setTimeout(resolve, 0));
+    expect(done).toBe(false);
+    releaseRead();
+    await expect(pending).resolves.toBe(2);
+  });
+
+  it("returns the count even when the re-read fails, because the rows are already deleted", async () => {
+    mockRpc(async () => ({ data: 2, error: null }));
+    vi.mocked(loadVisits).mockRejectedValue(new Error("read failed"));
+    await expect(clearDemoData()).resolves.toBe(2);
+  });
+});
diff --git a/data/demoData.ts b/data/demoData.ts
index 2734d45..8facc3b 100644
--- a/data/demoData.ts
+++ b/data/demoData.ts
@@ -7,7 +7,9 @@ export async function clearDemoData(): Promise<number | "failed"> {
   try {
     const { data, error } = await supabaseBrowser().rpc("clear_demo_data");
     if (error || typeof data !== "number") return "failed";
-    void loadVisits();
+    // Wait for the new list, so the result words come after the old demo rows are gone.
+    // A failed re-read does not make the clear "failed": the rows are already deleted.
+    await loadVisits().catch(() => {});
     return data;
   } catch {
     return "failed";
diff --git a/supabase/checks/demo_clear.sql b/supabase/checks/demo_clear.sql
index eec2afc..f9f9c0c 100644
--- a/supabase/checks/demo_clear.sql
+++ b/supabase/checks/demo_clear.sql
@@ -3,7 +3,7 @@
 -- The file keeps the results in a temp table and shows all rows at the end.
 -- It saves nothing: everything happens inside "begin ... rollback".
 --
--- Expected result (8 rows):
+-- Expected result (10 rows):
 --   00 demo visits before the check            0 (if not, run "Clear demo data" on /staff first)
 --   01 non-staff refused                       1
 --   02 visits deleted by the call              2 (the 2 test demo visits, plus any counted in 00)
@@ -12,6 +12,8 @@
 --   05 demo stats rows left                    0 (all days)
 --   06 real stats row left                     1 (day 2000-01-01, is_demo false)
 --   07 simulator running                       0
+--   08 sign-in with no app role refused        1
+--   09 second staff call deletes               0
 --
 -- The calls run as the "authenticated" role, the same role the app uses, with the staff or
 -- patient sign-in set in the request claims. Why the year 2000: no real visit or stats row
@@ -66,12 +68,27 @@ exception when insufficient_privilege then
   insert into demo_clear_rows values ('01 non-staff refused', 1);
 end $$;
 
+-- 08: a sign-in with no app role (no "app_metadata") may not clear anything either.
+select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
+
+do $$
+begin
+  perform public.clear_demo_data();
+  insert into demo_clear_rows values ('08 sign-in with no app role refused', 0);
+exception when insufficient_privilege then
+  insert into demo_clear_rows values ('08 sign-in with no app role refused', 1);
+end $$;
+
 -- 02: staff clear the demo data. The call returns the number of demo visits it deleted.
 select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"staff"}}', true);
 
 insert into demo_clear_rows
 select '02 visits deleted by the call', public.clear_demo_data();
 
+-- 09: a second clear right after finds nothing left to delete.
+insert into demo_clear_rows
+select '09 second staff call deletes', public.clear_demo_data();
+
 -- Back to the owner, to read the results.
 reset role;
 
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted as the owner gave it; only the blank lines are fewer and the dash in line ranges is "to".

### 1. Concurrency (the Cancel guard in all three components)

1. **`saving` is React state rather than a synchronous ref, leaving a pre-commit window for double submits or Cancel closing while a save is in flight**
* **File and line:** `components/staff/ClearDemoData.tsx`, lines 15, 29 to 32, and 34 to 43; `components/staff/PauseSwitch.tsx`, lines 57 to 64; `components/staff/RecallAllPanel.tsx`, lines 39 to 41.
* **Concrete scenario:** A staff member double-taps `"Yes, clear demo data"` (or taps `"Yes, clear demo data"` and immediately taps `"Cancel"`) before React commits the re-render triggered by `setSaving(true)`. Both click handlers read `saving === false` from the pre-render closure: a double-tap sends `clear_demo_data` twice (and the first resolution calls `setSaving(false)` and `close()` while the second RPC is still running), or a rapid tap on `"Cancel"` closes the confirmation box while `clearDemoData()` is still executing.
* **Severity:** low
* **Smallest fix:** Pair `saving` state with a synchronous `busy = useRef(false)` guard in `confirm`/`save` and `cancel` (`if (busy.current) return;`, setting `busy.current = true` before `await` and `false` in `finally`).

---

### 2. The status line

1. **Closing the confirmation box and focusing `"Clear demo data"` in the same tick as updating `role="status"` can cut off the announcement on mobile screen readers**
* **File and line:** `components/staff/ClearDemoData.tsx`, lines 28 to 32, 40 to 42, and 79 to 81.
* **Concrete scenario:** Staff tap `"Yes, clear demo data"` and the clear succeeds. In the same continuation after `await clearDemoData()`, `close()` unmounts the focused `"Saving…"` button and schedules `openButton.current?.focus()`, while `setMessage(clearDemoMessage(result))` updates `<p role="status">` from `""` to `"3 demo visits deleted. The demo simulator is off."`. On iOS VoiceOver and Android TalkBack, programmatic `.focus()` onto `"Clear demo data"` interrupts or preempts the polite `role="status"` announcement, reading `"Clear demo data, button"` instead of the deletion count.
* **Severity:** medium
* **Smallest fix:** Keep the status line mounted as `<p role="status" className="min-h-6 font-semibold">`, and move focus back to `openButton` synchronously in `useLayoutEffect` (so the focus event finishes before the post-paint live-region mutation is evaluated by the accessibility tree).

2. **Clearing `message` to `""` on `confirm()` and restoring the identical string on a fast response can be coalesced by screen readers**
* **File and line:** `components/staff/ClearDemoData.tsx`, lines 37 to 42.
* **Concrete scenario:** A clear fails immediately (for example, the browser is offline, so `clearDemoData()` rejects in ~1 ms) or returns `0` immediately twice in a row. `confirm()` sets `setMessage("")` in one commit and `setMessage(clearDemoMessage(result))` with the exact same string milliseconds later. While React does not merge them across `await`, macOS/iOS VoiceOver and Windows Narrator frequently coalesce `""` $\to$ identical-text mutations on a `role="status"` node when they happen within a few milliseconds, reading nothing on the second press.
* **Severity:** low
* **Smallest fix:** Track a `resultCount` state and append a trailing non-breaking space (` `) on odd attempts (`resultCount % 2 === 1 ? " " : ""`) so the rendered text node value genuinely differs between consecutive identical results without altering visible text.

---

### 3. Focus

1. **`close()` drops focus to `document.body` for one macrotask and leaves an uncleaned `setTimeout(..., 0)`**
* **File and line:** `components/staff/ClearDemoData.tsx`, lines 21 to 23 and 28 to 32.
* **Concrete scenario:** Staff open `"Clear demo data"` and press `"Cancel"` (or complete a successful clear). `close()` sets `asking` to `false` (unmounting the focused `"Cancel"` or `"Saving…"` button) and schedules `window.setTimeout(() => openButton.current?.focus(), 0)`. Between the React commit and the `0 ms` timer firing, `document.activeElement` falls back to `document.body` (causing screen readers to briefly announce the document root before `"Clear demo data, button"`), and if the component unmounts before the timer fires, the orphan timer still runs.
* **Severity:** low
* **Smallest fix:** Replace `window.setTimeout(() => openButton.current?.focus(), 0)` in `close()` with a `wasAsking = useRef(false)` check inside the existing `useEffect` on `[asking]` (`if (asking) question.current?.focus(); else if (wasAsking.current) openButton.current?.focus(); wasAsking.current = asking;`).

---

### 4. `clearDemoData()` and the wait for the re-read

1. **`await loadVisits()` has no timeout and can strand staff on `"Saving…"` after the database delete has already committed**
* **File and line:** `data/demoData.ts`, lines 8 to 12; `data/visitCache.ts`, lines 5 to 15.
* **Concrete scenario:** Staff click `"Yes, clear demo data"`. `supabaseBrowser().rpc("clear_demo_data")` succeeds and commits in Postgres (deleting all demo visits and demo stats and turning the simulator off), but the subsequent `supabaseBrowser().from("visits").select("*")` inside `loadVisits()` stalls on a slow or half-open connection (or hangs on a dead socket after a newer background poll increments `latestLoad`). Because `loadVisits()` has no timeout, `clearDemoData()` never resolves, leaving `"Saving…"` and `"Cancel"` stuck and the `"Clear all demo data?"` warning box open indefinitely even though the data is already deleted.
* **Severity:** medium
* **Smallest fix:** Bound the wait in `data/demoData.ts` with a short timeout so the UI finishes promptly even if the follow-up list read hangs:

```ts
await Promise.race([
  loadVisits().catch(() => {}),
  new Promise<void>((resolve) => setTimeout(resolve, 3000)),
]);
```

2. **If `loadVisits()` fails after `clear_demo_data` succeeds, deleted demo visits remain on screen while `"X demo visits deleted"` is shown**
* **File and line:** `data/demoData.ts`, lines 10 to 12; `data/visitCache.ts`, line 15.
* **Concrete scenario:** `clear_demo_data()` deletes 4 demo visits and returns `4`, then the connection drops before `loadVisits()` finishes. `loadVisits()` catches the read error and executes `else show(list.visits, true)` (keeping the 4 deleted demo visits in the on-screen list), while `clearDemoData()` returns `4` and `ClearDemoData` announces `"4 demo visits deleted. The demo simulator is off."` right below the 4 demo visits still displayed above it.
* **Severity:** low
* **Smallest fix:** Remove `is_demo` rows from the local visit cache immediately after `clear_demo_data` returns a number (before or alongside `await loadVisits()`), so deleted demo visits disappear from the screen even if the network re-read fails.

---

### 5. Tests

1. **`ClearDemoData.click.test.tsx` (`"the same result twice is shown again"`) passes even if `setMessage("")` in `confirm()` is deleted**
* **File and line:** `components/staff/ClearDemoData.click.test.tsx`, lines 126 to 147; `components/staff/ClearDemoData.tsx`, lines 25 to 29 and 37 to 39.
* **Concrete scenario:** Between the first and second clear in that test, `await press("Clear demo data")` calls `open()`, which already runs `setMessage("")`. Deleting `setMessage("")` from `confirm()` (line 38 of `ClearDemoData.tsx`) still leaves `"the same result twice is shown again"` passing, and `"a failed clear pressed again"` only tests when `clearDemoData()` is held across separate `act()` blocks rather than resolving in a single microtask (`mockResolvedValue("failed")`).
* **Severity:** medium
* **Smallest fix:** Assert `expect(status()).toBe("")` in a test where `clearDemoData()` uses `mockResolvedValue("failed")` (without holding a manual Promise) and verify `aria-disabled="true"` on both buttons while pending.

2. **`PauseSwitch.click.test.tsx` never tests the `"Yes, turn it back on"` (`paused={true}`) Cancel button, and neither `PauseSwitch.click.test.tsx` nor `RecallAllPanel.click.test.tsx` tests that Cancel actually closes when not saving**
* **File and line:** `components/staff/PauseSwitch.click.test.tsx`, lines 20 and 50 to 67; `components/staff/RecallAllPanel.click.test.tsx`, lines 83 to 99; `components/staff/PauseSwitch.tsx`, line 147.
* **Concrete scenario:** `PauseSwitch.tsx` has two separate confirmation boxes with two `Cancel` buttons (line 127 for `paused={false}` and line 147 for `paused={true}`), but `PauseSwitch.click.test.tsx` only renders `paused={false}`. Furthermore, because neither `PauseSwitch.click.test.tsx` nor `RecallAllPanel.click.test.tsx` tests pressing `"Cancel"` when `saving === false` (or pressing `"Yes"` twice while pending), replacing `cancel` with an empty `() => {}` function passes both test files.
* **Severity:** medium
* **Smallest fix:** Add a `paused={true}` pending-Cancel test case to `components/staff/PauseSwitch.click.test.tsx`, and add an idle `"Cancel"` test (confirming the box closes and focus returns to the open button) plus a double-click on `"Yes"` while pending to both `PauseSwitch.click.test.tsx` and `RecallAllPanel.click.test.tsx`.

3. **`data/demoData.test.ts` misses `NaN` from `rpc("clear_demo_data")`**
* **File and line:** `data/demoData.test.ts`, lines 28 to 32; `data/demoData.ts`, line 8.
* **Concrete scenario:** `clearDemoData()` checks `typeof data !== "number"`. In JavaScript, `typeof NaN === "number"` is `true`, so `{ data: Number.NaN, error: null }` passes the guard and returns `NaN` instead of `"failed"`.
* **Severity:** low
* **Smallest fix:** Check `!Number.isFinite(data)` in `data/demoData.ts` line 8 and add a `{ data: Number.NaN, error: null }` case in `data/demoData.test.ts`.

---

### 6. SQL checks 08 and 09

1. **Check 09 runs while `demo_settings.running` is already `false` and demo `daily_stats` are already deleted, hiding a bug where a 0-visit clear skips turning the simulator off or clearing stats**
* **File and line:** `supabase/checks/demo_clear.sql`, lines 82 to 90; `supabase/migrations/20261118010000_clear_demo_data.sql`, lines 12 to 16.
* **Concrete scenario:** Check 02 runs `clear_demo_data()`, which sets `demo_settings.running = false` and deletes demo `daily_stats`, and Check 09 immediately calls `clear_demo_data()` again without re-enabling `demo_settings.running = true` or inserting a demo `daily_stats` row. If a future edit to `clear_demo_data()` added an early `if not exists (select 1 from public.visits where is_demo = true) then return 0; end if;` before `update public.demo_settings` and `delete from public.daily_stats`, Checks 00 to 09 would all still pass while pressing `"Clear demo data"` on `/staff` with 0 demo visits would report `"No demo visits to delete. The demo simulator is off."` while leaving the simulator running.
* **Severity:** medium
* **Smallest fix:** Before Check 09 in `supabase/checks/demo_clear.sql`, run `update public.demo_settings set running = true where id = 1;` and insert one demo `daily_stats` row so Check 09 proves a 0-visit clear still turns `running` back to `false` (verified by Check 07) and removes demo stats (verified by Check 05).

2. **Check 08 omits `"app_metadata"` completely rather than testing an `app_metadata` object without a `"role"` key, and `demo_clear.sql` has no final assertion check**
* **File and line:** `supabase/checks/demo_clear.sql`, lines 71 to 80 and 95 to 97.
* **Concrete scenario:** Supabase Auth JWTs for signed-in non-staff users normally contain `"app_metadata": {"provider": "email"}` (an `app_metadata` JSON object with no `"role"` field) rather than omitting `"app_metadata"`, and `demo_clear.sql` ends with `select ... from demo_clear_rows` without raising an exception if a row has an unexpected value (such as `08` returning `0`).
* **Severity:** low
* **Smallest fix:** Set `'{"role":"authenticated","app_metadata":{"provider":"email"}}'` in Check 08 and add a `do $$ ... if exists (...) then raise exception ... end if; end $$;` check before `rollback;`.

## Claude's check (2026-11-18)

I read each point against the code at `d69de91`. I did not run new tests for this check.

1.1, ref guard: reject. A click is a discrete event. React 18 and 19 apply the state from a discrete event before the next discrete event runs, so a second tap sees `saving === true`. The click tests already hold the promise and press Yes twice and Cancel once (one call, the question stays open). A ref adds a second copy of the same fact.

2.1, focus cuts the announcement: not proved, keep the round 1 decision. `useLayoutEffect` is a timing guess, the same kind as the 50 ms timer that round 1 rejected. `RecallAllPanel`, `PauseSwitch` and `NewLinkPanel` use the same pattern. If a test with a real screen reader shows the words drop, fix all four in one change.

2.2, non-breaking space toggle: reject for now, same reason as 2.1. The empty step and the result are two DOM changes in two commits. No screen-reader test shows that they merge.

3.1, focus by timer: partly accept. The timer cannot cause an error after unmount, because `openButton.current` is then `null` and `?.` stops the call. Focus on `document.body` for one task is real but short. The effect with `wasAsking` is clean and small, but the same timer is in 4 components (`ClearDemoData.tsx` line 35, `NewLinkPanel.tsx` line 33, `PauseSwitch.tsx` line 53, `RecallAllPanel.tsx` line 43). Owner decision: change all four, or none.

4.1, no time limit on the re-read: accept. If the read hangs, the question stays on "Saving…" and Cancel is blocked by the new guard, so staff have no way out. A 3 s limit is fine. If the limit ends first, the result words show before the list changes, which is the old behaviour.

4.2, deleted rows stay on screen if the re-read fails: low. The list then shows the out-of-date line (`app/staff/page.tsx` line 91), and the next poll or change signal removes the rows. The fix needs a new function in `data/visitCache.ts`. Owner decision.

5.1, test gap: partly correct. The first test does pass without the empty step in `confirm()`, because `open()` empties the line. But "a failed clear pressed again" does not reopen the question, and it fails without that step (seen when the builder wrote it). The suggested test with `mockResolvedValue` cannot see the empty step, because the promise resolves in the same `act()`. Accept only the `aria-disabled="true"` check while pending.

5.2, missing tests: accept. A `paused={true}` Cancel-while-pending test, an idle Cancel test (box closes, focus goes back) and a Yes-twice-while-pending test in `PauseSwitch.click.test.tsx` and `RecallAllPanel.click.test.tsx`.

5.3, `NaN`: accept, low. Use `Number.isInteger(data)`, because the count of deleted rows is a whole number. Add the `NaN` test first.

6.1, check 09 proves less than it can: accept. Before 09, set `running = true` and insert one demo `daily_stats` row (day `2000-01-02`, site `A`; the key is `(day, site, is_demo)`). Then 05 and 07 also prove the second call.

6.2, claims and a final assertion: accept. Keep 08 as it is (no `app_metadata`) and add 10 with `{"provider":"email"}`, so both forms are proved. Add a final `do` block that raises an error if a row is not the expected value. The owner runs the file again.
