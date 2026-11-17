# Gemini review: the 4 fixes after the Gemini review of the Haiku reviewer fixes

Model: Gemini Hydrogen 4, High, in a new chat. (If no Hydrogen 4 credits: Gemini 3.6 Flash, High.)

## Text to paste

You review a small diff in a Next.js and Supabase prototype (synthetic data only). Find problems. Do not confirm that it is fine. For each problem, give the file and line, what goes wrong, a concrete case, and the smallest fix, with a severity (must fix, should fix, minor).

The 4 fixes:
1. `supabase/checks/allowed_steps.sql`: the 10 second `idle_in_transaction_session_timeout` is now `set local` right after `begin;`, and the `reset` line is gone. The script runs in the Supabase SQL Editor and ends with `rollback;`.
2. `lib/allowedSteps.test.ts`: the test reads the allowed move pairs from inside the `(old.status, new.status) not in (...)` check in the newest trigger migration, and compares them with `ALLOWED_MOVES`.
3. `components/staff/CheckInPanel.tsx`: `finish` uses the same helper as the red box for the paused, read failed and not read yet text.
4. `components/staff/CheckInPanel.tsx`: when the last good read said "not paused" and a later read failed, an amber line warns staff and "Start off-site waiting" stays. The database trigger refuses a start at a paused site with SQLSTATE `VWR02`, and the panel then shows "Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved."

Questions:
- Is `set local` after `begin;` right for the case where a later statement fails? Does any statement before `begin;` still need the limit?
- Can the move regex in fix 2 still match the wrong list, or miss a change that Postgres would act on?
- Is the warning text in fix 4 clear and true for staff at a triage desk? Is a warning with no hide the right choice? Is anything missing for screen readers?
- Does any file break the rules: one job per file, no file over 300 lines, straight quotes, readable for a beginner?

The diff:

