# Gemini review round 2: fixes to the dashboard summary

Model: Gemini Hydrogen 4, High, in a new chat (not the chat of round 1). If you have no Hydrogen 4 credits, Gemini 3.6 Flash, High.

## Question for the model

You review a small fix in a concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, TypeScript, Supabase with row-level security, synthetic data only). Find problems. Do not confirm that the code is good. For each problem, give the file, the line, what goes wrong, and the smallest fix.

Background: a staff-only route (`POST /api/dashboard-summary`) checks the caller's Supabase sign-in token, counts today's totals on the server, and sends only those totals to the Claude API for a 2 or 3 sentence summary. An earlier review found these faults, and this diff fixes them:

1. A token that Supabase refuses (expired or made up) gave 403 `not_staff`. Now a new rule, `lib/callerCheck.ts`, gives `not_signed_in` (401) for a refused token (status 401 or 403), `error` (500) for a Supabase or network fault (any other status, or none), and `not_staff` (403) only for a good account without the staff role.
2. `max_tokens` was 400, which is tight because thinking tokens count toward it. Now 1024.
3. The button handler in `SummaryPanel.tsx` had no guard against a second call while locked, and did not clear the old timer.
4. Three lines were hard to read: the body check in `lib/summaryMessage.ts`, the Bearer token regex in the route, and a curried cleanup in `useEffect`.

Look for: a refused token or an outage that still gets the wrong result; a Supabase error shape where `status` is missing or different from what `callerCheck` expects (supabase-js `AuthApiError`, `AuthRetryableFetchError`, `AuthSessionMissingError`); a way for a non-staff caller to reach the Claude call; a React bug in the new guard or the timer; anything a beginner could not read.

