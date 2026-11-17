# Gemini review: check-in panel fixes after the stale-read review

Model: Gemini Hydrogen 4, High. Use a new chat. Paste everything below the line.

---

You review a small change to a concept prototype of a virtual ER waiting room (Next.js App Router, React, TypeScript, Supabase; synthetic data only). Staff use the check-in panel after triage. Find problems; do not confirm that it is good. For each problem give: severity (must fix, should fix, minor), file and line, what goes wrong, a concrete case, and the smallest fix. If you find no problem in an area, say "none found" for that area.

## What changed (commits 7bcf142 to f7fbcd8)

1. The staff text of the panel moved from `CheckInPanel.tsx` to a new file, `checkInText.ts`.
2. The stale-read warning (`<p id="stale-read-warning" role="status">`) is now always on the page, also while `homeProblem` is set. Its text and amber box show only when `staleRead && !homeProblem`. It and the save-result line are in one `<div>`, so the empty warning takes no space in the form's `space-y-4`.
3. `staleRead` is now `offsitePaused === false && pauseReadFailed`.
4. `STALE_READ` now says "it was not paused", "a start will not be saved", names the "Not eligible" button (the label on the screen while `offsitePaused` is `false`), and says that neither button can save while the network is down.
5. `PAUSED_NOT_SAVED` (shown when the database refuses a start with `VWR02`) now names both "Not eligible" and "Waits on-site". The fallback button says "Not eligible" until the pause switch is read again, then "Waits on-site (off-site waiting paused)". Both buttons save the same outcome, `not_eligible`.
6. Tests: the `aria-describedby` check is on the Start button tag; new checks that the warning names a button on the screen and the network-down case; the click test checks `onCreated` is not called, the fallback button is enabled after the refusal, the paused message stays after a re-render with `offsitePaused={true}`, and the paused message names a button on the screen before and after that re-render.

A review of the previous version asked to suppress the stale warning while the save-result line has text, so two `role="status"` lines never change in one update. We did not do that: the new pause value comes in a later render (`void reloadSitePauses()`), removed text is not read, and hiding a true warning also hides it from sighted staff. Tell us if this reasoning is wrong.

## Questions

1. Is each message true in every state of `offsitePaused` (`true`, `false`, `null`) and `pauseReadFailed`, for a desk visit and for a home visit? Does each message name a button that is on the screen at that time, also while the network is down?
2. Is the always-mounted warning read by screen readers when it appears, and is there any layout or announcement problem from the shared `<div>`?
3. Can any of the tests pass while the panel is wrong? Name the exact change to the panel that a test would miss.
4. Codebase rules: one job per file, no file over 300 lines, straight quotes only, readable for a beginner.

## Line counts after the change

- `components/staff/checkInText.ts`: 27 (new)
- `components/staff/CheckInPanel.tsx`: 273
- `components/staff/CheckInPanel.test.tsx`: 77
- `components/staff/CheckInPanel.click.test.tsx`: 100
- `docs/decisions.md`: 1 line changed

## Checked

- `npm test`: 57 test files, 318 tests passed. `npm run lint`: clean. `npm run build`: passed. (Run in this session after the last change.)
- The two new tests in `CheckInPanel.test.tsx` and the new check in `CheckInPanel.click.test.tsx` failed before the text change (save points `ed82e3e` and `9316c13`) and pass after it.

## Not checked

- How NVDA, VoiceOver or TalkBack read the warning in a real browser.
- The new layout in a real browser (only the test browser, happy-dom).

## Code the changed lines use that is not in the diff

From `components/staff/CheckInPanel.tsx`, where the messages are set and the fallback button label:

```tsx
  // Only a read that says "not paused" lets staff offer off-site waiting.
  const onSiteOnly = offsitePaused !== false;
```

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
```

```tsx
    if (outcome === "waiting" && onSiteOnly) {
      setMessage(`${onSiteOnlyText(offsitePaused, pauseReadFailed)} Press "Waits on-site" instead.`);
      return;
    }