```diff
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index 4e8a220..bae6405 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -39,6 +39,13 @@ describe("CheckInPanel while the paused switch is not read", () => {
     const html = render(false);
     expect(html).toContain("Start off-site waiting");
   });
+
+  it("warns that the last read failed but still offers off-site waiting", () => {
+    const html = render(false, true);
+    expect(html).toContain("Start off-site waiting");
+    expect(html).toContain("Could not read the pause switch just now");
+    expect(render(false, false)).not.toContain("Could not read the pause switch just now");
+  });
 });
 
 describe("CheckInPanel while off-site waiting is paused", () => {
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 0f0877d..fcae5dc 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -23,6 +23,12 @@ const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits
 // The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
 const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
 
+// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
+// If the site was paused meanwhile, the database refuses the start (VWR02) and PAUSED_NOT_SAVED shows.
+const STALE_READ =
+  "Could not read the pause switch just now. The last read said off-site waiting is not paused. " +
+  "The screen tries again every 5 seconds. If the site is paused now, the start is not saved and the screen says so.";
+
 /** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
 function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
   // Paused comes first: it is the safer fact, even when a later read failed.
@@ -135,13 +141,7 @@ export function CheckInPanel({
       return;
     }
     if (outcome === "waiting" && onSiteOnly) {
-      setMessage(
-        offsitePaused === true
-          ? 'Off-site waiting is paused at this site. Press "Waits on-site" instead.'
-          : pauseReadFailed
-            ? `${READ_FAILED} Press "Waits on-site" instead.`
-            : 'Checking whether off-site waiting is paused. Press "Waits on-site" instead.',
-      );
+      setMessage(`${onSiteOnlyText(offsitePaused, pauseReadFailed)} Press "Waits on-site" instead.`);
       return;
     }
     if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
@@ -251,9 +251,16 @@ export function CheckInPanel({
               {onSiteOnlyText(offsitePaused, pauseReadFailed)}
             </p>
           ) : (
-            <Button type="submit" aria-disabled={saving}>
-              Start off-site waiting
-            </Button>
+            <>
+              {pauseReadFailed && (
+                <p className="w-full rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950">
+                  {STALE_READ}
+                </p>
+              )}
+              <Button type="submit" aria-disabled={saving}>
+                Start off-site waiting
+              </Button>
+            </>
           )}
           {/* While paused nobody can be offered off-site waiting, so "Offered, declined" would count
               a patient as offered by mistake. "Waits on-site" records not_eligible, which leaves the
diff --git a/lib/allowedSteps.test.ts b/lib/allowedSteps.test.ts
index e25b362..28dde1f 100644
--- a/lib/allowedSteps.test.ts
+++ b/lib/allowedSteps.test.ts
@@ -121,9 +121,12 @@ describe("allowed status moves", () => {
     // The site check refuses with the step code.
     const siteRefusal = /if\s+new\.site\s+is\s+distinct\s+from\s+old\.site\s+then\s+raise\s+exception\s+'[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
     expect(code.match(siteRefusal)?.[1]).toBe(STEP_REFUSED);
-    // The move check is "not in (" a list, and its refusal uses the step code.
-    const moveRefusal = /if\s*\(\s*old\.status\s*,\s*new\.status\s*\)\s+not\s+in\s*\([\s\S]*?\)\s*then\s+raise\s+exception\s+'A visit cannot move[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
-    expect(code.match(moveRefusal)?.[1]).toBe(STEP_REFUSED);
+    // The move check is "not in (" a list, its list is the same as lib (read from the check itself,
+    // not from the markers), and its refusal uses the step code.
+    const moveRefusal = /if\s*\(\s*old\.status\s*,\s*new\.status\s*\)\s+not\s+in\s*\(([\s\S]*?)\)\s*then\s+raise\s+exception\s+'A visit cannot move[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
+    const move = code.match(moveRefusal);
+    expect([...(move?.[1] ?? "").matchAll(PAIR)].map((m) => `${m[1]}>${m[2]}`).sort()).toEqual(inLib);
+    expect(move?.[2]).toBe(STEP_REFUSED);
     // The pause check: a new off-site wait, or a triage into one, reads the pause "for share" and refuses with the pause code.
     const pauseCheck = /if\s+new\.status\s*=\s*'waiting'\s+and\s*\(\s*tg_op\s*=\s*'INSERT'\s+or\s+old\.status\s+in\s*\(([^)]*)\)\s*\)\s*then\s+select\s+offsite_paused\s+into\s+site_paused\s+from\s+public\.site_settings\s+where\s+site\s*=\s*new\.site\s+for\s+share\s*;\s*if\s+site_paused\s+is\s+distinct\s+from\s+false\s+then\s+raise\s+exception\s+'[^']*'\s*,\s*new\.site\s+using\s+errcode\s*=\s*'(\w+)'/i;
     const pause = code.match(pauseCheck);
diff --git a/supabase/checks/allowed_steps.sql b/supabase/checks/allowed_steps.sql
index 2d773fc..159e97e 100644
--- a/supabase/checks/allowed_steps.sql
+++ b/supabase/checks/allowed_steps.sql
@@ -22,13 +22,14 @@
 --   7N  desk, waiting at site B after site B's settings row is deleted: counts as paused
 --   8x  one visit for each of the 22 allowed moves (rows 101 to 122)
 
--- If the last block stops with an error, the "rollback" line does not run and the transaction
--- stays open with locks on site_settings and visits. This timeout makes Postgres end such a
--- session after 10 seconds, which undoes everything and frees the locks.
-set idle_in_transaction_session_timeout = '10s';
-
 begin;
 
+-- If the last block stops with an error, the "rollback" line does not run and the transaction
+-- can stay open with locks on site_settings and visits. This timeout makes Postgres end such a
+-- session after 10 seconds, which undoes everything and frees the locks. "set local" ends with
+-- this transaction (on rollback or on an error), so no setting stays on a shared connection.
+set local idle_in_transaction_session_timeout = '10s';
+
 -- Tries one change. Any other error stops the whole run (and still saves nothing).
 create function pg_temp.try_step(p_sql text) returns text
 language plpgsql as $$
@@ -215,4 +216,3 @@ end;
 $$;
 
 rollback;
-reset idle_in_transaction_session_timeout;
```

Bring back: the full answer, pasted into this chat.

## Response

Gemini Hydrogen 4, High, 2026-11-17, pasted by the owner. The owner also said: "SQL Editor Result was fine, no errors" (the check file run after `fd24d05`).

### Problems Found

