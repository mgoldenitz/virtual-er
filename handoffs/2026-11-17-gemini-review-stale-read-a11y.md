# Gemini review: stale read warning, click test, check file comment

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## Text to paste

You review a small change in a Next.js and Supabase prototype of a virtual ER waiting room (synthetic data only). Find problems; do not confirm. For each problem give the file and line, what goes wrong, a concrete case, and the smallest fix, with a severity (must fix, should fix, minor).

Background. Staff check in a patient on a check-in panel. A switch per site can pause off-site waiting. The panel reads the switch every 5 seconds. `offsitePaused` is `true` (paused), `false` (not paused) or `null` (not read yet). `pauseReadFailed` is `true` when the last read failed; the panel then keeps the last good value. When the last good read was "not paused" and a later read failed, the panel still offers "Start off-site waiting" and shows a warning. The database refuses a start at a paused site (error `VWR02`), and the panel then shows 'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.'

The change does 4 things, from your earlier review:
1. The warning is now below the buttons, in a `<p id="stale-read-warning" role="status">` that is always on the page (empty when there is no warning), and the start button has `aria-describedby` to it while it shows.
2. New warning text in desk words.
3. A new click test (happy-dom) for a start after a failed read at a site paused since then.
4. A more exact comment in the SQL check file about what an error does to the transaction.

Checked: 57 test files, 316 tests, lint and build pass; a mutation try on the `paused` branch made the click test fail. Not checked: how NVDA or VoiceOver read the warning in a real browser.

Questions:
1. Do screen readers announce the warning when it appears, and read it on focus of the button? Is an empty `role="status"` element a problem, and are two `role="status"` lines on one form a problem (the other one shows save messages)?
2. Is the warning text clear and true for staff at a triage desk, in all cases (including the network still down at the save)?
3. Does the click test prove what its name says? Can it pass while the panel is wrong?
4. Does any file break the rules: one job per file, no file over 300 lines, straight quotes, readable for a beginner?

The diff:

