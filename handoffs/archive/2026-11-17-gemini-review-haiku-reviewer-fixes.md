# Gemini review: fixes after the Haiku reviewer read of the step checks (2026-11-17)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Paste everything from "Text to paste" to the end of this file (before any "Response" heading).

## Text to paste

You are reviewing a small change in a concept prototype: a virtual ER waiting room (Next.js App Router, Supabase Postgres, vitest). The data is synthetic only. Low-acuity patients (CTAS 4 or 5) wait off-site after triage and return when staff recall them. Staff can pause off-site waiting per site. While a site is paused, the database trigger `visits_check_step` refuses a new or triaged `waiting` visit with error code `VWR02`. A bad status move or a change of site gives `VWR01`. `lib/saveResult.ts` maps `VWR02` to `"paused"`, `VWR01` to `"refused"`, and any other error to `"not_saved"`.

Your job is to find problems, not to confirm that the change is good. For each problem, give the file and line, what goes wrong, a concrete case that shows it, and how severe it is (must fix, should fix, minor). If you find nothing in an area, say so in one line.

The change has 4 parts:

1. Stronger sync test (`lib/allowedSteps.test.ts`). It reads the newest migration that makes `visits_check_step` as text. It checks that each `raise` uses the code from `lib/saveResult.ts`, that the move check is `(old.status, new.status) not in (`, and that the pause check has its full shape (`for share`, `is distinct from false`, and a list equal to `TRIAGE_STATUSES`). A new test reads the 22 allowed moves in `supabase/checks/allowed_steps.sql` between two marker lines and compares them with `ALLOWED_MOVES`.
2. Check file (`supabase/checks/allowed_steps.sql`). It sets `idle_in_transaction_session_timeout = '10s'` before `begin;` and resets it after `rollback;`. The file raises an error at the end if any row is not ok, so on a failed run `rollback;` does not run. The timeout must then end the session so its locks go.
3. Small fixes. These are straight quotes in staff text and "Saving..." with three periods. Also, `createDeskVisit` in `data/staffActions.ts` now uses `resultForError` and can return `"refused"`, so the check-in panel says "Not saved: the database refused this check-in. Nothing was recorded." in place of "could not be reached".
4. Failed pause read (`components/staff/CheckInPanel.tsx`, `app/staff/page.tsx`). `useSitePauses()` returns `{ pauses, failed }`. `pauses` is null until the first read works. It reads again after 5 seconds while reads fail. The panel gets a new prop `pauseReadFailed`. Off-site waiting is offered only when `offsitePaused === false`. The red box text is chosen in this order: paused, then read failed, then not read yet.

Results already in hand: 314 tests, lint and build pass. The owner ran the check file in the Supabase SQL Editor after part 2: 49 rows, all ok, no error. Mutation tries on the sync test (`in (`, `VWR03`, `for key share`, `= false`) each made it fail.

Not checked: how the Supabase SQL Editor ends a session that stops inside a transaction. Also not checked is the two-tab browser check (one tab pauses the site, the other tries "Start off-site waiting").

Questions:
1. Can the sync test still pass while the trigger and `lib/allowedSteps.ts` or `lib/saveResult.ts` disagree? Give a concrete edit to the migration or the check file that it would miss.
2. Does the session timeout do what is claimed in the SQL Editor (it runs each script through a pooled connection)? Can the `set` or `reset` itself cause a problem, for example on a connection pooler in transaction mode?
3. In `CheckInPanel`, is there any state of `offsitePaused` and `pauseReadFailed` where staff see the wrong text, or can start off-site waiting when they must not? Look at the `finish` messages, the red box, the third button label and the success message.
4. Is `"refused"` the right result and text for a desk check-in that the database refuses with `VWR01`? Is there any error that now maps to the wrong message?
5. Anything against these rules: one job per file, no file over 300 lines, straight quotes in screen text, code readable for a beginner.