1. Missing live region, `aria-describedby`, and layout stability on the stale-read amber warning. Severity: must fix.
* File and line: `components/staff/CheckInPanel.tsx`, lines 254-262
* What goes wrong: When a background 5-second poll fails after an earlier `"not paused"` read (`pauseReadFailed` flips from `false` to `true`), `STALE_READ` mounts as a plain `<p>` with no `role="status"` (or `aria-live="polite"`) and no `aria-describedby` linking it to `"Start off-site waiting"`. Screen readers never announce the warning when it appears, and keyboard/screen-reader users tabbing straight to `"Start off-site waiting"` skip past the `<p>` without hearing the warning. In addition, rendering `{pauseReadFailed && <p ...>}` above `<Button type="submit">` shifts the submit buttons vertically whenever a flaky connection alternates between failing and recovering.
* Concrete case: A triage clerk using NVDA or VoiceOver ticks the checklist while Site A is unpaused; a 5-second poll fails (`pauseReadFailed = true`), injecting the amber `<p>` above the button silently. Pressing Tab to `"Start off-site waiting"` reads only `"Start off-site waiting, button"` with no mention of the stale read.
* Smallest fix: Render a persistent `<div role="status" className="w-full">` below the button row (so VoiceOver/NVDA registers the live region before text appears and buttons do not jump mid-click), give the `<p>` `id="pause-stale-warning"`, and set `aria-describedby={pauseReadFailed ? "pause-stale-warning" : undefined}` on `<Button type="submit">`.

2. `moveRefusal` regex can span across `if` blocks, match `/* ... */` comments or earlier function definitions, and miss extra Postgres guards. Severity: should fix.
* File and line: `lib/allowedSteps.test.ts`, lines 126-129
* What goes wrong:
* `([\s\S]*?)` matches across `;` and `end if;`, so if an earlier `if (old.status, new.status) not in (...)` exists in the function, `move[1]` concatenates both lists.
* `code.match(moveRefusal)` takes the first match in the migration file without stripping `/* ... */` block comments, so a commented-out `/* if (old.status, new.status) not in (...) ... */` block or an earlier `CREATE OR REPLACE FUNCTION` in the same file is matched instead of the final active function that Postgres executes.
* Any extra guard added outside that single `not in (...)` list (for example, a separate `if old.status = 'arrived' and new.status = 'waiting' then raise exception ...`) leaves `not in (...)` unchanged so the test passes while Postgres blocks an allowed move; conversely, valid Postgres tuple syntax like `row('a', 'b')` or `'a'::text` inside `not in (...)` is silently skipped by `.matchAll(PAIR)`.
* If `move` is `null`, `move?.[1] ?? ""` silently falls back to `[]` instead of failing on `expect(move).not.toBeNull()`.
* Concrete case: A future migration comments out the old 22-pair `if` check with `/* ... */` above a new `if` block that accidentally omits `('arrived', 'waiting')`, or adds a separate `if` rejecting a move. `npm test` still passes while Undo for arrived patients fails in Postgres.
* Smallest fix: Strip `/*[\s\S]*?*/` comments alongside `--` comments in `code`, slice to the last `create or replace function public.visits_check_step()[\s\S]*?\$\$;` body before matching, assert `expect(move).not.toBeNull()`, and keep all move pairs in that single `not in (...)` list.

3. `STALE_READ` uses internal jargon ("pause switch", "the start") and overpromises what happens on save failure. Severity: should fix.
* File and line: `components/staff/CheckInPanel.tsx`, lines 26-30
* What goes wrong: `"Could not read the pause switch just now. ... If the site is paused now, the start is not saved and the screen says so."` uses developer terms (`pause switch`, `the start`) instead of triage-desk language, and promises the screen will say the site is paused if it is paused now, even though if the same network outage that broke the pause poll is still active when staff submit, Supabase returns a network error (`"could not be reached"`) rather than `VWR02`.
* Concrete case: Triage desk Wi-Fi drops: a background poll fails (`STALE_READ` shows), the charge nurse pauses the site from another computer, and the triage clerk clicks `"Start off-site waiting"` while still offline. The save fails with `"Not saved: the database could not be reached"` rather than saying the site is paused, contradicting `"the screen says so."`
* Smallest fix: Replace `STALE_READ` with: `'Warning: could not check whether off-site waiting is paused just now (last check: not paused). Retrying every 5 seconds. If off-site waiting was just paused, it will not be saved - press "Waits on-site" instead.'`

