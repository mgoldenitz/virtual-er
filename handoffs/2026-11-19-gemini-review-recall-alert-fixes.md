# Gemini Hydrogen 4, High: review of the recall alert fixes (2026-11-19)

New chat. Find problems; do not confirm.

## Question

An earlier review of this Next.js + Supabase route found two faults that we fixed here:
- Fault 2: the staff browser sent the ids of every recalled visit, demo visits included, and the route refuses more than 50 ids. Fix: `alertIdsFor()` sends only real (`is_demo` false) ids, at most 50.
- Fault 3: the `fetch` to Pushover had no time limit. Fix: `signal: AbortSignal.timeout(5_000)`; a timeout throws and the existing `catch` answers 502.

Please check:
1. Can a real visit still get no alert after "Recall all" (for example the order of the ids, or the 50 cut)?
2. Does `AbortSignal.timeout` work in the Vercel Node.js runtime of Next.js App Router routes, and does the `catch` get the abort?
3. Any other fault in the changed lines.

## Context

- `recallAll` updates only visits with `status = 'waiting'` and `.select()` returns the updated rows, each with `is_demo`.
- `sendRecallAlert(ids)` returns at once for an empty list, gets the session token and POSTs `{ ids }`; every error is ignored (the alert is extra).
- The route checks the token (RLS lets only staff read `visits`), then keeps only `called`, real, called in the last 2 minutes.

## Checked

- `npm test`: 82 test files, 479 tests pass (3 new `alertIdsFor` tests failed first, then passed). `npm run lint` passed. `npm run build` passed. After commit 964393c.

## Not checked

- A "Recall all" with demo visits and a real visit in a running app.
- A real timeout against Pushover.

## Line counts after the change

- lib/recallAlert.ts: 56
- lib/recallAlert.test.ts: 93
- data/staffActions.ts: 189
- app/api/recall-alert/route.ts: 61

## Helper the changed lines call (not in the diff)

```ts
// data/recallAlert.ts
export async function sendRecallAlert(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/recall-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // No alert this time; the patient's screen still shows the recall.
  }
}
```

## Diff (ffe7316..964393c)

```diff
diff --git a/app/api/recall-alert/route.ts b/app/api/recall-alert/route.ts
index 2781e2a..55b8f71 100644
--- a/app/api/recall-alert/route.ts
+++ b/app/api/recall-alert/route.ts
@@ -51,6 +51,8 @@ export async function POST(request: Request): Promise<Response> {
     const sent = await fetch(PUSHOVER_URL, {
       method: "POST",
       body: new URLSearchParams(pushoverBody(appToken, userKey, recallAlertText(rows))),
+      // Stop after 5 seconds, so a slow Pushover server cannot keep this function open.
+      signal: AbortSignal.timeout(5_000),
     });
     return sent.ok ? answer("sent", 200) : answer("alert_failed", 502);
   } catch {
diff --git a/data/staffActions.ts b/data/staffActions.ts
index ffa2967..d4b2a5c 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -6,6 +6,7 @@
 
 import { changedFields } from "@/lib/changedFields";
 import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
+import { alertIdsFor } from "@/lib/recallAlert";
 import type { RecallAllResult } from "@/lib/recallAll";
 import { resultForError } from "@/lib/saveResult";
 import type { ChangeResult, Site, Visit } from "@/lib/visit";
@@ -166,7 +167,7 @@ export async function recallAll(ids: string[]): Promise<RecallAllResult> {
       .select();
     if (error || !Array.isArray(data)) return { recalled: 0, changed: 0, notSaved: true };
     (data as StoredVisit[]).forEach(putVisit);
-    void sendRecallAlert((data as StoredVisit[]).map((v) => v.id));
+    void sendRecallAlert(alertIdsFor(data as StoredVisit[]));
     if (data.length < ids.length) void loadVisits();
     return { recalled: data.length, changed: ids.length - data.length, notSaved: false };
   } catch {
diff --git a/lib/recallAlert.test.ts b/lib/recallAlert.test.ts
index f328e97..9c3d20d 100644
--- a/lib/recallAlert.test.ts
+++ b/lib/recallAlert.test.ts
@@ -1,5 +1,5 @@
 import { describe, expect, it } from "vitest";
-import { alertsToSend, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "./recallAlert";
+import { alertIdsFor, alertsToSend, MAX_ALERT_IDS, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "./recallAlert";
 
 const now = new Date("2026-11-19T15:00:00Z");
 const ID = "0b9f3c1e-2a4d-4f6b-8c7e-1d2a3b4c5d6e";
@@ -71,3 +71,23 @@ describe("recall alert text", () => {
     expect(recallAlertText([row(), row({ code: "DEF567" })])).not.toContain(ID);
   });
 });
+
+describe("alertIdsFor", () => {
+  it("leaves out demo visits", () => {
+    const visits = [
+      { id: "real-1", is_demo: false },
+      { id: "demo-1", is_demo: true },
+      { id: "real-2", is_demo: false },
+    ];
+    expect(alertIdsFor(visits)).toEqual(["real-1", "real-2"]);
+  });
+
+  it("gives an empty list when all visits are demo visits", () => {
+    expect(alertIdsFor([{ id: "demo-1", is_demo: true }])).toEqual([]);
+  });
+
+  it("gives at most 50 ids, so the route does not refuse the request", () => {
+    const visits = Array.from({ length: 60 }, (_, i) => ({ id: `real-${i}`, is_demo: false }));
+    expect(alertIdsFor(visits)).toHaveLength(MAX_ALERT_IDS);
+  });
+});
diff --git a/lib/recallAlert.ts b/lib/recallAlert.ts
index e7374c9..01b6e41 100644
--- a/lib/recallAlert.ts
+++ b/lib/recallAlert.ts
@@ -46,3 +46,11 @@ export function recallAlertText(rows: RecallAlertRow[]): string {
   const list = rows.map((r) => `${r.code} (Demo Site ${r.site})`).join(", ");
   return `${rows.length} visits are called back: ${list}.`;
 }
+
+/**
+ * The ids the staff browser sends after a recall: only real visits (demo visits never send),
+ * and at most 50, so a "Recall all" with many demo visits is not refused by the route.
+ */
+export function alertIdsFor(visits: { id: string; is_demo: boolean }[]): string[] {
+  return visits.filter((v) => !v.is_demo).map((v) => v.id).slice(0, MAX_ALERT_IDS);
+}
```
