# Gemini review: Pushover recall alert (security)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Question to ask

You review a concept prototype of a virtual ER waiting room (Next.js App Router, Supabase, synthetic data only). Find problems; do not confirm. The diff below adds one alert: when staff recall a real (not demo) visit, the server sends one Pushover message to the owner's own phone. Look for these and anything else you find:

1. Can a caller who is not staff make the route send a message?
2. Can the message, a log line or an answer leak the Supabase token, the Pushover app token or the user key?
3. Can repeat or forged requests spam the phone (for example the same ids again, many ids, old recalls)?
4. Does the message carry anything more than the display code and the site (SPEC rule 1: never the access token, a link, the language or the CTAS level)?
5. Can an alert failure change or block the saved recall?

For each problem give: the file and line, a concrete request or state that shows it, and the smallest fix.

## Context

- The route reads visits with a Supabase client made from the publishable key plus the caller's Bearer token, so row-level security decides. The policy "Staff can read visits" lets only signed-in staff read `visits`; anyone else gets no rows.
- Only rows with status `called`, `is_demo` false and `called_at` 2 minutes old or less send. Up to 50 uuid ids per request.
- With `PUSHOVER_APP_TOKEN` or `PUSHOVER_USER_KEY` missing, the route answers 204 and sends nothing.
- The browser call is not awaited and ignores all errors.

## Checked (output in this session or in docs/progress.md)

- After `f20cb68`: 82 test files, 476 tests pass; lint passed; build passed.
- The route answered 401 with no token (running dev server, 2026-11-19).
- A real recall on localhost showed on the owner's locked iPhone (2026-11-19).

## Not checked

- The live Vercel app (the branch is not pushed yet).
- A demo visit recall in a running server (unit tests only).
- A non-staff signed-in user calling the route in a running server (RLS is relied on, not tested here).

## Changed files and line counts

- lib/pushover.ts: 16 lines (new)
- lib/pushover.test.ts: 36 lines (new)
- lib/recallAlert.ts: 48 lines (new)
- lib/recallAlert.test.ts: 73 lines (new)
- app/api/recall-alert/route.ts: 59 lines (new)
- data/recallAlert.ts: 20 lines (new)
- data/staffActions.ts: 9 lines changed
- .env.example: 9 lines added (empty values)

## Helpers the changed lines call (not in the diff)

data/supabaseSettings.ts:

```ts
export function supabaseSettings(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Add it to .env.local (see .env.example).");
  }
  return { url, publishableKey };
}
```

`recallAll` in data/staffActions.ts (the full function; only the `sendRecallAlert` line is new):

```ts
export async function recallAll(ids: string[]): Promise<RecallAllResult> {
  if (ids.length === 0) return { recalled: 0, changed: 0, notSaved: false };
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update({ status: "called", called_at: serverNow().toISOString() })
      .in("id", ids)
      .eq("status", "waiting")
      .select();
    if (error || !Array.isArray(data)) return { recalled: 0, changed: 0, notSaved: true };
    (data as StoredVisit[]).forEach(putVisit);
    void sendRecallAlert((data as StoredVisit[]).map((v) => v.id));
    if (data.length < ids.length) void loadVisits();
    return { recalled: data.length, changed: ids.length - data.length, notSaved: false };
  } catch {
    return { recalled: 0, changed: 0, notSaved: true };
  }
}
```

## Diff (86d9f10 to f20cb68, code only)