The diff (from save point `84ff21e` to the current save point; docs and handoff files left out):

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 5b63b26..cc57b18 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -26,7 +26,7 @@ import { useNow } from "@/components/useNow";
 export default function StaffPage() {
   const { visits, outOfDate } = useVisits();
   const now = useNow();
-  const { pauses } = useSitePauses();
+  const { pauses, failed: pauseReadFailed } = useSitePauses();
   const [site, setSite] = useState<Site>("A");
   const [slip, setSlip] = useState<Visit | null>(null);
   const [announcement, setAnnouncement] = useState("");
@@ -113,6 +113,7 @@ export default function StaffPage() {
             homeVisit={homeVisit}
             homeProblem={homeProblem}
             offsitePaused={paused}
+            pauseReadFailed={pauseReadFailed}
             onHomeDone={() => setHomeVisit(null)}
           />
           {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index ae401a3..4e8a220 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -4,7 +4,7 @@ import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it } from "vitest";
 import { CheckInPanel } from "./CheckInPanel";
 
-function render(offsitePaused: boolean | null) {
+function render(offsitePaused: boolean | null, pauseReadFailed = false) {
   return renderToStaticMarkup(
     <CheckInPanel
       site="A"
@@ -14,6 +14,7 @@ function render(offsitePaused: boolean | null) {
       homeProblem={null}
       onHomeDone={() => {}}
       offsitePaused={offsitePaused}
+      pauseReadFailed={pauseReadFailed}
     />,
   );
 }
@@ -26,6 +27,14 @@ describe("CheckInPanel while the paused switch is not read", () => {
     expect(html).toContain("Checking whether off-site waiting is paused");
   });
 
+  it("says the pause switch could not be read when the read failed", () => {
+    const html = render(null, true);
+    expect(html).not.toContain("Start off-site waiting");
+    expect(html).not.toContain("Offered, declined");
+    expect(html).not.toContain("Checking whether off-site waiting is paused");
+    expect(html).toContain("Could not read whether off-site waiting is paused. The patient waits on-site.");
+  });
+
   it("offers off-site waiting once the switch is read as not paused", () => {
     const html = render(false);
     expect(html).toContain("Start off-site waiting");
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index f2cbf27..0f0877d 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -20,6 +20,17 @@ const CHECKLIST = [
 // The database refused off-site waiting because the site was paused on another screen.
 const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.';
 
+// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
+const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";
+
+/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
+function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
+  // Paused comes first: it is the safer fact, even when a later read failed.
+  if (offsitePaused) return "Off-site waiting is paused at this site: the patient waits on-site.";
+  if (pauseReadFailed) return READ_FAILED;
+  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
+}
+
 type Props = {
   site: Site;
   /** Called when staff try a new check-in, before saving, so the last patient's slip is hidden. */
@@ -33,9 +44,20 @@ type Props = {
   onHomeDone: () => void;
   /** true: paused; null: not read yet. Both mean check-in offers on-site waiting only. */
   offsitePaused: boolean | null;
+  /** true when the last read of the pause switch failed (from useSitePauses). */
+  pauseReadFailed: boolean;
 };
 
-export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProblem, onHomeDone, offsitePaused }: Props) {
+export function CheckInPanel({
+  site,
+  onAttempt,
+  onCreated,
+  homeVisit,
+  homeProblem,
+  onHomeDone,
+  offsitePaused,
+  pauseReadFailed,
+}: Props) {
   // Only a read that says "not paused" lets staff offer off-site waiting.
   const onSiteOnly = offsitePaused !== false;
 
@@ -90,6 +112,10 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
       setMessage(PAUSED_NOT_SAVED);
       return null;
     }
+    if (visit === "refused") {
+      setMessage("Not saved: the database refused this check-in. Nothing was recorded.");
+      return null;
+    }
     if (!visit) {
       setMessage("Not saved: the database could not be reached. Nothing was recorded. Try again.");
       return null;
@@ -110,9 +136,11 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
     }
     if (outcome === "waiting" && onSiteOnly) {
       setMessage(
-        offsitePaused === null
-          ? "Checking whether off-site waiting is paused. Press “Waits on-site” instead."
-          : "Off-site waiting is paused at this site. Press “Waits on-site” instead.",
+        offsitePaused === true
+          ? 'Off-site waiting is paused at this site. Press "Waits on-site" instead.'
+          : pauseReadFailed
+            ? `${READ_FAILED} Press "Waits on-site" instead.`
+            : 'Checking whether off-site waiting is paused. Press "Waits on-site" instead.',
       );
       return;
     }
@@ -121,7 +149,7 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
       return;
     }
     setSaving(true);
-    setMessage("Saving…");
+    setMessage("Saving...");
     const code = await save(outcome, ctas);
     setSaving(false);
     if (!code) return;
@@ -220,9 +248,7 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
         <div className="flex flex-wrap gap-3">
           {onSiteOnly ? (
             <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
-              {offsitePaused
-                ? "Off-site waiting is paused at this site: the patient waits on-site."
-                : "Checking whether off-site waiting is paused. The patient can wait on-site."}
+              {onSiteOnlyText(offsitePaused, pauseReadFailed)}
             </p>
           ) : (
             <Button type="submit" aria-disabled={saving}>
diff --git a/data/staffActions.ts b/data/staffActions.ts
index 772124a..c296783 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -7,7 +7,7 @@
 import { changedFields } from "@/lib/changedFields";
 import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
 import type { RecallAllResult } from "@/lib/recallAll";
-import { PAUSE_REFUSED, resultForError } from "@/lib/saveResult";
+import { resultForError } from "@/lib/saveResult";
 import type { ChangeResult, Site, Visit } from "@/lib/visit";
 import {
   callBack,
@@ -73,9 +73,13 @@ async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Pr
 
 /**
  * Create a desk visit after triage. Returns the new visit so the slip can be shown,
- * "paused" if the site was paused on another screen, or null if it could not be saved.
+ * "paused" if the site was paused on another screen, "refused" if the database does not allow
+ * this step, or null if it could not be saved.
  */
-export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Promise<Visit | "paused" | null> {
+export async function createDeskVisit(
+  form: CheckInForm,
+  outcome: DeskOutcome,
+): Promise<Visit | "paused" | "refused" | null> {
   try {
     for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
       const taken = new Set((readVisitList().visits ?? []).map((v) => v.code));
@@ -86,11 +90,16 @@ export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome):
       );
       const { data, error } = await supabaseBrowser().from("visits").insert(visit).select();
       if (error?.code === ALREADY_USED) continue; // an older visit not on this screen has the code
-      if (error?.code === PAUSE_REFUSED) {
-        void reloadSitePauses();
-        return "paused";
+      if (error) {
+        const result = resultForError(error.code);
+        if (result === "paused") {
+          void reloadSitePauses();
+          return "paused";
+        }
+        if (result === "refused") return "refused";
+        return null;
       }
-      if (error ||!Array.isArray(data) || data.length === 0) return null;
+      if (!Array.isArray(data) || data.length === 0) return null;
       putVisit(data[0] as StoredVisit);
       return data[0] as StoredVisit;
     }
diff --git a/lib/allowedSteps.test.ts b/lib/allowedSteps.test.ts
index 9697857..e25b362 100644
--- a/lib/allowedSteps.test.ts
+++ b/lib/allowedSteps.test.ts
@@ -18,6 +18,7 @@ import {
   startFromHome,
   undoClose,
 } from "./visitActions";
+import { PAUSE_REFUSED, STEP_REFUSED } from "./saveResult";
 
 // The newest migration that makes the trigger function: that is the one the database runs.
 // Only "create (or replace) function" counts, so a later "drop function" or "grant ... on
@@ -35,6 +36,21 @@ function newestTriggerSql(): string {
 // Removes "/* ... */" and "--" comments, so a move that is commented out does not count.
 const withoutComments = (sql: string) => sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
 
+// One move in SQL, such as ('waiting', 'called'). Group 1 is the "from" status, group 2 the "to" status.
+const PAIR = /\(\s*'(\w+)'\s*,\s*'(\w+)'\s*\)/g;
+
+// The "from>to" moves between the start and end markers of a SQL file. The start marker is the whole
+// line, because the check file has another comment that begins "-- allowed moves".
+function pairsBetweenMarkers(sql: string): string[] {
+  const start = "-- allowed moves (keep the same as lib/allowedSteps.ts)";
+  const block = withoutComments(sql.split(start)[1].split("-- end of allowed moves")[0]);
+  return [...block.matchAll(PAIR)].map((m) => `${m[1]}>${m[2]}`).sort();
+}
+
+// The moves in lib/allowedSteps.ts, as "from>to" pairs.
+const libMoves = (): string[] =>
+  Object.entries(ALLOWED_MOVES).flatMap(([from, tos]) => tos!.map((to) => `${from}>${to}`)).sort();
+
 const t0 = new Date("2026-11-09T20:00:00Z");
 const at = (min: number) => new Date(t0.getTime() + min * 60_000);
 const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
@@ -93,15 +109,31 @@ describe("allowed status moves", () => {
 
   it("is the same list as the database trigger", () => {
     const sql = newestTriggerSql();
-    const block = withoutComments(sql.split("-- allowed moves")[1].split("-- end of allowed moves")[0]);
-    const inSql = [...block.matchAll(/\(\s*'(\w+)'\s*,\s*'(\w+)'\s*\)/g)].map((m) => `${m[1]}>${m[2]}`).sort();
-    const inLib = Object.entries(ALLOWED_MOVES).flatMap(([from, tos]) => tos!.map((to) => `${from}>${to}`)).sort();
+    const inSql = pairsBetweenMarkers(sql);
+    const inLib = libMoves();
     expect(inSql).toEqual(inLib);
     const code = withoutComments(sql);
     const starts = code.match(/new\.status\s+not\s+in\s*\(([^)]*)\)/i)![1].match(/\w+/g)!.sort();
     expect(starts).toEqual([...START_STATUSES].sort());
-    const triage = code.match(/old\.status\s+in\s*\(([^)]*)\)/i)![1].match(/\w+/g)!.sort();
-    expect(triage).toEqual([...TRIAGE_STATUSES].sort());
+    // The start check refuses with the step code.
+    const startRefusal = /new\.status\s+not\s+in\s*\([^)]*\)\s*then\s+raise\s+exception\s+'[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
+    expect(code.match(startRefusal)?.[1]).toBe(STEP_REFUSED);
+    // The site check refuses with the step code.
+    const siteRefusal = /if\s+new\.site\s+is\s+distinct\s+from\s+old\.site\s+then\s+raise\s+exception\s+'[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
+    expect(code.match(siteRefusal)?.[1]).toBe(STEP_REFUSED);
+    // The move check is "not in (" a list, and its refusal uses the step code.
+    const moveRefusal = /if\s*\(\s*old\.status\s*,\s*new\.status\s*\)\s+not\s+in\s*\([\s\S]*?\)\s*then\s+raise\s+exception\s+'A visit cannot move[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
+    expect(code.match(moveRefusal)?.[1]).toBe(STEP_REFUSED);
+    // The pause check: a new off-site wait, or a triage into one, reads the pause "for share" and refuses with the pause code.
+    const pauseCheck = /if\s+new\.status\s*=\s*'waiting'\s+and\s*\(\s*tg_op\s*=\s*'INSERT'\s+or\s+old\.status\s+in\s*\(([^)]*)\)\s*\)\s*then\s+select\s+offsite_paused\s+into\s+site_paused\s+from\s+public\.site_settings\s+where\s+site\s*=\s*new\.site\s+for\s+share\s*;\s*if\s+site_paused\s+is\s+distinct\s+from\s+false\s+then\s+raise\s+exception\s+'[^']*'\s*,\s*new\.site\s+using\s+errcode\s*=\s*'(\w+)'/i;
+    const pause = code.match(pauseCheck);
+    expect(pause?.[1].match(/\w+/g)?.sort()).toEqual([...TRIAGE_STATUSES].sort());
+    expect(pause?.[2]).toBe(PAUSE_REFUSED);
+  });
+
+  it("the check file tries every allowed move", () => {
+    const checkSql = readFileSync("supabase/checks/allowed_steps.sql", "utf8");
+    expect(pairsBetweenMarkers(checkSql)).toEqual(libMoves());
   });
 
   it("does not count a move inside either kind of SQL comment", () => {
diff --git a/lib/allowedSteps.ts b/lib/allowedSteps.ts
index d631123..32b28fc 100644
--- a/lib/allowedSteps.ts
+++ b/lib/allowedSteps.ts
@@ -1,5 +1,5 @@
 // Which status moves a visit may make, written once as data. The database trigger
-// visits_check_step (migration 20261117000000_allowed_steps.sql) holds the same list, and
+// visits_check_step (in the newest migration that makes it) holds the same list, and
 // lib/allowedSteps.test.ts checks that the two lists match and that every rule in
 // lib/visitActions.ts makes only these moves. Time rules (the phone steps) stay in the app.
 
diff --git a/supabase/checks/allowed_steps.sql b/supabase/checks/allowed_steps.sql
index 9870485..2d773fc 100644
--- a/supabase/checks/allowed_steps.sql
+++ b/supabase/checks/allowed_steps.sql
@@ -22,6 +22,11 @@
 --   7N  desk, waiting at site B after site B's settings row is deleted: counts as paused
 --   8x  one visit for each of the 22 allowed moves (rows 101 to 122)
 
+-- If the last block stops with an error, the "rollback" line does not run and the transaction
+-- stays open with locks on site_settings and visits. This timeout makes Postgres end such a
+-- session after 10 seconds, which undoes everything and frees the locks.
+set idle_in_transaction_session_timeout = '10s';
+
 begin;
 
 -- Tries one change. Any other error stops the whole run (and still saves nothing).
@@ -115,6 +120,7 @@ declare
 begin
   for move in
     select * from (values
+    -- allowed moves (keep the same as lib/allowedSteps.ts)
       ('pre_arrival', 'waiting'), ('pre_arrival', 'declined'), ('pre_arrival', 'not_eligible'),
       ('needs_reassessment', 'waiting'), ('needs_reassessment', 'declined'), ('needs_reassessment', 'not_eligible'),
       ('waiting', 'called'), ('waiting', 'arrived'), ('waiting', 'removed'),
@@ -123,6 +129,7 @@ begin
       ('unable_to_reach', 'needs_reassessment'),
       ('arrived', 'waiting'), ('arrived', 'called'), ('arrived', 'on_the_way'),
       ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way')
+    -- end of allowed moves
     ) as m(from_status, to_status)
   loop
     i := i + 1;
@@ -208,3 +215,4 @@ end;
 $$;
 
 rollback;
+reset idle_in_transaction_session_timeout;
```

## Response

Gemini Hydrogen 4, High, 2026-11-17, pasted by the owner:

### 1. Sync test (`lib/allowedSteps.test.ts`)

1. **`moveRefusal` is not tied to the `-- allowed moves` markers, so the trigger's `not in (...)` list can diverge from `ALLOWED_MOVES` — Severity: should fix**
* **File and line:** `lib/allowedSteps.test.ts`, lines 44–48 (`pairsBetweenMarkers`) and lines 125–126 (`moveRefusal`).
* **What goes wrong:** `pairsBetweenMarkers(sql)` parses tuples between `-- allowed moves (keep the same as lib/allowedSteps.ts)` and `-- end of allowed moves`, while `moveRefusal` separately matches `/if\s*\(\s*old\.status\s*,\s*new\.status\s*\)\s+not\s+in\s*\([\s\S]*?\)\s*then\s+raise\s+exception/i` anywhere in `code`. Nothing verifies that the list inside `moveRefusal`'s `not in (...)` is the same list bounded by the markers, and `[\s\S]*?` matches across statements up to `'A visit cannot move...'`.
* **Concrete case:** Someone edits the migration's `if (old.status, new.status) not in (...)` to allow only `('waiting', 'called')` while leaving the `-- allowed moves` comments around a dead block or comment, or adds a second `if (old.status, new.status) not in (('waiting', 'called')) then raise exception 'Blocked' using errcode = 'VWR01';` above the marked check. Both `pairsBetweenMarkers` and `moveRefusal` pass while 21 of the 22 allowed moves fail in Postgres.
* **Smallest fix:** Capture the body inside `moveRefusal`'s `not in (...)` directly (or assert that the `-- allowed moves` markers sit inside that matched `not in (...)` body) and extract pairs from that captured group rather than from free-floating comments.

2. **`TG_OP` gating and `new.status is distinct from old.status` are not checked in the trigger regexes — Severity: should fix**
* **File and line:** `lib/allowedSteps.test.ts`, lines 115–126 (`starts`, `startRefusal`, `siteRefusal`, `moveRefusal`).
* **What goes wrong:** The test checks that `new.status not in (...)`, `new.site is distinct from old.site`, and `(old.status, new.status) not in (...)` appear with `STEP_REFUSED`, but never checks that `startRefusal` is gated to `TG_OP = 'INSERT'` or that `moveRefusal` and `siteRefusal` run on `TG_OP = 'UPDATE'` (with `moveRefusal` gated by `new.status is distinct from old.status`).
* **Concrete case:** Moving `new.status not in ('pre_arrival', 'waiting', 'declined', 'not_eligible')` outside `if tg_op = 'INSERT'` blocks every `UPDATE` to `'called'` or `'arrived'` with `VWR01`; removing `if new.status is distinct from old.status` around `moveRefusal` rejects metadata-only updates (`confirm_on_my_way`, `record_still_here`, `issueNewVisitLink`) with `VWR01`; nesting `siteRefusal` inside `if new.status is distinct from old.status` allows `UPDATE visits SET site = 'B'` on a `'waiting'` row to move a visit into a paused site. In all three cases, `allowedSteps.test.ts` still passes.

3. **`newestTriggerSql()` does not verify that the `BEFORE INSERT OR UPDATE` trigger on `public.visits` is still attached — Severity: minor**
* **File and line:** `lib/allowedSteps.test.ts`, lines 26–37 (`newestTriggerSql`) and line 111.
* **What goes wrong:** `newestTriggerSql()` finds the newest migration containing `create (or replace) function visits_check_step`, but does not check whether a later migration dropped or altered the trigger binding on `public.visits`.
* **Concrete case:** A later migration drops the trigger or recreates it as `BEFORE UPDATE` only (omitting `INSERT`), bypassing desk check-in pause enforcement completely while all unit tests stay green.

4. **Check-file test verifies only the 22 marker tuples, not the rest of `allowed_steps.sql` — Severity: minor**
* **File and line:** `lib/allowedSteps.test.ts`, lines 135–138.
* **What goes wrong:** `expect(pairsBetweenMarkers(checkSql)).toEqual(libMoves())` confirms that `supabase/checks/allowed_steps.sql` lists the 22 tuples between the markers, not that the loop executes them or that `START_STATUSES` / `TRIAGE_STATUSES` in the check script stay in sync.
* **Concrete case:** Commenting out the `update` inside the loop in `allowed_steps.sql` while leaving the `values` list intact still passes `allowedSteps.test.ts`.

### 2. Check file (`supabase/checks/allowed_steps.sql`) and SQL Editor session timeout

1. **Session-level `SET` outside `BEGIN` does not match how the SQL Editor executes scripts, and leaks session state onto pooled backend connections on failure — Severity: should fix**
* **File and line:** `supabase/checks/allowed_steps.sql`, lines 28 and 218 (`set idle_in_transaction_session_timeout = '10s';` / `reset idle_in_transaction_session_timeout;`).
* **What goes wrong:**
* **How the SQL Editor actually runs the script:** Clicking **Run** in the Supabase SQL Editor sends the entire script as one multi-statement batch over a pooled connection. If the final `do $$` block raises an exception, Postgres immediately marks the transaction aborted (`25P02`), skips `rollback;` and `reset ...;`, reaches the end of the submitted batch, and **rolls back the transaction immediately**—never leaving an `idle in transaction` session hanging for 10 seconds. The 10-second timeout only fires if someone runs statements piecemeal (`BEGIN;` in one request and pauses >10s before `ROLLBACK;`, where a 10s limit would actually kill an intentional manual inspection).
* **Connection pooler (`Supavisor` transaction mode) leak:** Because `SET` on line 28 is outside `BEGIN;` (session-scoped rather than `SET LOCAL`), any failure before line 218 skips `reset idle_in_transaction_session_timeout;`. In transaction pooling mode, Supavisor returns that underlying Postgres backend to the pool without resetting session variables, leaving a 10-second `idle_in_transaction_session_timeout` active on that backend for subsequent unrelated callers.
* **Concrete case:** A check row fails and the final `do $$` block raises an exception; execution aborts before line 218, leaving `idle_in_transaction_session_timeout = '10s'` set on the pooled Postgres session.
* **Smallest fix:** Replace line 28 + line 218 with `set local idle_in_transaction_session_timeout = '10s';` immediately **after** `begin;` (line 30) and remove `reset idle_in_transaction_session_timeout;`. `SET LOCAL` is transaction-scoped, safe in transaction-mode pooling, and automatically cleared on both `ROLLBACK` and error abort.

### 3. `CheckInPanel` (`components/staff/CheckInPanel.tsx`)

1. **`(offsitePaused = false, pauseReadFailed = true)` still offers `"Start off-site waiting"` with no stale-read warning — Severity: should fix**
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 63 (`const onSiteOnly = offsitePaused !== false;`), 137–145 (`finish`), and 249–256.
* **What goes wrong:** `useSitePauses()` keeps the last good `pauses` object when a later poll fails (`pauses` stays non-null while `failed` becomes `true`). In `(offsitePaused = false, pauseReadFailed = true)`, `onSiteOnly` evaluates to `false`, so `"Start off-site waiting"` stays visible and submittable without telling staff that the pause switch failed to refresh. (The database trigger `VWR02` still blocks saving if the site was paused in the meantime, so no invalid visit is saved, but the UI hides the read failure.)
* **Concrete case:** Staff open `/staff` while Site A is unpaused (`offsitePaused = false`), then network/Supabase errors on a subsequent 5-second poll (`pauseReadFailed = true`, `offsitePaused` still `false`). `CheckInPanel` shows `"Start off-site waiting"` normally with no warning.

2. **Red-box wording contradicts `"Offered, declined"` when paused or unreadable, and `"Waits on-site"` / `"Not eligible"` recording remains coupled — Severity: minor**
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 21, 27–31 (`onSiteOnlyText`), and 139–144 (`finish`).
* **What goes wrong:**
* Across all 6 `(offsitePaused, pauseReadFailed)` states, staff **cannot** start off-site waiting when `offsitePaused` is `true` or `null` (`onSiteOnly` is `true`, hiding the submit button and blocking Enter in `finish`), and `finish`'s `'Press "Waits on-site" instead.'` matches the third button's `"Waits on-site"` label.
* However, when `offsitePaused === true` or `pauseReadFailed === true`, `onSiteOnlyText` states `"The patient waits on-site."` while the `"Offered, declined"` button is still visible beside `"Waits on-site"`—even though off-site waiting could not be offered. (Note: verify outside the diff hunks that the success message for `"Waits on-site"` / `"not_eligible"` says the patient waits on-site rather than off-site.)
* **Concrete case:** Site A is paused (`offsitePaused = true`); the red box says `"Off-site waiting is paused at this site: the patient waits on-site."` while `"Offered, declined"` remains clickable right below it.

### 4. `"refused"` result and text in `createDeskVisit` (`data/staffActions.ts` & `CheckInPanel.tsx`)

1. **`"refused"` is the right result, and no error maps to a worse message, though `VWR01` on `INSERT` is slightly opaque — Severity: minor**
* **File and line:** `data/staffActions.ts`, lines 93–101, and `components/staff/CheckInPanel.tsx`, lines 115–122.
* **What goes wrong:** Nothing regresses—`lib/saveResult.ts` maps only `VWR02` $\to$ `"paused"` and `VWR01` $\to$ `"refused"`, so network errors, timeouts, and other SQLSTATEs still return `null` (`"Not saved: the database could not be reached. Nothing was recorded. Try again."`). On `INSERT`, `VWR01` only fires if `new.status` is outside `START_STATUSES` (which cannot happen from the UI unless the client bundle and DB migration are out of sync), so `"Not saved: the database refused this check-in. Nothing was recorded."` accurately stops staff from retrying a network error, though suggesting a page refresh would be slightly more helpful if a deploy mismatch ever triggered it.

### 5. Codebase rules (one job per file, $\le$ 300 lines, straight quotes, beginner readability)

1. **Duplicate three-way `offsitePaused` / `pauseReadFailed` ternary in `finish` and near-300-line length in `CheckInPanel.tsx` — Severity: minor**
* **File and line:** `components/staff/CheckInPanel.tsx`, lines 27–31, 139–144, and 248–256.
* **What goes wrong:** One job per file holds across all touched files, and all curly quotes (`“Waits on-site”`) and ellipses (`Saving…`) in the diff were replaced with straight quotes and `...`. However, lines 139–144 repeat the exact three-way `offsitePaused` / `pauseReadFailed` branch from `onSiteOnlyText` (lines 27–31) as a nested ternary (`offsitePaused === true ? ... : pauseReadFailed ? ... : ...`), which is harder for a beginner to read, and `CheckInPanel.tsx` reaches line 248 before the closing buttons—verify the full file stays $\le 300$ lines.
* **Concrete case:** Reusing a small `blockedOffsiteMessage(offsitePaused, pauseReadFailed)` helper in `finish` removes the nested ternary and trims `CheckInPanel.tsx` by several lines.

## My check of the response (2026-11-17)

I read each point against the files at `676d32e`. Gemini did not run the tests or the check file.

- 1.1 (the move list is not tied to the markers): right, minor. The markers are at `20261117010000_step_check_fixes.sql:35` and `:45`, around the real `not in (` list, so the file is correct now. But the test reads the pairs from the marker block and the refusal from a different regex. A second `not in (` check above the marked one, or markers moved to another list, would pass. Cheap fix: take the pairs from the list inside the `moveRefusal` match, and keep the marker check for the check file only.
- 1.2 (the `tg_op` and `is distinct from` guards are not read): right that the text test does not read them. The check file tests the same cases in a real database: rows 4, 5, 8 and 25 (updates that keep the status), row 22 (change of site) and rows 101 to 122 (moves on UPDATE). Each of Gemini's 3 edits fails at least one of those rows. A longer regex would make the test hard to read for a beginner. Not changed, unless the owner wants it.
- 1.3 (the trigger binding is not read): right, minor. Rows 15, 16 and 18 give `paused` only if the trigger runs, so the check file finds a dropped or `BEFORE UPDATE` only trigger. Not changed.
- 1.4 (the test does not prove that the check file loop runs): right, but no text test can prove that. The SQL Editor run proves it (rows 101 to 122 `saved`). Not a bug.
- 2.1 (session `set` outside `begin;`): the fix is right; part of the reason is not checked. Not checked: that the SQL Editor rolls back at once when a statement fails after `begin;`. If it does, the session continues with the 10-second limit set, and the next SQL Editor run on that connection gets it. `set local idle_in_transaction_session_timeout = '10s';` after `begin;` covers both cases: the limit applies while the failed transaction stays open, and it ends with that transaction. It also removes the `reset` line. Accept.
- 3.1 (a stale "not paused" after a failed read still offers "Start off-site waiting"): right. `data/sitePauses.ts:31` and `:33` keep the last good `pauses` and set `failed: true`, and `CheckInPanel.tsx:59` offers off-site waiting when `offsitePaused === false`. The database still refuses a start at a paused site (`VWR02`) and the panel then shows the paused message, so no wrong visit is saved. Only the warning is missing. The owner decides: a warning line, or hide the button as well.
- 3.2 ("Offered, declined" shows while paused or unread): wrong. `CheckInPanel.tsx:258` shows it only when `!onSiteOnly`, and the test at `CheckInPanel.test.tsx:33` and `:49` checks that it is gone. The success message for "Waits on-site" says "The patient waits on-site as usual." (`CheckInPanel.tsx:158`).
- 4 ("refused" for a refused desk check-in): agrees with my read. No change.
- 5 (the paused, read failed, not read yet choice is written twice): right, minor. The box text (`onSiteOnlyText`) and the `finish` text are close but not the same: `finish` adds 'Press "Waits on-site" instead.'. One helper with that ending as a choice would remove the nested choice in `finish`. The file is 277 lines, under 300.

Fixes to offer: 1.1, 2.1, 3.1 (owner picks the form), 5.

## Done (2026-11-17)

- 2.1: `set local` after `begin;`, `reset` removed (`fd24d05`).
- 1.1: move pairs read from inside the move check (`077df04`). Checked: two mutation tries each failed the test.
- 5: `finish` uses `onSiteOnlyText` (`fc2c714`).
- 3.1: amber warning line, button kept (test `3f7717e`, code `98d1d07`).
- Checked: 315 tests, lint and build pass.
- Not checked: the check file run after `fd24d05` (owner runs it in the SQL Editor).
- Not changed: 1.2, 1.3, 1.4, 3.2, 4 (reasons above).
