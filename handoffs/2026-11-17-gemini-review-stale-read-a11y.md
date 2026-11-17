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

Line counts after the change: `components/staff/CheckInPanel.tsx` 292, `components/staff/CheckInPanel.test.tsx` 65, `components/staff/CheckInPanel.click.test.tsx` 65, `supabase/checks/allowed_steps.sql` 219.

Two-tab browser check done by the owner on 2026-11-17: tab B blocked `*api/site-status*` in DevTools, tab A paused site A. The amber warning showed with "Start off-site waiting"; the start showed the paused message and saved nothing; after unblocking, the red paused box came and the start button went away.

The `save` helper in `CheckInPanel.tsx` (not in the diff; the click test reaches it through the start button):

```tsx
  async function save(outcome: DeskOutcome, ctasLevel: 4 | 5): Promise<string | null> {
    const form = { site, ctas_level: ctasLevel, language };
    if (homeVisit) {
      const result = await checkInVisitFromHome(homeVisit.id, form, outcome);
      if (result === "saved") {
        onHomeDone();
        return homeVisit.code;
      }
      setMessage(
        result === "paused"
          ? PAUSED_NOT_SAVED
          : result === "not_saved"
            ? "Not saved: the database could not be reached. Nothing was recorded. Try again."
            : `Visit ${homeVisit.code} changed or is already checked in. No check-in was saved.`,
      );
      return null;
    }
    const visit = await createDeskVisit(form, outcome);
    if (visit === "paused") {
      setMessage(PAUSED_NOT_SAVED);
      return null;
    }
    if (visit === "refused") {
      setMessage("Not saved: the database refused this check-in. Nothing was recorded.");
      return null;
    }
    if (!visit) {
      setMessage("Not saved: the database could not be reached. Nothing was recorded. Try again.");
      return null;
    }
    onCreated(visit);
    return visit.code;
  }

  async function finish(outcome: DeskOutcome) {
```

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

**Two-tab browser check done: the warning showed and the paused start saved nothing.**

## Not checked

- How NVDA or VoiceOver read the warning in a real browser.

## Response

Gemini Hydrogen 4, High, 2026-11-17. Pasted as received.

### 1. Screen readers, empty `role="status"`, and two `role="status"` lines on one form

1. **Conditional mounting of `#stale-read-warning` behind `{!homeProblem && ...}` and extra layout gap from an empty `<p>` — Severity: `should fix**`
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 270–278
* **What goes wrong:**
* When `staleRead` flips from `false` to `true` while the form is already shown, NVDA and VoiceOver announce the text added to `<p id="stale-read-warning" role="status">`, and tabbing to `"Start off-site waiting"` reads the warning via `aria-describedby`. However, if the panel mounts with `offsitePaused={false}` and `pauseReadFailed={true}` already set—or if `homeProblem` clears while `staleRead` is already `true`—the `<p role="status">` mounts *already populated*, which VoiceOver and NVDA do not announce on mount (it is only read later if focus lands on the submit button).
* Leaving an unhidden empty `<p>` inside a vertical `space-y-*` form stack inserts an extra block sibling above `<p role="status" className="min-h-6">`, doubling the blank vertical gap below the buttons whenever `staleRead` is `false`.
* **Concrete case:** A triage clerk opens or switches to a site whose last good read was "not paused" and whose latest 5-second read already failed (`offsitePaused={false}`, `pauseReadFailed={true}`): screen readers stay silent until focus reaches `"Start off-site waiting"`, and during normal operation (`staleRead === false`) the empty `<p>` adds extra whitespace above the status message line.
* **Smallest fix:** Render an unconditional `<div id="stale-read-warning" role="status">` outside `{!homeProblem && ...}` so the live region is always mounted, and render the styled `<p>{STALE_READ}</p>` inside it only when `staleRead` is `true`.