Settled decisions (do not report these as faults):
- `components/dashboard/SummaryPanel.tsx`: one 30-second lock for Real and Demo together. It is the guard against two paid calls in 30 seconds. It is in the browser only; it is not a security limit.
- `pause_turn` is not handled in `lib/summaryAnswer.ts`: this request sends no tools, so the API does not send it.
- The "Demo numbers:" label is written only by the model (the owner's choice). The fixed line "Showing demo visits only." above the numbers stays.
- `app/api/dashboard-summary/route.ts`: no `thinking` field (Opus 5.5 always thinks; `disabled` gives 400).

## Line counts of changed files

- lib/callerCheck.ts: 19 (new)
- lib/callerCheck.test.ts: 30 (new)
- data/summaryRead.ts: 39
- app/api/dashboard-summary/route.ts: 64
- lib/summaryMessage.ts: 25
- components/dashboard/SummaryPanel.tsx: 60

## Checked

- `npm test`: Test Files 90 passed (90), Tests 548 passed (548), on 2026-11-20 in this session.
- `npm run lint`: no problems, on 2026-11-20 in this session.
- `npm run build`: compiled successfully, on 2026-11-20 in this session.
- `lib/callerCheck.test.ts` failed first against the old behaviour (3 failed, 2 passed), then passed after the fix, with no change to the test.
- Live route on the local dev server, 2026-11-20 in this session: no token gave 401 `{"result":"not_signed_in"}`; `Bearer abc` gave 401 `{"result":"not_signed_in"}`; `Bearer` followed by only spaces gave 401 `{"result":"not_signed_in"}`.

## Not checked

- No live test with a signed-in account that is not staff (the project has no such account). The rule is covered by `lib/callerCheck.test.ts`.
- No live test of the `error` result during a Supabase outage.
- No test by hand of the button guard after the fix.

## Helper that the changed lines call (not in the diff)

### lib/staffAccess.ts (only the function used)

```ts
/** The parts of a sign-in token this check reads. Supabase sets app_metadata; users cannot. */
export type StaffClaims = { app_metadata?: Record<string, unknown> } | null | undefined;

/** True only when the account is marked role = staff (the same mark is_staff() checks). */
export function isStaffAccount(claims: StaffClaims): boolean {
  return claims?.app_metadata?.role === "staff";
}
```

## Diff

```diff
diff --git a/app/api/dashboard-summary/route.ts b/app/api/dashboard-summary/route.ts
index e01b46b..1314f38 100644
--- a/app/api/dashboard-summary/route.ts
+++ b/app/api/dashboard-summary/route.ts
@@ -19,7 +19,8 @@ function answer(body: Record<string, string>, status: number): Response {
 export async function POST(request: Request): Promise<Response> {
   if (!claudeIsSetUp()) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
 
-  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
+  const authorization = request.headers.get("authorization") ?? "";
+  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
   if (!token) return answer({ result: "not_signed_in" }, 401);
 
   let body: unknown;
@@ -34,6 +35,7 @@ export async function POST(request: Request): Promise<Response> {
   if (!wanted) return answer({ result: "bad_request" }, 400);
 
   const rows = await readSummaryRows(token, wanted.isDemo);
+  if (rows === "not_signed_in") return answer({ result: "not_signed_in" }, 401);
   if (rows === "not_staff") return answer({ result: "not_staff" }, 403);
   if (rows === "error") return answer({ result: "error" }, 500);
 
@@ -41,9 +43,10 @@ export async function POST(request: Request): Promise<Response> {
 
   try {
     // Opus 5.5 always thinks, so there is no thinking setting; "low" effort keeps this short and cheap.
+    // max_tokens counts the thinking too, so it is well above what 3 sentences need.
     const reply = await claudeClient().messages.create({
       model: CLAUDE_MODEL,
-      max_tokens: 400,
+      max_tokens: 1024,
       output_config: { effort: "low" },
       system: summarySystemPrompt(),
       messages: [{ role: "user", content: summaryUserMessage(input) }],
diff --git a/components/dashboard/SummaryPanel.tsx b/components/dashboard/SummaryPanel.tsx
index b4688fb..f48759b 100644
--- a/components/dashboard/SummaryPanel.tsx
+++ b/components/dashboard/SummaryPanel.tsx
@@ -18,14 +18,20 @@ export function SummaryPanel({ isDemo }: { isDemo: boolean }) {
   const [resting, setResting] = useState(false);
   const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 
-  useEffect(() => () => {
-    if (timer.current) clearTimeout(timer.current);
+  // When the dashboard closes, stop the 30-second timer.
+  useEffect(() => {
+    return () => {
+      if (timer.current) clearTimeout(timer.current);
+    };
   }, []);
 
   async function writeSummary() {
+    // One lock for Real and Demo together: it is the guard against two paid calls in 30 seconds.
+    if (waiting || resting) return;
     setWaiting(true);
     setResting(true);
     setShown(null);
+    if (timer.current) clearTimeout(timer.current);
     timer.current = setTimeout(() => setResting(false), WAIT_BETWEEN_CLICKS_MS);
     const forDemo = isDemo;
     setShown({ forDemo, message: await fetchDashboardSummary(forDemo) });
diff --git a/data/summaryRead.ts b/data/summaryRead.ts
index 247a48e..c6bfa32 100644
--- a/data/summaryRead.ts
+++ b/data/summaryRead.ts
@@ -4,15 +4,18 @@
 
 import { createClient } from "@supabase/supabase-js";
 import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
-import { isStaffAccount } from "@/lib/staffAccess";
+import { callerCheck } from "@/lib/callerCheck";
 import { torontoDay } from "@/lib/torontoDay";
 import { DASHBOARD_VISIT_FIELDS } from "./dashboardFields";
 import { supabaseSettings } from "./supabaseSettings";
 
 export type SummaryRows = { visits: DashboardVisit[]; stats: DailyStatsRow[]; today: string };
 
-/** The rows for one mode, or "not_staff" for a token that is not a staff account, or "error". */
-export async function readSummaryRows(token: string, isDemo: boolean): Promise<SummaryRows | "not_staff" | "error"> {
+/** The rows for one mode, or why there are none: see lib/callerCheck.ts for the sign-in results. */
+export async function readSummaryRows(
+  token: string,
+  isDemo: boolean,
+): Promise<SummaryRows | "not_signed_in" | "not_staff" | "error"> {
   const { url, publishableKey } = supabaseSettings();
   const asCaller = createClient(url, publishableKey, {
     auth: { persistSession: false, autoRefreshToken: false },
@@ -21,8 +24,8 @@ export async function readSummaryRows(token: string, isDemo: boolean): Promise<S
 
   // getUser asks Supabase to check the token, so a made-up token is refused here.
   const { data: userData, error: userError } = await asCaller.auth.getUser(token);
-  if (userError || !userData.user) return "not_staff";
-  if (!isStaffAccount(userData.user)) return "not_staff";
+  const caller = callerCheck(userData.user, userError);
+  if (caller !== "staff") return caller;
 
   const today = torontoDay(new Date().toISOString());
   const [visitRead, statsRead] = await Promise.all([
diff --git a/lib/callerCheck.test.ts b/lib/callerCheck.test.ts
new file mode 100644
index 0000000..4511a6e
--- /dev/null
+++ b/lib/callerCheck.test.ts
@@ -0,0 +1,30 @@
+import { describe, expect, it } from "vitest";
+import { callerCheck } from "./callerCheck";
+
+const staff = { app_metadata: { role: "staff" } };
+const patient = { app_metadata: {} };
+
+describe("caller check", () => {
+  it("lets a staff account in", () => {
+    expect(callerCheck(staff, null)).toBe("staff");
+  });
+
+  it("says not_staff for a good account without the staff role", () => {
+    expect(callerCheck(patient, null)).toBe("not_staff");
+  });
+
+  it("says not_signed_in for a token Supabase refuses (expired or made up)", () => {
+    expect(callerCheck(null, { status: 401 })).toBe("not_signed_in");
+    expect(callerCheck(null, { status: 403 })).toBe("not_signed_in");
+  });
+
+  it("says not_signed_in when Supabase finds no user and gives no error", () => {
+    expect(callerCheck(null, null)).toBe("not_signed_in");
+  });
+
+  it("says error for a fault in Supabase or the network, not a sign-in problem", () => {
+    expect(callerCheck(null, { status: 500 })).toBe("error");
+    expect(callerCheck(null, { status: 503 })).toBe("error");
+    expect(callerCheck(null, {})).toBe("error");
+  });
+});
diff --git a/lib/callerCheck.ts b/lib/callerCheck.ts
new file mode 100644
index 0000000..869c553
--- /dev/null
+++ b/lib/callerCheck.ts
@@ -0,0 +1,19 @@
+// Decides who is calling a staff-only server route, from Supabase's answer to getUser(token):
+// a staff account, a signed-in account that is not staff, a token that is not (or no longer) good,
+// or a fault in Supabase itself.
+
+import { isStaffAccount, type StaffClaims } from "./staffAccess";
+
+export type CallerCheck = "staff" | "not_staff" | "not_signed_in" | "error";
+
+/** user and error are what auth.getUser(token) gives back; only error.status is read. */
+export function callerCheck(user: StaffClaims, error: { status?: number } | null): CallerCheck {
+  if (error) {
+    // 401 and 403 mean Supabase refused the token. Any other status, or none (a network fault),
+    // is a problem on Supabase's side, so asking staff to sign in again would not help.
+    const refused = error.status === 401 || error.status === 403;
+    return refused ? "not_signed_in" : "error";
+  }
+  if (!user) return "not_signed_in";
+  return isStaffAccount(user) ? "staff" : "not_staff";
+}
diff --git a/lib/summaryMessage.ts b/lib/summaryMessage.ts
index 12b4c24..7aa161d 100644
--- a/lib/summaryMessage.ts
+++ b/lib/summaryMessage.ts
@@ -17,7 +17,8 @@ const FALLBACK = "The summary could not be written just now. The numbers above a
 /** status is the HTTP status; body is the parsed JSON, or null when there was none or it did not parse. */
 export function summaryMessage(status: number, body: unknown): SummaryMessage {
   if (status === 204) return { kind: "note", text: NOTES.off };
-  const { result, text } = (typeof body === "object" && body !== null ? body : {}) as { result?: unknown; text?: unknown };
+  if (typeof body !== "object" || body === null) return { kind: "note", text: FALLBACK };
+  const { result, text } = body as { result?: unknown; text?: unknown };
   if (result === "text" && typeof text === "string" && text.trim() !== "") return { kind: "text", text: text.trim() };
   if (typeof result === "string" && Object.hasOwn(NOTES, result)) return { kind: "note", text: NOTES[result] };
   return { kind: "note", text: FALLBACK };
```