4. `finish` concatenates `READ_FAILED` ("The patient waits on-site.") with `Press "Waits on-site" instead.`, producing contradictory text. Severity: should fix.
* File and line: `components/staff/CheckInPanel.tsx`, lines 24 and 144
* What goes wrong: `READ_FAILED` (line 24) ends with `"The patient waits on-site. The screen tries again every 5 seconds."` Reusing `onSiteOnlyText` inside `finish` (line 144) produces `"Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. Press "Waits on-site" instead."`, simultaneously stating in present tense that the patient waits on-site (as if already saved) and telling staff to press `"Waits on-site"` because nothing was saved yet (unlike `PAUSED_NOT_SAVED`, which explicitly ends with `"Nothing was saved."`).
* Concrete case: While `offsitePaused === null` and `pauseReadFailed === true`, a clerk presses Enter inside a form field (submitting with default `outcome = "waiting"`). `finish` displays both `"The patient waits on-site."` and `'Press "Waits on-site" instead.'`
* Smallest fix: Have `onSiteOnlyText` return only the state reason (without `"The patient waits on-site."` when building the `finish` message) so `finish` sets `${reason} Press "Waits on-site" instead. Nothing was saved.`

5. New stale-read test does not verify `VWR02` (`"paused"`) refusal on submit. Severity: should fix.
* File and line: `components/staff/CheckInPanel.test.tsx`, lines 43-48
* What goes wrong: The new test checks only static HTML output for `render(false, true)` and `render(false, false)`. It never submits `"Start off-site waiting"` when `(offsitePaused = false, pauseReadFailed = true)` and `createDeskVisit` returns `"paused"`, leaving the second half of Fix 4 (`PAUSED_NOT_SAVED` appearing on `VWR02`) untested.
* Concrete case: Someone breaks the `visit === "paused"` branch in `CheckInPanel.tsx` so `PAUSED_NOT_SAVED` no longer renders after a failed stale-read start, and `CheckInPanel.test.tsx` still passes.
* Smallest fix: Add a click test in `components/staff/CheckInPanel.test.tsx` that renders `(false, true)`, ticks the checklist, submits `"Start off-site waiting"` with `createDeskVisit` resolving to `"paused"`, and asserts `PAUSED_NOT_SAVED` is shown.

6. `CheckInPanel.tsx` crowds/exceeds the 300-line rule and mixes pause-notice rules with form UI. Severity: minor.
* File and line: `components/staff/CheckInPanel.tsx`, lines 23-38 and 251-266
* What goes wrong: Adding 7 net lines in Hunk 3 pushes `CheckInPanel.tsx` (whose button group already reaches line 266 before the remaining buttons, status region, and closing tags) right to or over the 300-line ceiling, while keeping pause-status copy/selection inside the check-in form component.
* Concrete case: Any small addition to `CheckInPanel.tsx` violates the 300-line rule (or it is already over 300 lines).
* Smallest fix: Move `PAUSED_NOT_SAVED`, `READ_FAILED`, `STALE_READ`, and `onSiteOnlyText` (or a small `CheckInPauseNotice` component) into `components/staff/checkInPause.ts`, keeping `CheckInPanel.tsx` well under 300 lines with one job.

7. `SET LOCAL` is silently ignored if run without `begin;`, and comment muddies Postgres transaction-abort timing. Severity: minor.
* File and line: `supabase/checks/allowed_steps.sql`, lines 25-31
* What goes wrong: In the Supabase SQL Editor, highlighting from line 31 downward (skipping `begin;` on line 25) causes Postgres to emit a warning (`SET LOCAL can only be used in transaction blocks`) and leave `idle_in_transaction_session_timeout` unset. Also, lines 27-30 say `"set local" ends with this transaction (on rollback or on an error)`, which can confuse a beginner: an uncaught error does not end the transaction immediately; it leaves the session in `idle in transaction (aborted)` holding `ACCESS EXCLUSIVE` locks until either `rollback;` runs or the 10-second timeout terminates the connection.
* Concrete case: A developer highlights from the comment at line 27 to the end of the file in the SQL Editor, skipping `begin;`, and hits an error; `SET LOCAL` was ignored, so no 10-second timeout frees the session locks.
* Smallest fix: Keep `begin;` and `set local idle_in_transaction_session_timeout = '10s';` on consecutive lines with a note (`-- Run the whole file together from begin; to rollback;`) and reword the comment to `(when rollback runs, or when this 10-second timeout ends an errored session)`.

