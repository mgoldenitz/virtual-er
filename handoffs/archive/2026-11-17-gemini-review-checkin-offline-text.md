# Gemini review: check-in text for Enter and offline, and more panel tests

Model: Gemini Hydrogen 4, High. Use a new chat. Paste everything below the line.

---

You review a small change to a concept prototype of a virtual ER waiting room (Next.js App Router, React, TypeScript, Supabase; synthetic data only). Staff use the check-in panel after triage. Find problems; do not confirm that it is good. For each problem give: severity (must fix, should fix, minor), file and line, what goes wrong, a concrete case, and the smallest fix. If you find no problem in an area, say "none found" for that area.

## What changed (commits bfb1d35 to a62dd0f)

1. `STALE_READ` now ends "If the network is still down, no button can save." (was "neither button"; three buttons show while `offsitePaused` is `false`, for a desk visit and for a home visit).
2. `READ_FAILED` (pause switch never read, last read failed) gets the same last sentence.
3. When staff press Enter (form submit asks for off-site waiting) while only on-site waiting is offered, the message now says "Nothing was saved." before 'Press "Waits on-site" instead.'
4. Tests: the full `STALE_READ` and `READ_FAILED` are checked in the rendered html; a test with a non-null `homeProblem` checks the warning is empty and no `aria-describedby`; the click test presses the paused fallback button after a `VWR02` refusal and checks a second save with `not_eligible`; a new click test covers a home visit refused as `paused`; a new click test submits the form while `offsitePaused` is `null` and the read failed.

Not changed on purpose: the paused fallback label stays "Waits on-site (off-site waiting paused)", while `PAUSED_NOT_SAVED` names "Waits on-site". "Waits on-site" is the full label while `offsitePaused` is `null`, and the start of the label while it is `true`. Tell us if this is a real problem for staff.

## Questions

1. Is each changed message true in every state of `offsitePaused` (`true`, `false`, `null`) and `pauseReadFailed`, for a desk visit and for a home visit? Is "no button can save" true when the network is down: does any button save without the network?
2. Is the Enter message order clear: the red-box text, then "Nothing was saved.", then the instruction?
3. Can any of the new tests pass while the panel is wrong? Name the exact change to the panel that a test would miss.
4. Codebase rules: one job per file, no file over 300 lines, straight quotes only, readable for a beginner.

## Line counts after the change

- `components/staff/checkInText.ts`: 30
- `components/staff/CheckInPanel.tsx`: 273
- `components/staff/CheckInPanel.test.tsx`: 92
- `components/staff/CheckInPanel.click.test.tsx`: 172
- `docs/decisions.md`: 1 line changed

## Checked

- `npm test`: 57 test files, 322 tests passed. `npm run lint`: clean. `npm run build`: passed. (Run in this session after the last change.)
- The three text tests failed before the text change (save point `f19df78`) and pass after it. The other new tests passed before the change; they add coverage and are not bug tests.

## Not checked

- Whether any save works without the network (for example a queued save). I read `CheckInPanel.tsx`; it calls `createDeskVisit` or `checkInVisitFromHome` and shows "could not be reached" when they return null or `not_saved`. I did not read every path in `data/staffActions.ts` for this review.
- How NVDA, VoiceOver or TalkBack read the messages in a real browser.
- The panel in a real browser (only the test browser, happy-dom).

## Code the changed lines use that is not in the diff

From `components/staff/CheckInPanel.tsx`:

```tsx
  const onSiteOnly = offsitePaused !== false;
  const staleRead = offsitePaused === false && pauseReadFailed;
  const showWarning = staleRead && !homeProblem;
```

```tsx
          {onSiteOnly ? (
            <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
              {onSiteOnlyText(offsitePaused, pauseReadFailed)}
            </p>
          ) : (
            <Button type="submit" aria-disabled={saving} aria-describedby={staleRead ? "stale-read-warning" : undefined}>
              Start off-site waiting
            </Button>
          )}
          {!onSiteOnly && (
            <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
              Offered, declined
            </Button>
          )}
          <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
            {offsitePaused === true ? "Waits on-site (off-site waiting paused)" : offsitePaused === null ? "Waits on-site" : "Not eligible"}
          </Button>
```

