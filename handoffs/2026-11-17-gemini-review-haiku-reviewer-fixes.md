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