```

```tsx
          <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
            {offsitePaused === true ? "Waits on-site (off-site waiting paused)" : offsitePaused === null ? "Waits on-site" : "Not eligible"}
          </Button>
```

From `data/staffActions.ts`: on a `paused` result, `createDeskVisit` and `checkInVisitFromHome` call `void reloadSitePauses();`, which reads the pause switch again without waiting.

From `components/staff/CheckInPanel.click.test.tsx` (not changed):

```tsx
/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
```

`components/Button.tsx` renders a plain `<button type="button">` with the props passed in.

## Diff

```diff
diff --git a/components/staff/CheckInPanel.click.test.tsx b/components/staff/CheckInPanel.click.test.tsx
index c8c96e9..678d01e 100644
--- a/components/staff/CheckInPanel.click.test.tsx
+++ b/components/staff/CheckInPanel.click.test.tsx
@@ -1,13 +1,16 @@
 // @vitest-environment happy-dom
 // Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
 // waiting is still offered from the last good read, and a start at a site that was paused since
-// then shows the paused message (the database refused it with VWR02).
+// then shows the paused message (the database refused it with VWR02). The fallback button stays
+// enabled, no visit is reported as created, and the paused message stays after a re-render as paused.
+// The paused message must name a button that is on the screen, before and after the new read.
 
 import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { createDeskVisit } from "@/data/staffActions";
 import { CheckInPanel } from "./CheckInPanel";
+import { PAUSED_NOT_SAVED } from "./checkInText";
 
 vi.mock("@/data/staffActions", () => ({ createDeskVisit: vi.fn(), checkInVisitFromHome: vi.fn() }));
 