2. **Two `role="status"` live regions on the same form can cut each other off — Severity: `should fix**`
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 271–282
* **What goes wrong:** Both `#stale-read-warning` (line 273) and the save-result paragraph (line 280) use `role="status"` (`aria-live="polite"`). When both update in the same commit—for example, submitting `"Start off-site waiting"` returns `"paused"` (`message` updates to `PAUSED_NOT_SAVED`) in the same render that `offsitePaused` refreshes to `true` and clears `#stale-read-warning`, or a 5-second read fails on the same tick `"Waits on-site"` saves—iOS VoiceOver and Android TalkBack cancel the first polite announcement with the second.
* **Concrete case:** While `staleRead` is `true`, another nurse pauses the site; the clerk presses `"Start off-site waiting"`, updating `message` on line 280 while clearing `#stale-read-warning` on line 276, causing mobile screen readers to drop or clip the refusal message.
* **Smallest fix:** Keep `aria-describedby={staleRead ? "stale-read-warning" : undefined}` on the submit button, and suppress `STALE_READ` inside `#stale-read-warning` once `message` is non-empty so both `role="status"` regions never fire in the same update.

### 2. Clarity and truth of the warning text in all cases

3. **`STALE_READ` omits what happens when the network is still down at save and uses clipped wording — Severity: `should fix**`
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 30–32
* **What goes wrong:**
* When a 5-second read fails (`pauseReadFailed === true`), the usual cause is a lost network or database connection. If that connection is still down when staff click `"Start off-site waiting"`, Postgres never returns `VWR02`—instead the save fails with `"could not be reached"`, and pressing `"Waits on-site"` will also fail until the connection recovers. Telling staff only `'If off-site waiting was paused since then, nothing is saved: press "Waits on-site" instead.'` omits the network-down case that line 29's comment explicitly acknowledges.
* `"The last check said not paused."` drops the subject (`"it was not paused"`), and present-tense `"nothing is saved"` before clicking can sound like current checklist selections are not saved rather than `"nothing will be saved"`.
* **Concrete case:** Triage desk Wi-Fi drops: the 5-second check fails (`STALE_READ` shows), and the clerk clicks `"Start off-site waiting"` while still offline. The screen says the database could not be reached rather than paused, and pressing `"Waits on-site"` as instructed also fails.
* **Smallest fix:** Update `STALE_READ` in `components/staff/CheckInPanel.tsx` (lines 30–32) to:
`'Warning: could not check just now whether off-site waiting is paused. The last check said it was not paused. The screen checks again every 5 seconds. If it was paused since then, nothing will be saved and you can press "Waits on-site" instead. If the connection is still down, neither button can save yet.'`

### 3. Does the click test prove what its name says, and can it pass while the panel is wrong?

4. **`CheckInPanel.click.test.tsx` can pass even if the stale warning is missing, `onCreated` fires on `"paused"`, or `"Waits on-site"` stays disabled — Severity: `must fix**`
* **File and line:** `components/staff/CheckInPanel.click.test.tsx`, lines 36–64
* **What goes wrong:** The test passes `offsitePaused={false}` and `pauseReadFailed={true}`, clicks `"Start off-site waiting"`, and checks only `createDeskVisit` call count/status and `PAUSED_NOT_SAVED` text. It still passes if `CheckInPanel` is broken in four ways:
* **Ignores `pauseReadFailed` completely:** Deleting `staleRead`, `#stale-read-warning`, `role="status"`, and `aria-describedby` from `CheckInPanel.tsx` leaves this test passing.
* **Fires `onCreated` on `"paused"`:** `onCreated={() => {}}` (line 42) is never asserted `not.toHaveBeenCalled()`, even though `"Nothing was saved."` requires no visit creation callback to run.
* **Leaves `"Waits on-site"` disabled after `"paused"`:** The test never verifies that `"Waits on-site"` has `aria-disabled="false"` after the refusal so staff can complete the fallback step.
* **Swallows `PAUSED_NOT_SAVED` when `offsitePaused` updates to `true`:** It never re-renders with `offsitePaused={true}` (simulating `reloadSitePauses()` after `"paused"`) to verify that `PAUSED_NOT_SAVED` remains visible once `"Start off-site waiting"` unmounts.
* **Concrete case:** A bug in `CheckInPanel.tsx` invokes `onCreated()` on `"paused"`, leaves `saving` stuck at `true` (`aria-disabled="true"` on `"Waits on-site"`), or removes `staleRead` from the component: `CheckInPanel.click.test.tsx` still passes.
* **Smallest fix:** Pass `const onCreated = vi.fn();` in `components/staff/CheckInPanel.click.test.tsx`, assert `STALE_READ` and `start.getAttribute("aria-describedby") === "stale-read-warning"` before clicking, assert `expect(onCreated).not.toHaveBeenCalled()` and `button("Waits on-site")?.getAttribute("aria-disabled") === "false"` after `"paused"`, and re-render with `offsitePaused={true}` to confirm `PAUSED_NOT_SAVED` stays on screen.

