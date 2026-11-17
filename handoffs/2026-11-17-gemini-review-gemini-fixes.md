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