@@ -32,14 +35,21 @@ afterEach(() => {
 /** The button whose words start with `words`. */
 const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
 
+/** true when one of the button names in "quotes" in `text` is the start of a button on the screen. */
+function namesAButtonOnScreen(text: string): boolean {
+  const names = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
+  return names.some((name) => button(name) !== undefined);
+}
+
 describe("CheckInPanel taps after a failed pause read", () => {
   it("a start at a site paused since the last good read shows the paused message", async () => {
+    const onCreated = vi.fn();
     act(() =>
       root.render(
         <CheckInPanel
           site="A"
           onAttempt={() => {}}
-          onCreated={() => {}}
+          onCreated={onCreated}
           homeVisit={null}
           homeProblem={null}
           onHomeDone={() => {}}
@@ -49,8 +59,12 @@ describe("CheckInPanel taps after a failed pause read", () => {
       ),
     );
     // CTAS 4 is the first radio button; then tick all three checklist items.
-    act(() => container.querySelector<HTMLInputElement>('input[type="radio"]')!.click());
-    for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) act(() => box.click());
+    const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
+    if (!radio) throw new Error("No CTAS radio button");
+    act(() => radio.click());
+    for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
+      act(() => box.click());
+    }
 
     const start = button("Start off-site waiting");
     if (!start) throw new Error('No button "Start off-site waiting"');
@@ -58,8 +72,29 @@ describe("CheckInPanel taps after a failed pause read", () => {
 
     expect(createDeskVisit).toHaveBeenCalledTimes(1);
     expect(vi.mocked(createDeskVisit).mock.calls[0][1]).toBe("waiting");
-    expect(container.textContent).toContain(
-      'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.',
+    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
+    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
+    // Nothing was saved, so no visit was created, and the fallback button is enabled again.
+    expect(onCreated).not.toHaveBeenCalled();
+    // At offsitePaused={false} the fallback button is labelled "Not eligible".
+    expect(button("Not eligible")?.getAttribute("aria-disabled")).toBe("false");
+
+    // Re-render the same panel as paused (as after reloadSitePauses): the paused message stays.
+    act(() =>
+      root.render(
+        <CheckInPanel
+          site="A"
+          onAttempt={() => {}}
+          onCreated={onCreated}
+          homeVisit={null}
+          homeProblem={null}
+          onHomeDone={() => {}}
+          offsitePaused={true}
+          pauseReadFailed={true}
+        />,
+      ),
     );
+    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
+    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
   });
 });
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index d805692..516702f 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -3,6 +3,7 @@
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it } from "vitest";
 import { CheckInPanel } from "./CheckInPanel";
+import { STALE_READ } from "./checkInText";
 
 function render(offsitePaused: boolean | null, pauseReadFailed = false) {
   return renderToStaticMarkup(
@@ -47,11 +48,22 @@ describe("CheckInPanel while the paused switch is not read", () => {
     expect(html).toContain(warning);
     // Screen readers hear the warning when it comes, and again on the button.
     expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*>Warning: could not check/);
-    expect(html).toContain('aria-describedby="stale-read-warning"');
+    expect(html).toMatch(/<button[^>]*aria-describedby="stale-read-warning"[^>]*>Start off-site waiting<\/button>/);
     const fresh = render(false, false);
     expect(fresh).not.toContain(warning);
     expect(fresh).not.toContain("aria-describedby");
   });
+
+  it("the warning names the fallback button that is on the screen", () => {
+    const html = render(false, true);
+    expect(html).toMatch(/<button[^>]*>Not eligible<\/button>/);
+    expect(STALE_READ).toContain('press "Not eligible"');
+    expect(STALE_READ).not.toContain('"Waits on-site"');
+  });
+
+  it("the warning says what happens while the network is still down", () => {
+    expect(STALE_READ).toContain("If the network is still down, neither button can save.");
+  });
 });
 
 describe("CheckInPanel while off-site waiting is paused", () => {
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 110fc7f..99dc365 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -10,6 +10,7 @@ import type { Site, Visit } from "@/lib/visit";
 import type { DeskOutcome } from "@/lib/visitActions";
 import { LANGUAGES, menuLabel } from "@/lib/text/languages";
 import { Button } from "@/components/Button";
+import { PAUSED_NOT_SAVED, STALE_READ, onSiteOnlyText } from "./checkInText";
 
 const CHECKLIST = [
   { id: "phone", label: "Has a phone with them" },
@@ -17,27 +18,6 @@ const CHECKLIST = [
   { id: "agrees", label: "Agrees to wait off-site" },
 ] as const;
 
-// The database refused off-site waiting because the site was paused on another screen.
-const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.';
-
-// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
-const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
-
-// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
-// If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
-// (If the network is still down, the screen says "could not be reached" in place of "paused".)
-const STALE_READ =
-  "Warning: could not check just now whether off-site waiting is paused. The last check said not paused. " +
-  'The screen checks again every 5 seconds. If off-site waiting was paused since then, nothing is saved: press "Waits on-site" instead.';
-
-/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
-function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
-  // Paused comes first: it is the safer fact, even when a later read failed.
-  if (offsitePaused) return "Off-site waiting is paused at this site: the patient waits on-site.";
-  if (pauseReadFailed) return READ_FAILED;
-  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
-}
-
 type Props = {
   site: Site;
   /** Called when staff try a new check-in, before saving, so the last patient's slip is hidden. */
@@ -68,7 +48,9 @@ export function CheckInPanel({
   // Only a read that says "not paused" lets staff offer off-site waiting.
   const onSiteOnly = offsitePaused !== false;
   // Off-site waiting is offered from an older good read, because the last read failed.
-  const staleRead = !onSiteOnly && pauseReadFailed;
+  const staleRead = offsitePaused === false && pauseReadFailed;
+  // The warning shows only while the form can be used (no home visit problem).
+  const showWarning = staleRead && !homeProblem;
 
   const [ctas, setCtas] = useState<4 | 5 | null>(null);
   const [ticked, setTicked] = useState<Record<string, boolean>>({});
@@ -274,19 +256,18 @@ export function CheckInPanel({
 
       {/* Always on the page, so screen readers hear the warning when it comes. It is below the
           buttons, so they do not move when a read fails or works again. */}
-      {!homeProblem && (
+      <div>
         <p
           id="stale-read-warning"
           role="status"
-          className={staleRead ? "rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950" : ""}
+          className={showWarning ? "mb-4 rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950" : ""}
         >
-          {staleRead ? STALE_READ : ""}
+          {showWarning ? STALE_READ : ""}
         </p>
-      )}
-
-      <p role="status" className="min-h-6 font-semibold">
-        {message}
-      </p>
+        <p role="status" className="min-h-6 font-semibold">
+          {message}
+        </p>
+      </div>
     </form>
   );
 }
diff --git a/components/staff/checkInText.ts b/components/staff/checkInText.ts
new file mode 100644
index 0000000..205ba75
--- /dev/null
+++ b/components/staff/checkInText.ts
@@ -0,0 +1,27 @@
+// Staff text for the check-in panel (CheckInPanel.tsx).
+
+// The database refused off-site waiting because the site was paused on another screen.
+// The fallback button says "Not eligible" until the pause switch is read again (it may not be,
+// while the network is down), then "Waits on-site (off-site waiting paused)". Name both.
+export const PAUSED_NOT_SAVED =
+  'Off-site waiting is paused at this site. Nothing was saved. Press "Not eligible" or "Waits on-site" so the patient waits on-site.';
+
+// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
+export const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
+
+// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
+// If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
+// If the network is still down, every save fails with "could not be reached", on both buttons.
+// While the last good read said "not paused", the fallback button is labelled "Not eligible".
+export const STALE_READ =
+  "Warning: could not check just now whether off-site waiting is paused. The last check said it was not paused. " +
+  "The screen checks again every 5 seconds. If it was paused since then, a start will not be saved: " +
+  'press "Not eligible" so the patient waits on-site. If the network is still down, neither button can save.';
+
+/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
+export function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
+  // Paused comes first: it is the safer fact, even when a later read failed.
+  if (offsitePaused) return "Off-site waiting is paused at this site: the patient waits on-site.";
+  if (pauseReadFailed) return READ_FAILED;
+  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
+}
diff --git a/docs/decisions.md b/docs/decisions.md
index 234bec4..8da6904 100644
--- a/docs/decisions.md
+++ b/docs/decisions.md
@@ -54,7 +54,7 @@ One line each: date, decision, who decided, where it is written.
 - 2026-11-16: The database checks status moves (trigger `visits_check_step`, error code `VWR01`), with the same list as `ALLOWED_MOVES` in `lib/allowedSteps.ts`; a test fails if the two lists differ. The time rules (the phone steps after a recall) stay in the app, because their minutes live in `lib/demoTimes.ts`. Owner. supabase/migrations/20261117000000_allowed_steps.sql.
 - 2026-11-16: While a site is paused, the database refuses a new `waiting` visit and a triage to `waiting`; Undo back to `waiting` stays allowed, because that patient was already waiting off-site. Owner (pause review 2026-11-12, item 1).
 - 2026-11-16: A step the database refuses shows on the staff row as "The list just changed. Check this patient again." and the list reloads; a refused desk check-in (`createDeskVisit`) still shows "not saved", because the screen hides the off-site choice while paused. Claude, in the approved plan. data/staffActions.ts. Changed on 2026-11-17 for a pause refusal (see below).
-- 2026-11-17: A pause refusal has its own error code, `VWR02`; a bad move and a change of site stay `VWR01`. `lib/saveResult.ts` turns them into `paused` and `refused`. On `paused`, check-in (home visit and desk visit) shows "Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved." and reads the pause switch again. Owner (Gemini step check review, points 9 and 16). supabase/migrations/20261117010000_step_check_fixes.sql, data/staffActions.ts, components/staff/CheckInPanel.tsx.
+- 2026-11-17: A pause refusal has its own error code, `VWR02`; a bad move and a change of site stay `VWR01`. `lib/saveResult.ts` turns them into `paused` and `refused`. On `paused`, check-in (home visit and desk visit) shows "Off-site waiting is paused at this site. Nothing was saved. Press "Not eligible" or "Waits on-site" so the patient waits on-site." (2026-11-17: names both labels, because the button says "Not eligible" until the switch is read again) and reads the pause switch again. Owner (Gemini step check review, points 9 and 16). supabase/migrations/20261117010000_step_check_fixes.sql, data/staffActions.ts, components/staff/CheckInPanel.tsx.
 - 2026-11-17: A visit cannot change site after it is made (`VWR01`). Owner (Gemini step check review, points 2 and 5).
 - 2026-11-17: The pause read in `visits_check_step` uses `for share`, so it waits for a pause that is being saved; `for key share` would not wait, because a pause is a non-key update. A missing settings row or an empty value counts as paused. Owner (Gemini step check review, points 6 and 8). Not checked: a run as a signed-in staff user (`for share` needs UPDATE on `site_settings`, which staff have).
 - 2026-11-17: Not changed after the Gemini step check review: time rules in the database (point 3, owner chose status moves only), and `waiting` to `called` while paused (point 11, recall must always work). Reasons in handoffs/archive/2026-11-16-gemini-review-allowed-steps.md.
```


## Response

Gemini Hydrogen 4, High, 2026-11-17. Pasted as received.

### Reasoning on Not Suppressing `STALE_READ` While the Save-Result Line Has Text

Your decision **not** to suppress `STALE_READ` when `message` has text is right: hiding `STALE_READ` while a save error is showing would hide an active warning from sighted staff, and clearing `STALE_READ` when `reloadSitePauses()` sets `offsitePaused = true` sets the node's text to `""`, which screen readers do not announce.

One part of the explanation is slightly incomplete, though not a reason to hide the warning:

* **Severity:** minor
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 51–53 and 259–270
* **What goes wrong:** While `VWR02` triggers `reloadSitePauses()` asynchronously in a later render, two `role="status"` (`aria-live="polite"`) elements inside the shared `<div>` *can* still mutate in the same commit in other paths—for example, if a save fails (`setMessage(...)`) in the same render batch where `homeProblem` clears or `pauseReadFailed` flips to `true`. On iOS VoiceOver and Android TalkBack, mutating two polite live regions in one commit can cause the second update to cut off the first.
* **Concrete case:** A save fails with `"Not saved: the database could not be reached..."` in the same React render batch as a parent state update that sets `pauseReadFailed={true}` (or clears `homeProblem` while `staleRead` is already `true`); both `<p role="status">` nodes change text simultaneously.
* **Smallest fix:** Keep `showWarning` visible to sighted staff (do not suppress it with `!message`), and only suppress duplicate announcements if a future change ever updates `pauseReadFailed` and `message` in the same handler.

---

### 1. Truth of Messages and Button Names Across All States and Visit Types

1. **`STALE_READ` says `"neither button can save"` on a desk visit where three buttons are on the screen**
* **Severity:** minor
* **File and line:** `components/staff/checkInText.ts`, line 19
* **What goes wrong:** `STALE_READ` shows when `offsitePaused === false && pauseReadFailed === true`. For a home visit (`homeVisit !== null`), two buttons are rendered (`"Start off-site waiting"` and `"Not eligible"`), so `"neither button can save"` is true. For a desk visit (`homeVisit === null`), three buttons are rendered (`"Start off-site waiting"`, `"Offered, declined"`, and `"Not eligible"`), making `"neither button"` inaccurate.
* **Concrete case:** Triage staff check in a walk-in patient (`homeVisit === null`) while `offsitePaused === false` and `pauseReadFailed === true`, look at three action buttons, and read `"If the network is still down, neither button can save."`
* **Smallest fix:** Change `"neither button can save."` to `"no button can save."` in `components/staff/checkInText.ts` line 19.

2. **`PAUSED_NOT_SAVED` says `"Press \"Not eligible\" or \"Waits on-site\""`, which omits the rest of the paused button label (`"Waits on-site (off-site waiting paused)"`)**
* **Severity:** minor
* **File and line:** `components/staff/checkInText.ts`, lines 6–7; `components/staff/CheckInPanel.tsx`, fallback button (`offsitePaused === true ? "Waits on-site (off-site waiting paused)" : ...`)
* **What goes wrong:** Before `reloadSitePauses()` completes (or if it fails while offline), the fallback button is `"Not eligible"`. Once `reloadSitePauses()` completes (`offsitePaused === true`), the button text is `"Waits on-site (off-site waiting paused)"`, not `"Waits on-site"`. While `"Waits on-site"` is the prefix of that label, staff scanning for an exact button match see parenthetical text that the message omits.
* **Concrete case:** Staff submit a desk or home visit (`VWR02`), `reloadSitePauses()` resolves `offsitePaused = true`, and staff see `Press "Not eligible" or "Waits on-site"` next to a button labelled `"Waits on-site (off-site waiting paused)"`.
* **Smallest fix:** Shorten the paused button text in `CheckInPanel.tsx` to `"Waits on-site"` (both `PAUSED_NOT_SAVED` and the red pause banner already state that off-site waiting is paused), or match the full label in `PAUSED_NOT_SAVED`.

3. **Enter-submit guard (`onSiteOnlyText` + `"Press \"Waits on-site\" instead."`) omits `"Nothing was saved."`, omits the network-down caveat when `offsitePaused === null && pauseReadFailed === true`, and omits `(off-site waiting paused)` when `offsitePaused === true**`
* **Severity:** minor
* **File and line:** `components/staff/checkInText.ts`, lines 10 and 22–27; `components/staff/CheckInPanel.tsx`, `if (outcome === "waiting" && onSiteOnly)` submit guard
* **What goes wrong:** When `onSiteOnly` is `true` (`offsitePaused === true` or `offsitePaused === null`) and staff trigger a `"waiting"` submit (e.g., by pressing Enter in the form), `CheckInPanel.tsx` sets `message` to ``${onSiteOnlyText(offsitePaused, pauseReadFailed)} Press "Waits on-site" instead.``. Unlike `PAUSED_NOT_SAVED`, none of the three `onSiteOnlyText` branches says `"Nothing was saved."`—so `"the patient waits on-site"` / `"the patient can wait on-site"` reads as if the check-in was already recorded. In addition, when `offsitePaused === null && pauseReadFailed === true` because the network is down, `READ_FAILED` does not warn that pressing `"Waits on-site"` will also fail to reach the database.
* **Concrete case:** Initial pause read fails (`offsitePaused === null`, `pauseReadFailed === true`) because Wi-Fi is down; staff press Enter in the form, see `"Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. Press \"Waits on-site\" instead."`, and believe the visit is already saved or do not realize the network outage will also block `"Waits on-site"`.
* **Smallest fix:** Append `" Nothing was saved."` in the `if (outcome === "waiting" && onSiteOnly)` branch in `CheckInPanel.tsx`, and add `" If the network is still down, it cannot save either."` to `READ_FAILED` in `components/staff/checkInText.ts` line 10.

---

### 2. Screen-Reader Announcement of the Always-Mounted Warning and Shared `<div>` Layout

**None found** for the always-mounted `<p id="stale-read-warning" role="status">` or the shared `<div>` layout: keeping `<p id="stale-read-warning" role="status">` mounted in the DOM (including while `homeProblem` is set) ensures screen readers register the live region before `STALE_READ` appears, grouping both `<p role="status">` elements inside one plain `<div>` is transparent to assistive technology, and Tailwind's Preflight `margin: 0` on `<p>` ensures the empty `<p>` collapses to `0px` height and removes the extra `space-y-4` gap above `message`.

---

### 3. Tests That Can Pass While the Panel Is Wrong

1. **`CheckInPanel.test.tsx` never checks `homeProblem` suppression of `STALE_READ` and tests `STALE_READ` text on the constant rather than the rendered HTML**
* **Severity:** should fix
* **File and line:** `components/staff/CheckInPanel.test.tsx`, lines 48–66
* **What goes wrong:** `render()` always passes `homeProblem={null}` (presumably), so `showWarning = staleRead && !homeProblem` is never tested when `homeProblem` is non-null. In addition, lines 59–65 assert against the imported `STALE_READ` constant instead of `html`, so if `CheckInPanel.tsx` rendered a partial string instead of `{showWarning ? STALE_READ : ""}`, the new tests would still pass.
* **Concrete case:** Change `const showWarning = staleRead && !homeProblem;` in `components/staff/CheckInPanel.tsx` line 53 to `const showWarning = staleRead;` (showing the warning over a broken home-visit error), or change line 265 to `{showWarning ? "Warning: could not check" : ""}`: all tests in `CheckInPanel.test.tsx` still pass.
* **Smallest fix:** Assert `expect(html).toContain(STALE_READ)` on the rendered output of `render(false, true)`, and add a test rendering `CheckInPanel` with `offsitePaused={false}`, `pauseReadFailed={true}`, and a non-null `homeProblem` verifying that `<p id="stale-read-warning" role="status">` is empty while `aria-describedby` is absent.

2. **`CheckInPanel.click.test.tsx` passes even if the fallback button saves the wrong outcome, stays disabled after re-render, or renders an altered `"Waits on-site..."` label**
* **Severity:** should fix
* **File and line:** `components/staff/CheckInPanel.click.test.tsx`, lines 36, 39–42, and 75–98
* **What goes wrong:**
* `namesAButtonOnScreen(PAUSED_NOT_SAVED)` checks the imported constant `PAUSED_NOT_SAVED` (not the rendered live region) using `button(name)`, which matches by `.startsWith(name)`.
* The test never checks `aria-disabled` on the paused fallback button after re-rendering with `offsitePaused={true}`, and never clicks the fallback button after a `VWR02` refusal to verify it calls `createDeskVisit(form, "not_eligible")`.
* `checkInVisitFromHome` is mocked on line 15, but the `homeVisit` `"paused"` branch in `CheckInPanel.tsx` is never exercised.
* **Concrete case:** In `components/staff/CheckInPanel.tsx`, change the fallback button's `onClick={() => finish("not_eligible")}` to `onClick={() => finish("waiting")}`, or change its paused label to `"Waits on-site (broken)"`: `CheckInPanel.click.test.tsx` still passes completely.
* **Smallest fix:** After re-rendering with `offsitePaused={true}` in `CheckInPanel.click.test.tsx`, assert `expect(button("Waits on-site (off-site waiting paused)")?.getAttribute("aria-disabled")).toBe("false")`, click it, and verify `createDeskVisit` is called a second time with `"not_eligible"`.

---

### 4. Codebase Rules (One Job per File, <= 300 Lines, Straight Quotes, Beginner Readability)

**None found** in the diff: all quotes and apostrophes in `checkInText.ts`, `CheckInPanel.tsx`, `CheckInPanel.test.tsx`, `CheckInPanel.click.test.tsx`, and `docs/decisions.md` are straight ASCII quotes (`"` / `'`), every file has a single clear responsibility, `CheckInPanel.tsx` is 273 lines (under the 300-line cap, with 27 lines remaining), and the logic is straightforward for a beginner.