5. **`CheckInPanel.test.tsx` checks `aria-describedby` anywhere in the HTML rather than on the submit button — Severity: `minor**`
* **File and line:** `components/staff/CheckInPanel.test.tsx`, line 51
* **What goes wrong:** `expect(html).toContain('aria-describedby="stale-read-warning"')` passes even if the attribute is placed on `"Waits on-site"` or another element instead of `"Start off-site waiting"`.
* **Concrete case:** Moving `aria-describedby` onto `"Waits on-site"` passes `CheckInPanel.test.tsx` while leaving `"Start off-site waiting"` without an accessible description.
* **Smallest fix:** Match the attribute on the submit button tag itself: `expect(html).toMatch(/<button[^>]*aria-describedby="stale-read-warning"[^>]*>Start off-site waiting<\/button>/)`.

### 4. Codebase rules (one job per file, <= 300 lines, straight quotes, beginner readability)

6. **`CheckInPanel.tsx` is ~288 lines (near the 300-line ceiling) and uses double-negation logic — Severity: `minor**`
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 69–71 and 270–282
* **What goes wrong:**
* All quotes across the four files in the diff are straight quotes, `supabase/checks/allowed_steps.sql` (lines 26–31) accurately explains Postgres aborted-transaction lock behavior, and each file has a clear single purpose.
* However, adding 12 net lines brings `components/staff/CheckInPanel.tsx` to ~288 lines (line 282 is right before the closing `</form>` and function brace), leaving almost no margin under the 300-line limit.
* Lines 69–71 compute `const onSiteOnly = offsitePaused !== false;` and then negate it (`const staleRead = !onSiteOnly && pauseReadFailed;`), which is harder for a beginner to read than a positive boolean.
* **Concrete case:** Any follow-up edit that adds a few lines to `CheckInPanel.tsx` (such as expanding `STALE_READ`) pushes the file over 300 lines.
* **Smallest fix:** Replace lines 69–71 with `const canOfferOffsite = offsitePaused === false; const staleRead = canOfferOffsite && pauseReadFailed;`, and move the check-in text constants and `onSiteOnlyText` helper into a small helper module if any further lines are added to `CheckInPanel.tsx`.

7. **Unchecked non-null `!` assertion and single-line loop in `CheckInPanel.click.test.tsx` — Severity: `minor**`
* **File and line:** `components/staff/CheckInPanel.click.test.tsx`, lines 52–53
* **What goes wrong:** `container.querySelector<HTMLInputElement>('input[type="radio"]')!.click()` throws an opaque `TypeError: Cannot read properties of null` if the markup changes, and the braceless single-line `for (...) act(() => box.click());` is harder for a beginner to scan than the explicit error guard on line 56.
* **Concrete case:** A beginner renames or changes the CTAS input type in `CheckInPanel.tsx` and hits an unexplained null-dereference error on line 52 instead of a readable message.
* **Smallest fix:** Extract a small `tickRequiredFields()` helper in `components/staff/CheckInPanel.click.test.tsx` that checks for the radio and checkboxes and throws a descriptive `Error` if missing, matching line 56.