```diff
diff --git a/components/staff/CheckInPanel.click.test.tsx b/components/staff/CheckInPanel.click.test.tsx
new file mode 100644
index 0000000..c8c96e9
--- /dev/null
+++ b/components/staff/CheckInPanel.click.test.tsx
@@ -0,0 +1,65 @@
+// @vitest-environment happy-dom
+// Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
+// waiting is still offered from the last good read, and a start at a site that was paused since
+// then shows the paused message (the database refused it with VWR02).
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { createDeskVisit } from "@/data/staffActions";
+import { CheckInPanel } from "./CheckInPanel";
+
+vi.mock("@/data/staffActions", () => ({ createDeskVisit: vi.fn(), checkInVisitFromHome: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+let container: HTMLDivElement;
+let root: Root;
+
+beforeEach(() => {
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+  vi.mocked(createDeskVisit).mockReset().mockResolvedValue("paused");
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+});
+
+/** The button whose words start with `words`. */
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+describe("CheckInPanel taps after a failed pause read", () => {
+  it("a start at a site paused since the last good read shows the paused message", async () => {
+    act(() =>
+      root.render(
+        <CheckInPanel
+          site="A"
+          onAttempt={() => {}}
+          onCreated={() => {}}
+          homeVisit={null}
+          homeProblem={null}
+          onHomeDone={() => {}}
+          offsitePaused={false}
+          pauseReadFailed={true}
+        />,
+      ),
+    );
+    // CTAS 4 is the first radio button; then tick all three checklist items.
+    act(() => container.querySelector<HTMLInputElement>('input[type="radio"]')!.click());
+    for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) act(() => box.click());
+
+    const start = button("Start off-site waiting");
+    if (!start) throw new Error('No button "Start off-site waiting"');
+    await act(async () => start.click());
+
+    expect(createDeskVisit).toHaveBeenCalledTimes(1);
+    expect(vi.mocked(createDeskVisit).mock.calls[0][1]).toBe("waiting");
+    expect(container.textContent).toContain(
+      'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.',
+    );
+  });
+});
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index bae6405..d805692 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -42,9 +42,15 @@ describe("CheckInPanel while the paused switch is not read", () => {
 
   it("warns that the last read failed but still offers off-site waiting", () => {
     const html = render(false, true);
+    const warning = "Warning: could not check just now whether off-site waiting is paused";
     expect(html).toContain("Start off-site waiting");
-    expect(html).toContain("Could not read the pause switch just now");
-    expect(render(false, false)).not.toContain("Could not read the pause switch just now");
+    expect(html).toContain(warning);
+    // Screen readers hear the warning when it comes, and again on the button.
+    expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*>Warning: could not check/);
+    expect(html).toContain('aria-describedby="stale-read-warning"');
+    const fresh = render(false, false);
+    expect(fresh).not.toContain(warning);
+    expect(fresh).not.toContain("aria-describedby");
   });
 });
 
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index fcae5dc..110fc7f 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -24,10 +24,11 @@ const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits
 const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
 
 // A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
-// If the site was paused meanwhile, the database refuses the start (VWR02) and PAUSED_NOT_SAVED shows.
+// If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
+// (If the network is still down, the screen says "could not be reached" in place of "paused".)
 const STALE_READ =
-  "Could not read the pause switch just now. The last read said off-site waiting is not paused. " +
-  "The screen tries again every 5 seconds. If the site is paused now, the start is not saved and the screen says so.";
+  "Warning: could not check just now whether off-site waiting is paused. The last check said not paused. " +
+  'The screen checks again every 5 seconds. If off-site waiting was paused since then, nothing is saved: press "Waits on-site" instead.';
 
 /** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
 function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
@@ -66,6 +67,8 @@ export function CheckInPanel({
 }: Props) {
   // Only a read that says "not paused" lets staff offer off-site waiting.
   const onSiteOnly = offsitePaused !== false;
+  // Off-site waiting is offered from an older good read, because the last read failed.
+  const staleRead = !onSiteOnly && pauseReadFailed;
 
   const [ctas, setCtas] = useState<4 | 5 | null>(null);
   const [ticked, setTicked] = useState<Record<string, boolean>>({});
@@ -251,16 +254,9 @@ export function CheckInPanel({
               {onSiteOnlyText(offsitePaused, pauseReadFailed)}
             </p>
           ) : (
-            <>
-              {pauseReadFailed && (
-                <p className="w-full rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950">
-                  {STALE_READ}
-                </p>
-              )}
-              <Button type="submit" aria-disabled={saving}>
-                Start off-site waiting
-              </Button>
-            </>
+            <Button type="submit" aria-disabled={saving} aria-describedby={staleRead ? "stale-read-warning" : undefined}>
+              Start off-site waiting
+            </Button>
           )}
           {/* While paused nobody can be offered off-site waiting, so "Offered, declined" would count
               a patient as offered by mistake. "Waits on-site" records not_eligible, which leaves the
@@ -276,6 +272,18 @@ export function CheckInPanel({
         </div>
       )}
 
+      {/* Always on the page, so screen readers hear the warning when it comes. It is below the
+          buttons, so they do not move when a read fails or works again. */}
+      {!homeProblem && (
+        <p
+          id="stale-read-warning"
+          role="status"
+          className={staleRead ? "rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950" : ""}
+        >
+          {staleRead ? STALE_READ : ""}
+        </p>
+      )}
+
       <p role="status" className="min-h-6 font-semibold">
         {message}
       </p>
diff --git a/supabase/checks/allowed_steps.sql b/supabase/checks/allowed_steps.sql
index 159e97e..4783cd7 100644
--- a/supabase/checks/allowed_steps.sql
+++ b/supabase/checks/allowed_steps.sql
@@ -24,10 +24,11 @@
 
 begin;
 
--- If the last block stops with an error, the "rollback" line does not run and the transaction
--- can stay open with locks on site_settings and visits. This timeout makes Postgres end such a
--- session after 10 seconds, which undoes everything and frees the locks. "set local" ends with
--- this transaction (on rollback or on an error), so no setting stays on a shared connection.
+-- If a statement stops with an error, the "rollback" line does not run. The transaction then
+-- stays open (aborted) with locks on site_settings and visits, until "rollback" runs or this
+-- timeout ends the session after 10 seconds, which undoes everything and frees the locks.
+-- "set local" ends with this transaction, so no setting stays on a shared connection.
+-- "set local" works only inside "begin", so run the whole file, from "begin" to "rollback".
 set local idle_in_transaction_session_timeout = '10s';
 
 -- Tries one change. Any other error stops the whole run (and still saves nothing).
```

## Not checked

- How NVDA or VoiceOver read the warning in a real browser.
- The owner's two-tab browser check.