The whole button block is inside `{!homeProblem && ( ... )}`. The warning and the save-result line are two `<p role="status">` in one `<div>` below it.

From `lib/visitActions.ts` (used by the new home-visit test):

```ts
export function startFromHome(input: NewVisit, now: Date): Visit {
  return blankVisit(input, "home", now.toISOString());
}
```

From `components/staff/CheckInPanel.click.test.tsx` (not changed):

```tsx
/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

/** true when one of the button names in "quotes" in `text` is the start of a button on the screen. */
function namesAButtonOnScreen(text: string): boolean {
  const names = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return names.some((name) => button(name) !== undefined);
}
```

## Diff

```diff
diff --git a/components/staff/CheckInPanel.click.test.tsx b/components/staff/CheckInPanel.click.test.tsx
index 678d01e..2d3083c 100644
--- a/components/staff/CheckInPanel.click.test.tsx
+++ b/components/staff/CheckInPanel.click.test.tsx
@@ -8,7 +8,8 @@
 import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
-import { createDeskVisit } from "@/data/staffActions";
+import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
+import { startFromHome } from "@/lib/visitActions";
 import { CheckInPanel } from "./CheckInPanel";
 import { PAUSED_NOT_SAVED } from "./checkInText";
 
@@ -25,6 +26,7 @@ beforeEach(() => {
   document.body.appendChild(container);
   root = createRoot(container);
   vi.mocked(createDeskVisit).mockReset().mockResolvedValue("paused");
+  vi.mocked(checkInVisitFromHome).mockReset().mockResolvedValue("paused");
 });
 
 afterEach(() => {
@@ -41,6 +43,16 @@ function namesAButtonOnScreen(text: string): boolean {
   return names.some((name) => button(name) !== undefined);
 }
 
+/** Choose CTAS 4 (the first radio button) and tick all three checklist items. */
+function fillForm() {
+  const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
+  if (!radio) throw new Error("No CTAS radio button");
+  act(() => radio.click());
+  for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
+    act(() => box.click());
+  }
+}
+
 describe("CheckInPanel taps after a failed pause read", () => {
   it("a start at a site paused since the last good read shows the paused message", async () => {
     const onCreated = vi.fn();
@@ -58,13 +70,7 @@ describe("CheckInPanel taps after a failed pause read", () => {
         />,
       ),
     );
-    // CTAS 4 is the first radio button; then tick all three checklist items.
-    const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
-    if (!radio) throw new Error("No CTAS radio button");
-    act(() => radio.click());
-    for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
-      act(() => box.click());
-    }
+    fillForm();
 
     const start = button("Start off-site waiting");
     if (!start) throw new Error('No button "Start off-site waiting"');
@@ -96,5 +102,71 @@ describe("CheckInPanel taps after a failed pause read", () => {
     );
     expect(container.textContent).toContain(PAUSED_NOT_SAVED);
     expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
+
+    // The paused fallback button works: it saves the patient as waiting on-site (not_eligible).
+    const fallback = button("Waits on-site (off-site waiting paused)");
+    if (!fallback) throw new Error('No button "Waits on-site (off-site waiting paused)"');
+    expect(fallback.getAttribute("aria-disabled")).toBe("false");
+    await act(async () => fallback.click());
+    expect(createDeskVisit).toHaveBeenCalledTimes(2);
+    expect(vi.mocked(createDeskVisit).mock.calls[1][1]).toBe("not_eligible");
+  });
+
+  it("a home visit refused as paused shows the paused message and creates nothing", async () => {
+    const home = startFromHome({ id: "h", code: "HOME23", access_token: "tok", site: "A", language: "en" }, new Date());
+    const onHomeDone = vi.fn();
+    act(() =>
+      root.render(
+        <CheckInPanel
+          site="A"
+          onAttempt={() => {}}
+          onCreated={() => {}}
+          homeVisit={home}
+          homeProblem={null}
+          onHomeDone={onHomeDone}
+          offsitePaused={false}
+          pauseReadFailed={true}
+        />,
+      ),
+    );
+    fillForm();
+    const start = button("Start off-site waiting");
+    if (!start) throw new Error('No button "Start off-site waiting"');
+    await act(async () => start.click());
+
+    expect(checkInVisitFromHome).toHaveBeenCalledTimes(1);
+    expect(vi.mocked(checkInVisitFromHome).mock.calls[0][2]).toBe("waiting");
+    expect(createDeskVisit).not.toHaveBeenCalled();
+    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
+    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
+    expect(onHomeDone).not.toHaveBeenCalled();
+  });
+
+  it("Enter while the pause switch could not be read saves nothing and says so", async () => {
+    act(() =>
+      root.render(
+        <CheckInPanel
+          site="A"
+          onAttempt={() => {}}
+          onCreated={() => {}}
+          homeVisit={null}
+          homeProblem={null}
+          onHomeDone={() => {}}
+          offsitePaused={null}
+          pauseReadFailed={true}
+        />,
+      ),
+    );
+    fillForm();
+    const form = container.querySelector("form");
+    if (!form) throw new Error("No form");
+    // Enter in a form field submits the form, which asks for off-site waiting.
+    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
+
+    expect(createDeskVisit).not.toHaveBeenCalled();
+    const line = [...container.querySelectorAll('p[role="status"]')].map((p) => p.textContent).join(" ");
+    expect(line).toContain("Nothing was saved.");
+    expect(line).toContain("If the network is still down, no button can save.");
+    expect(namesAButtonOnScreen(line)).toBe(true);
   });
 });
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index 516702f..d07ca53 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -3,16 +3,16 @@
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it } from "vitest";
 import { CheckInPanel } from "./CheckInPanel";
-import { STALE_READ } from "./checkInText";
+import { READ_FAILED, STALE_READ } from "./checkInText";
 
-function render(offsitePaused: boolean | null, pauseReadFailed = false) {
+function render(offsitePaused: boolean | null, pauseReadFailed = false, homeProblem: string | null = null) {
   return renderToStaticMarkup(
     <CheckInPanel
       site="A"
       onAttempt={() => {}}
       onCreated={() => {}}
       homeVisit={null}
-      homeProblem={null}
+      homeProblem={homeProblem}
       onHomeDone={() => {}}
       offsitePaused={offsitePaused}
       pauseReadFailed={pauseReadFailed}
@@ -46,6 +46,8 @@ describe("CheckInPanel while the paused switch is not read", () => {
     const warning = "Warning: could not check just now whether off-site waiting is paused";
     expect(html).toContain("Start off-site waiting");
     expect(html).toContain(warning);
+    // The whole warning is on the page (static markup writes " as &quot;).
+    expect(html.replaceAll("&quot;", '"')).toContain(STALE_READ);
     // Screen readers hear the warning when it comes, and again on the button.
     expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*>Warning: could not check/);
     expect(html).toMatch(/<button[^>]*aria-describedby="stale-read-warning"[^>]*>Start off-site waiting<\/button>/);
@@ -62,7 +64,20 @@ describe("CheckInPanel while the paused switch is not read", () => {
   });
 
   it("the warning says what happens while the network is still down", () => {
-    expect(STALE_READ).toContain("If the network is still down, neither button can save.");
+    expect(STALE_READ).toContain("If the network is still down, no button can save.");
+  });
+
+  it("the read-failed text says what happens while the network is still down", () => {
+    expect(READ_FAILED).toContain("If the network is still down, no button can save.");
+    expect(render(null, true).replaceAll("&quot;", '"')).toContain(READ_FAILED);
+  });
+
+  it("shows no warning while the home visit has a problem", () => {
+    const html = render(false, true, "Visit HOME23 is no longer on this screen.");
+    expect(html).toContain("Visit HOME23 is no longer on this screen.");
+    expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*><\/p>/);
+    expect(html).not.toContain("aria-describedby");
+    expect(html).not.toContain("Start off-site waiting");
   });
 });
 
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 99dc365..629eafd 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -126,7 +126,7 @@ export function CheckInPanel({
       return;
     }
     if (outcome === "waiting" && onSiteOnly) {
-      setMessage(`${onSiteOnlyText(offsitePaused, pauseReadFailed)} Press "Waits on-site" instead.`);
+      setMessage(`${onSiteOnlyText(offsitePaused, pauseReadFailed)} Nothing was saved. Press "Waits on-site" instead.`);
       return;
     }
     if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
diff --git a/components/staff/checkInText.ts b/components/staff/checkInText.ts
index 205ba75..8662f55 100644
--- a/components/staff/checkInText.ts
+++ b/components/staff/checkInText.ts
@@ -7,16 +7,19 @@ export const PAUSED_NOT_SAVED =
   'Off-site waiting is paused at this site. Nothing was saved. Press "Not eligible" or "Waits on-site" so the patient waits on-site.';
 
 // The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
-export const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
+// If the network is down, the "Waits on-site" save fails too ("could not be reached").
+export const READ_FAILED =
+  "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. " +
+  "If the network is still down, no button can save.";
 
 // A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
 // If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
-// If the network is still down, every save fails with "could not be reached", on both buttons.
+// If the network is still down, every save fails with "could not be reached", on every button.
 // While the last good read said "not paused", the fallback button is labelled "Not eligible".
 export const STALE_READ =
   "Warning: could not check just now whether off-site waiting is paused. The last check said it was not paused. " +
   "The screen checks again every 5 seconds. If it was paused since then, a start will not be saved: " +
-  'press "Not eligible" so the patient waits on-site. If the network is still down, neither button can save.';
+  'press "Not eligible" so the patient waits on-site. If the network is still down, no button can save.';
 
 /** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
 export function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
diff --git a/docs/decisions.md b/docs/decisions.md
index 8da6904..8633841 100644
--- a/docs/decisions.md
+++ b/docs/decisions.md
@@ -58,7 +58,7 @@ One line each: date, decision, who decided, where it is written.
 - 2026-11-17: A visit cannot change site after it is made (`VWR01`). Owner (Gemini step check review, points 2 and 5).
 - 2026-11-17: The pause read in `visits_check_step` uses `for share`, so it waits for a pause that is being saved; `for key share` would not wait, because a pause is a non-key update. A missing settings row or an empty value counts as paused. Owner (Gemini step check review, points 6 and 8). Not checked: a run as a signed-in staff user (`for share` needs UPDATE on `site_settings`, which staff have).
 - 2026-11-17: Not changed after the Gemini step check review: time rules in the database (point 3, owner chose status moves only), and `waiting` to `called` while paused (point 11, recall must always work). Reasons in handoffs/archive/2026-11-16-gemini-review-allowed-steps.md.
-- 2026-11-17: When the pause switch was never read and the last read failed, check-in says "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds." and offers on-site waiting only. "Paused" wins over "read failed", because it is the safer fact. Owner (Haiku reviewer read, point 4). components/staff/CheckInPanel.tsx.
+- 2026-11-17: When the pause switch was never read and the last read failed, check-in says "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. If the network is still down, no button can save." and offers on-site waiting only (last sentence added 2026-11-17 after the Gemini check-in text review). If staff press Enter in that state, the message also says "Nothing was saved." "Paused" wins over "read failed", because it is the safer fact. Owner (Haiku reviewer read, point 4). components/staff/CheckInPanel.tsx.
 - 2026-11-17: `supabase/checks/allowed_steps.sql` runs `set local idle_in_transaction_session_timeout = '10s'` right after `begin;`. A failed run stops before `rollback;`, so Postgres ends that session after 10 seconds and its locks go. `set local` ends with the transaction, so no setting stays on a shared connection (replaces the session `set` and `reset`). The loud failure stays. Owner (Haiku reviewer read, point 1; Gemini review, point 2.1).
 - 2026-11-17: The sync test in `lib/allowedSteps.test.ts` also compares the error codes with `lib/saveResult.ts`, the whole pause check, and the 22 moves in the check file (between the "-- allowed moves" marker lines) with `ALLOWED_MOVES`. Owner (Haiku reviewer read, points 9 to 11).
 - 2026-11-17: The sync test reads the move list from inside the `not in (` move check as well as from the marker lines, so a second check or moved markers fail it. Owner (Gemini review, point 1.1).
```


## Response

Gemini Hydrogen 4, High, 2026-11-17. Pasted as received.

### Fallback Button Label (`"Waits on-site"` vs `"Waits on-site (off-site waiting paused)"`)

1. **Quoted button name does not match the full button label while `offsitePaused === true**`
* **Severity:** minor
* **File and line:** `components/staff/CheckInPanel.tsx`, line 129 and the fallback `<Button>` in the `{!homeProblem && ( ... )}` block; `components/staff/checkInText.ts`, lines 6–7
* **What goes wrong:** When `offsitePaused === true`, both `PAUSED_NOT_SAVED` (`Press "Not eligible" or "Waits on-site"`) and the Enter message (`Press "Waits on-site" instead.`) put `"Waits on-site"` in quotation marks, while the only button on screen reads `Waits on-site (off-site waiting paused)`. The red box directly above that button already says `Off-site waiting is paused at this site.`, so the parenthetical repeats the banner and makes busy triage staff scan twice for an exact label match (and breaks exact-name voice commands).
* **Concrete case:** Site A is paused (`offsitePaused === true`). Staff press Enter in the check-in form, read `Press "Waits on-site" instead.`, and look at a single button labelled `Waits on-site (off-site waiting paused)`.
* **Smallest fix:** Shorten the `offsitePaused === true` button label in `components/staff/CheckInPanel.tsx` to `"Waits on-site"` (matching `offsitePaused === null`, since the red box right above it already states that off-site waiting is paused).

---

### 1. Truth of Changed Messages Across States and Visit Types, and Offline Saving

1. **Enter message while `offsitePaused === true && pauseReadFailed === true` omits that the network is down**
* **Severity:** minor
* **File and line:** `components/staff/CheckInPanel.tsx`, line 129; `components/staff/checkInText.ts`, lines 25–29
* **What goes wrong:** Every changed message (`STALE_READ`, `READ_FAILED`, and the Enter message in all reachable `onSiteOnly` states for both desk and home visits) is factually true, and no save path in `CheckInPanel.tsx` queues writes offline (`createDeskVisit` and `checkInVisitFromHome` both call Supabase directly and fail when offline). However, when a site was confirmed paused (`offsitePaused === true`) and the network then drops (`pauseReadFailed === true`), `onSiteOnlyText` returns the paused string without the network-down sentence, so pressing Enter tells staff `Press "Waits on-site" instead.` without warning that the save will also fail while offline.
* **Concrete case:** Staff open check-in while Site A is paused (`offsitePaused === true`), lose Wi-Fi (`pauseReadFailed === true`), press Enter, and see `Off-site waiting is paused at this site. The patient waits on-site. Nothing was saved. Press "Waits on-site" instead.` with no warning that `"Waits on-site"` cannot save while the network is down.
* **Smallest fix:** In `onSiteOnlyText` (`components/staff/checkInText.ts`, line 26), append `" If the network is still down, no button can save."` when `offsitePaused === true && pauseReadFailed === true`.

---

### 2. Clarity and Order of the Enter Message

1. **`"Nothing was saved."` is buried after `"The patient waits on-site."` and the network caveat**
* **Severity:** should fix
* **File and line:** `components/staff/CheckInPanel.tsx`, line 129
* **What goes wrong:** When `offsitePaused === null && pauseReadFailed === true`, pressing Enter sets the status line to:
`Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. If the network is still down, no button can save. Nothing was saved. Press "Waits on-site" instead.`
`"The patient waits on-site."` (sentence 2) reads like a completed action, and `"Nothing was saved."` is buried at sentence 5—after polling details and `"no button can save."`, which immediately precedes `'Press "Waits on-site" instead.'` In addition, the red box above the buttons already renders the full `onSiteOnlyText`, so repeating all four sentences before `"Nothing was saved."` duplicates the block visually and makes screen readers read four sentences before announcing that nothing happened.
* **Concrete case:** Initial pause read fails on a slow/down connection (`offsitePaused === null, pauseReadFailed === true`). Staff press Enter, read `The patient waits on-site.` at the start of the status line, and move on to the next patient without reaching sentence 5 (`Nothing was saved.`).
* **Smallest fix:** Put `"Nothing was saved."` and the action first in `components/staff/CheckInPanel.tsx` line 129:

```tsx
setMessage(`Nothing was saved. Press "Waits on-site" instead. ${onSiteOnlyText(offsitePaused, pauseReadFailed)}`);
```

---

### 3. New Tests Passing While the Panel Is Wrong

1. **`CheckInPanel.test.tsx` misses `STALE_READ` on home visits, element placement of `READ_FAILED`, and leftover buttons when `homeProblem` is set**
* **Severity:** should fix
* **File and line:** `components/staff/CheckInPanel.test.tsx`, lines 49–50, 70–73, and 75–81
* **What goes wrong:**
* **Home visit `STALE_READ`:** `render()` always passes `homeVisit={null}`. Changing `staleRead` in `CheckInPanel.tsx` to `offsitePaused === false && pauseReadFailed && !homeVisit` would hide the warning on every home visit while all tests still pass.
* **`READ_FAILED` placement:** Line 72 checks `expect(render(null, true)...).toContain(READ_FAILED)` against the whole HTML string. Moving `READ_FAILED` out of the red box into `#stale-read-warning` (or plain unstyled text) would still pass.
* **`homeProblem` button hiding:** Line 80 checks only `expect(html).not.toContain("Start off-site waiting")`. Moving only `"Start off-site waiting"` inside `{!homeProblem && ...}` while leaving `"Offered, declined"` and `"Not eligible"` rendered on a broken home visit would still pass.
* **Concrete case:** Someone edits `CheckInPanel.tsx` so `{!homeProblem && ...}` wraps only `"Start off-site waiting"` instead of the whole button group; `npm test` remains green even though `"Offered, declined"` and `"Not eligible"` appear for a missing home visit.
* **Smallest fix:** In `components/staff/CheckInPanel.test.tsx`, assert `expect(html).not.toContain("Not eligible")` and `expect(html).not.toContain("Offered, declined")` in the `homeProblem` test (lines 75–81), assert `READ_FAILED` is inside the red-box `<p>` (lines 70–73), and add a `render` check with a non-null `homeVisit` for `STALE_READ`.

2. **`CheckInPanel.click.test.tsx` never verifies a successful fallback save, Enter while `offsitePaused === true`, or message ordering**
* **Severity:** should fix
* **File and line:** `components/staff/CheckInPanel.click.test.tsx`, lines 28, 106–112, 115–143, and 166–170
* **What goes wrong:**
* **Fallback click still mocks `"paused"`:** Line 28 sets `createDeskVisit` to resolve to `"paused"`, and lines 106–112 never override that mock before clicking `"Waits on-site (off-site waiting paused)"`. The second call returns `"paused"` again, so the test never verifies that a successful `"not_eligible"` save clears `PAUSED_NOT_SAVED`, resets the form, or calls `onCreated`.
* **Home visit fallback untested:** Lines 115–143 never click the fallback button on a home visit; if clicking it called `createDeskVisit` instead of `checkInVisitFromHome`, the test would still pass.
* **Enter while `offsitePaused === true` and message order untested:** Lines 166–170 use unordered `.toContain(...)` assertions and only test `offsitePaused === null`. Changing `if (outcome === "waiting" && onSiteOnly)` to `if (outcome === "waiting" && offsitePaused === null)` (allowing Enter to submit `waiting` while `offsitePaused === true`) or putting `'Press "Waits on-site" instead.'` before `"Nothing was saved."` would still pass.
* **Concrete case:** A refactor changes line 128 of `CheckInPanel.tsx` to `if (outcome === "waiting" && offsitePaused === null)`; all 322 tests pass while pressing Enter on a paused site (`offsitePaused === true`) attempts an off-site save.
* **Smallest fix:** In `components/staff/CheckInPanel.click.test.tsx`, mock `createDeskVisit.mockResolvedValueOnce(fakeVisit)` before `fallback.click()` and assert `onCreated` was called and `PAUSED_NOT_SAVED` cleared; add a second test case for Enter when `offsitePaused === true`; and assert `"Nothing was saved."` appears before `'Press "Waits on-site" instead.'`.

---

### 4. Codebase Rules (One Job per File, <= 300 Lines, Straight Quotes, Beginner Readability)

1. **Test comment and mock mismatch in `CheckInPanel.click.test.tsx` can mislead a beginner**
* **Severity:** minor
* **File and line:** `components/staff/CheckInPanel.click.test.tsx`, lines 106–112 and line 164
* **What goes wrong:** One job per file, file length (`checkInText.ts` 30, `CheckInPanel.tsx` 273, `CheckInPanel.test.tsx` 92, `CheckInPanel.click.test.tsx` 172), and straight ASCII quotes all pass. However, in `CheckInPanel.click.test.tsx` line 106, the comment says `"it saves the patient as waiting on-site (not_eligible)"` while `createDeskVisit` is still mocked to return `"paused"` (so the save is actually refused in the test), and line 164 dispatches a synthetic `"submit"` event on `<form>` without noting that real-browser Enter submission when the submit button is hidden relies on the form having at most one text input.
* **Concrete case:** A beginner copies the fallback click test expecting `onCreated` to fire or adds a second text `<input>` to `CheckInPanel`, breaking real-browser Enter submission while the synthetic `dispatchEvent(new Event("submit"))` test still passes.
* **Smallest fix:** Update the mock in `CheckInPanel.click.test.tsx` line 109 to return a `Visit` so the comment and behavior match, and add a one-line comment on line 164 noting the single-text-input HTML implicit-submit rule.

## My check of the response

Checked against `components/staff/CheckInPanel.tsx` (273 lines) and `components/staff/checkInText.ts` (30 lines) on 2026-11-17.

- Label (shorten "Waits on-site (off-site waiting paused)"): this is the second review that asks for it. It is a product decision, so I ask the owner. The label is used in `CheckInPanel.tsx` line 252 and in the click test; the record message on line 146 ("waiting on-site (off-site waiting paused)") is a separate text. The new tests find the button by "Waits on-site", so they work with either label.
- 1.1: accepted. In the state `offsitePaused` `true` and `pauseReadFailed` `true`, the red box and the Enter message do not say that no button can save. The fix goes in `onSiteOnlyText`, so the red box gets it too.
- 2.1: accepted. The Enter message starts with "Nothing was saved. Press "Waits on-site" instead.", then the red-box text.
- 3.1: accepted, all three: the `homeProblem` test checks that no action button is on the page; `READ_FAILED` is checked inside the red box `<p>`; a home visit render checks `STALE_READ`.
- 3.2: accepted, all three: the fallback press after a refusal now gets a saved visit (`checkInAtDesk` from `lib/visitActions.ts`) and checks `onCreated`, that the paused message is gone, and the record message; a home visit fallback press checks `checkInVisitFromHome` gets `not_eligible`; a new Enter test at `offsitePaused` `true`; both Enter tests check the order.
- 4.1: accepted. The mock mismatch is fixed by 3.2. The comment on the submit event says that the test does not show what a real browser does on Enter. The form has no text field (radio buttons, checkboxes and one select), and the Start button is not on the page while only on-site waiting is offered, so a real browser may or may not submit. The guard in `finish` is there for the case that it does. Not checked in a real browser.

## Result

- Tests first (save point 88d2f36, 3 failed), then the fix (d85226c): 1.1, 2.1, 3.1, 3.2 and 4.1 done. 57 test files, 325 tests passed, lint clean, build passed.
- Label point: the owner chose to shorten it. Test first (bed3a08, failed), then the fix (8b86450): the paused fallback button says "Waits on-site". The saved-result line keeps "(off-site waiting paused)". 57 test files, 326 tests passed, lint clean, build passed.
- Next review: the owner chose the Haiku reviewer worker for these changes, not a fourth Gemini loop.