### Answers to the Four Questions

1. Is `set local` after `begin;` right for the case where a later statement fails? Does any statement before `begin;` still need the limit?
* Yes, `set local` right after `begin;` is right when a later statement fails: In PostgreSQL, an uncaught error inside an explicit transaction block puts the session into the `idle in transaction (aborted)` state; the transaction is still open and still holds its locks until `rollback;` runs or the connection closes. Because the transaction has not ended yet, `SET LOCAL idle_in_transaction_session_timeout = '10s'` remains active during that aborted state and terminates the session after 10 seconds if the SQL Editor stops on the failing statement without running `rollback;`. Once `rollback;` runs (or the timeout closes the connection), `SET LOCAL` is discarded automatically without needing `reset`, so it cannot leak onto a pooled connection.
* No statement before `begin;` needs the limit: Lines 1-24 of `supabase/checks/allowed_steps.sql` are purely SQL comments (`-- ...`); `begin;` on line 25 is the first executable statement.

2. Can the move regex in fix 2 still match the wrong list, or miss a change that Postgres would act on?
* Yes, both:
* Match the wrong list: `([\s\S]*?)` can span across `;` and `end if;` if an earlier `if (old.status, new.status) not in (...)` exists in the function, merging two lists; and `code.match(moveRefusal)` takes the first match in the file without stripping `/* ... */` block comments, so it can match a commented-out `/* ... */` block or an earlier `CREATE OR REPLACE FUNCTION` rather than the last active function Postgres runs.
* Miss a change Postgres acts on: Any extra `if` / `elsif` or `or` condition added outside that single `not in (...)` list (e.g., blocking a specific pair separately) leaves `not in (...)` untouched so the test passes while Postgres rejects an allowed move; and valid Postgres tuple forms like `row('a', 'b')` or `'a'::text` casts inside `not in (...)` are silently skipped by `.matchAll(PAIR)`.

3. Is the warning text in fix 4 clear and true for staff at a triage desk? Is a warning with no hide the right choice? Is anything missing for screen readers?
* Clear and true: Mostly true for the happy/VWR02 path, but not clear or fully true at a triage desk: `"pause switch"` and `"the start"` are internal developer phrasing, `"If the site is paused now, the start is not saved and the screen says so"` is untrue if the same network outage persists on submit (which shows `"could not be reached"` instead of `"paused"`), and the 4-sentence block is overly wordy for a busy desk.
* Warning with no hide: Yes, non-dismissible is the right choice because the read failure is still active until a subsequent 5-second poll succeeds (which automatically clears it), and hiding it on a shared triage workstation would hide stale status from the next clerk. However, placing it above `"Start off-site waiting"` causes layout shift when polls flap; place it below the buttons.
* Missing for screen readers: Yes, three things: (1) a persistent `role="status"` / `aria-live="polite"` container so screen readers announce the warning when `pauseReadFailed` turns `true` in the background; (2) `aria-describedby` on `"Start off-site waiting"` pointing to the warning's `id` so keyboard/screen-reader users tabbing straight to the button hear it; and (3) an explicit `"Warning:"` text prefix rather than relying on amber styling alone.

4. Does any file break the rules: one job per file, no file over 300 lines, straight quotes, readable for a beginner?
* Straight quotes: Clean across all four files in the diff (`'` and `"` only; no curly quotes).
* No file over 300 lines and one job per file: `components/staff/CheckInPanel.tsx` is right at or slightly over the 300-line ceiling (Hunk 3 spans lines 251-266 before the remaining buttons, status output, and closing tags) and mixes pause-status copy/rules (`PAUSED_NOT_SAVED`, `READ_FAILED`, `STALE_READ`, `onSiteOnlyText`) with form rendering and submission. The other three files stay well under 300 lines with one clear job each.
* Readable for a beginner: Mostly clear, except `lib/allowedSteps.test.ts` line 128 (`[...(move?.[1] ?? "").matchAll(PAIR)].map(...)` without a prior `expect(move).not.toBeNull()`) and the `STALE_READ` / `allowed_steps.sql` comment wording noted above.