```diff
diff --git a/.env.example b/.env.example
index 8c6b06b..1e17b03 100644
--- a/.env.example
+++ b/.env.example
@@ -18,3 +18,12 @@ SUPABASE_SECRET_KEY=
 # it with each scheduled call and the route refuses everything else. SERVER ONLY.
 # Vercel: Project Settings > Environment Variables, name CRON_SECRET (Production).
 CRON_SECRET=
+
+# Pushover settings for the recall alert to the owner's phone (app/api/recall-alert).
+# PUSHOVER_USER_KEY: the "Your User Key" value on the first page of pushover.net after sign-in.
+# PUSHOVER_APP_TOKEN: the "API Token/Key" of the application you make on pushover.net
+# ("Create an Application/API Token"). Keep both out of chat and out of git. SERVER ONLY.
+# Leave either one empty to turn the alert off.
+# Vercel: Project Settings > Environment Variables, both names (Production and Preview).
+PUSHOVER_APP_TOKEN=
+PUSHOVER_USER_KEY=
diff --git a/app/api/recall-alert/route.ts b/app/api/recall-alert/route.ts
new file mode 100644
index 0000000..2781e2a
--- /dev/null
+++ b/app/api/recall-alert/route.ts
@@ -0,0 +1,59 @@
+// The server route a staff screen calls after a recall saves. It sends one Pushover message to
+// the owner's phone for real (not demo) visits. It reads the visits with the caller's own sign-in
+// token, so the database rules decide: only staff can read visits, and a caller who is not staff
+// gets no rows, so nothing is sent. With no Pushover settings, the route does nothing.
+
+import { createClient } from "@supabase/supabase-js";
+import { supabaseSettings } from "@/data/supabaseSettings";
+import { PUSHOVER_URL, pushoverBody } from "@/lib/pushover";
+import { alertsToSend, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "@/lib/recallAlert";
+
+const MAX_BODY_CHARACTERS = 2_500; // 50 ids of 36 characters, with room to spare
+
+function answer(result: string, status: number): Response {
+  return Response.json({ result }, { status, headers: { "Cache-Control": "no-store" } });
+}
+
+export async function POST(request: Request): Promise<Response> {
+  const appToken = process.env.PUSHOVER_APP_TOKEN;
+  const userKey = process.env.PUSHOVER_USER_KEY;
+  if (!appToken || !userKey) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
+
+  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
+  if (!token) return answer("not_signed_in", 401);
+
+  let body: unknown;
+  try {
+    const text = await request.text();
+    if (text.length > MAX_BODY_CHARACTERS) return answer("bad_request", 400);
+    body = JSON.parse(text);
+  } catch {
+    return answer("bad_request", 400);
+  }
+  const wanted = parseRecallAlertBody(body);
+  if (!wanted) return answer("bad_request", 400);
+
+  const { url, publishableKey } = supabaseSettings();
+  const asCaller = createClient(url, publishableKey, {
+    auth: { persistSession: false, autoRefreshToken: false },
+    global: { headers: { Authorization: `Bearer ${token}` } },
+  });
+  const { data, error } = await asCaller
+    .from("visits")
+    .select("id, code, site, status, called_at, is_demo")
+    .in("id", wanted.ids);
+  if (error || !Array.isArray(data)) return answer("error", 500);
+
+  const rows = alertsToSend(data as RecallAlertRow[], new Date());
+  if (rows.length === 0) return answer("nothing_to_send", 200);
+
+  try {
+    const sent = await fetch(PUSHOVER_URL, {
+      method: "POST",
+      body: new URLSearchParams(pushoverBody(appToken, userKey, recallAlertText(rows))),
+    });
+    return sent.ok ? answer("sent", 200) : answer("alert_failed", 502);
+  } catch {
+    return answer("alert_failed", 502);
+  }
+}
diff --git a/data/recallAlert.ts b/data/recallAlert.ts
new file mode 100644
index 0000000..08308fd
--- /dev/null
+++ b/data/recallAlert.ts
@@ -0,0 +1,20 @@
+// Asks the server to send the Pushover alert for visits staff just recalled (app/api/recall-alert).
+// The alert is extra: the recall is already saved, so every error here is ignored.
+
+import { supabaseBrowser } from "./supabaseBrowser";
+
+export async function sendRecallAlert(ids: string[]): Promise<void> {
+  if (ids.length === 0) return;
+  try {
+    const { data } = await supabaseBrowser().auth.getSession();
+    const token = data.session?.access_token;
+    if (!token) return;
+    await fetch("/api/recall-alert", {
+      method: "POST",
+      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
+      body: JSON.stringify({ ids }),
+    });
+  } catch {
+    // No alert this time; the patient's screen still shows the recall.
+  }
+}
diff --git a/data/staffActions.ts b/data/staffActions.ts
index c296783..ffa2967 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -23,6 +23,7 @@ import {
   type Closure,
   type DeskOutcome,
 } from "@/lib/visitActions";
+import { sendRecallAlert } from "./recallAlert";
 import { serverNow } from "./serverClock";
 import { reloadSitePauses } from "./sitePauses";
 import { supabaseBrowser } from "./supabaseBrowser";
@@ -133,7 +134,12 @@ export async function findVisitByCode(typed: string): Promise<Visit | null | "fa
   }
 }
 
-export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v, serverNow()));
+/** Recall one visit. On "saved", ask the server for the Pushover alert (not awaited; demo visits send nothing). */
+export async function callBackVisit(id: string): Promise<ChangeResult> {
+  const result = await changeVisit(id, (v) => callBack(v, serverNow()));
+  if (result === "saved") void sendRecallAlert([id]);
+  return result;
+}
 export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, serverNow()));
 export const removeVisit = (id: string, reason: "left" | "no_show") =>
   changeVisit(id, (v) => markRemoved(v, reason, serverNow()));
@@ -160,6 +166,7 @@ export async function recallAll(ids: string[]): Promise<RecallAllResult> {
       .select();
     if (error || !Array.isArray(data)) return { recalled: 0, changed: 0, notSaved: true };
     (data as StoredVisit[]).forEach(putVisit);
+    void sendRecallAlert((data as StoredVisit[]).map((v) => v.id));
     if (data.length < ids.length) void loadVisits();
     return { recalled: data.length, changed: ids.length - data.length, notSaved: false };
   } catch {
diff --git a/lib/pushover.test.ts b/lib/pushover.test.ts
new file mode 100644
index 0000000..9608e47
--- /dev/null
+++ b/lib/pushover.test.ts
@@ -0,0 +1,36 @@
+import { describe, expect, it } from "vitest";
+import { PUSHOVER_MAX_MESSAGE, PUSHOVER_TITLE, pushoverBody } from "./pushover";
+
+const APP = "app-token-for-test";
+const USER = "user-key-for-test";
+
+describe("pushoverBody", () => {
+  it("gives the fields Pushover needs", () => {
+    expect(pushoverBody(APP, USER, "Visit ABC234 is called back to Demo Site A.")).toEqual({
+      token: APP,
+      user: USER,
+      message: "Visit ABC234 is called back to Demo Site A.",
+      title: PUSHOVER_TITLE,
+      priority: "1",
+    });
+  });
+
+  it("keeps a message at the limit as it is", () => {
+    const text = "x".repeat(PUSHOVER_MAX_MESSAGE);
+    expect(pushoverBody(APP, USER, text).message).toBe(text);
+  });
+
+  it("cuts a long message to the limit and ends it with ...", () => {
+    const message = pushoverBody(APP, USER, "x".repeat(1100)).message;
+    expect(message).toHaveLength(PUSHOVER_MAX_MESSAGE);
+    expect(message.endsWith("...")).toBe(true);
+  });
+
+  it("never puts the app token or the user key in the message or the title", () => {
+    const body = pushoverBody(APP, USER, "Visit ABC234 is called back to Demo Site A.");
+    expect(body.message).not.toContain(APP);
+    expect(body.message).not.toContain(USER);
+    expect(body.title).not.toContain(APP);
+    expect(body.title).not.toContain(USER);
+  });
+});
diff --git a/lib/pushover.ts b/lib/pushover.ts
new file mode 100644
index 0000000..615be99
--- /dev/null
+++ b/lib/pushover.ts
@@ -0,0 +1,16 @@
+// Builds the request for the Pushover recall alert to the owner's phone (Phase 4).
+// The route in app/api/recall-alert sends it; this file only decides the fields.
+
+export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
+
+/** Pushover refuses a message longer than this. */
+export const PUSHOVER_MAX_MESSAGE = 1024;
+
+export const PUSHOVER_TITLE = "Virtual waiting room demo";
+
+/** The form fields Pushover needs. Priority "1" is high: it makes a sound, also in quiet hours. */
+export function pushoverBody(appToken: string, userKey: string, text: string): Record<string, string> {
+  const message =
+    text.length > PUSHOVER_MAX_MESSAGE ? `${text.slice(0, PUSHOVER_MAX_MESSAGE - 3)}...` : text;
+  return { token: appToken, user: userKey, message, title: PUSHOVER_TITLE, priority: "1" };
+}
diff --git a/lib/recallAlert.test.ts b/lib/recallAlert.test.ts
new file mode 100644
index 0000000..f328e97
--- /dev/null
+++ b/lib/recallAlert.test.ts
@@ -0,0 +1,73 @@
+import { describe, expect, it } from "vitest";
+import { alertsToSend, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "./recallAlert";
+
+const now = new Date("2026-11-19T15:00:00Z");
+const ID = "0b9f3c1e-2a4d-4f6b-8c7e-1d2a3b4c5d6e";
+
+function row(extra: Partial<RecallAlertRow> = {}): RecallAlertRow {
+  return {
+    id: ID,
+    code: "ABC234",
+    site: "A",
+    status: "called",
+    called_at: "2026-11-19T14:59:30Z",
+    is_demo: false,
+    ...extra,
+  };
+}
+
+describe("recall alert body", () => {
+  it("accepts 1 to 50 visit ids and removes repeats", () => {
+    expect(parseRecallAlertBody({ ids: [ID, ID] })).toEqual({ ids: [ID] });
+    expect(parseRecallAlertBody({ ids: Array(50).fill(ID) })).toEqual({ ids: [ID] });
+  });
+
+  it("refuses no ids, more than 50 ids, an id that is not a uuid, and a body that is not an object", () => {
+    expect(parseRecallAlertBody({ ids: [] })).toBeNull();
+    expect(parseRecallAlertBody({})).toBeNull();
+    expect(parseRecallAlertBody({ ids: Array(51).fill(ID) })).toBeNull();
+    expect(parseRecallAlertBody({ ids: ["ABC234"] })).toBeNull();
+    expect(parseRecallAlertBody({ ids: [42] })).toBeNull();
+    expect(parseRecallAlertBody(null)).toBeNull();
+    expect(parseRecallAlertBody("ids")).toBeNull();
+  });
+});
+
+describe("which recalls send an alert", () => {
+  it("sends for a real visit called in the last 2 minutes", () => {
+    expect(alertsToSend([row()], now)).toHaveLength(1);
+    expect(alertsToSend([row({ called_at: "2026-11-19T14:58:00Z" })], now)).toHaveLength(1);
+  });
+
+  it("never sends for a demo visit, because the simulator calls them back all day", () => {
+    expect(alertsToSend([row({ is_demo: true })], now)).toEqual([]);
+  });
+
+  it("sends nothing for a visit that is not called, or was called more than 2 minutes ago", () => {
+    expect(alertsToSend([row({ status: "waiting" })], now)).toEqual([]);
+    expect(alertsToSend([row({ status: "on_the_way" })], now)).toEqual([]);
+    expect(alertsToSend([row({ called_at: null })], now)).toEqual([]);
+    expect(alertsToSend([row({ called_at: "2026-11-19T14:57:00Z" })], now)).toEqual([]);
+  });
+});
+
+describe("recall alert text", () => {
+  it("names the code and the site for one visit", () => {
+    expect(recallAlertText([row()])).toBe("Visit ABC234 is called back to Demo Site A.");
+  });
+
+  it("gives the count and each code with its site for many visits", () => {
+    const rows = [row(), row({ code: "DEF567" }), row({ code: "GHJ892", site: "B" })];
+    expect(recallAlertText(rows)).toBe(
+      "3 visits are called back: ABC234 (Demo Site A), DEF567 (Demo Site A), GHJ892 (Demo Site B).",
+    );
+  });
+
+  it("is empty when there is nothing to send", () => {
+    expect(recallAlertText([])).toBe("");
+  });
+
+  it("never carries the visit id (the same rule keeps the token out: the row has no token)", () => {
+    expect(recallAlertText([row(), row({ code: "DEF567" })])).not.toContain(ID);
+  });
+});
diff --git a/lib/recallAlert.ts b/lib/recallAlert.ts
new file mode 100644
index 0000000..e7374c9
--- /dev/null
+++ b/lib/recallAlert.ts
@@ -0,0 +1,48 @@
+// Rules for the Pushover alert to the owner's phone when staff recall a real visit (Phase 4).
+// The message goes through the Pushover server, so it carries only the display code and
+// the site: never the token, a link, the language or the CTAS level (SPEC rule 1).
+
+import type { Site } from "./visit";
+
+/** The visit fields the alert route reads. */
+export type RecallAlertRow = {
+  id: string;
+  code: string;
+  site: Site;
+  status: string;
+  called_at: string | null;
+  is_demo: boolean;
+};
+
+/** "Recall all" can send many ids; more than this is not a real request. */
+export const MAX_ALERT_IDS = 50;
+
+/** A recall older than this sends nothing, so a repeat request or an old id does not ring the phone again. */
+export const ALERT_WINDOW_MINUTES = 2;
+
+const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+
+/** The body the staff browser sends: `{ ids: [...] }` with 1 to 50 visit ids. Anything else gives null. */
+export function parseRecallAlertBody(body: unknown): { ids: string[] } | null {
+  if (typeof body !== "object" || body === null) return null;
+  const ids = (body as { ids?: unknown }).ids;
+  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ALERT_IDS) return null;
+  if (!ids.every((id) => typeof id === "string" && UUID.test(id))) return null;
+  return { ids: [...new Set(ids as string[])] };
+}
+
+/** Real visits that are called back now, and were called in the last 2 minutes. */
+export function alertsToSend(rows: RecallAlertRow[], now: Date): RecallAlertRow[] {
+  const oldest = now.getTime() - ALERT_WINDOW_MINUTES * 60_000;
+  return rows.filter(
+    (r) => r.status === "called" && !r.is_demo && r.called_at !== null && Date.parse(r.called_at) >= oldest,
+  );
+}
+
+/** The one line of text the phone shows. */
+export function recallAlertText(rows: RecallAlertRow[]): string {
+  if (rows.length === 0) return "";
+  if (rows.length === 1) return `Visit ${rows[0].code} is called back to Demo Site ${rows[0].site}.`;
+  const list = rows.map((r) => `${r.code} (Demo Site ${r.site})`).join(", ");
+  return `${rows.length} visits are called back: ${list}.`;
+}
```
