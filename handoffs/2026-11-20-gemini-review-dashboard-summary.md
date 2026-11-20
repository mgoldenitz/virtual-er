# Gemini review: dashboard summary (Claude feature 1)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Hydrogen 4 credits, Gemini 3.6 Flash, High.

## Question for the model

You review a change in a concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, TypeScript, Supabase with row-level security, synthetic data only). Find problems. Do not confirm that the code is good. For each problem, give the file, the line, what goes wrong, and the smallest fix.

The change adds a staff-only "Write a short summary" button on /dashboard. A server route checks that the caller is staff, counts today's totals itself, sends only the totals to the Claude API (model `claude-opus-5-5`, SDK `@anthropic-ai/sdk` 1.12.0), and shows 2 or 3 sentences.

Hard rules the change must keep:
1. Only totals go to the AI model. No codes, tokens, visit ids, times of single visits or survey text.
2. The AI model decides nothing clinical and gives no medical advice.
3. The route never trusts numbers from the browser. The browser sends only `{"isDemo": true|false}`.
4. Only staff accounts get a summary. The database reads run as the caller, so row-level security applies.

Look for: a way for a non-staff caller to get a summary or to make the route spend money; any field that could carry patient data to the model; wrong handling of the Claude reply (refusal, `max_tokens` cut-off, empty text); error cases that show the wrong text to staff; React state bugs in SummaryPanel.tsx (a summary for Real shown in Demo, the 30-second button lock); anything a beginner could not read.

Settled decisions (do not report these as faults):
- `app/api/dashboard-summary/route.ts` line 20: with no `ANTHROPIC_API_KEY`, the route returns 204 and the panel says the summary is off.
- `app/api/dashboard-summary/route.ts` lines 44-50: no `thinking` field. On Opus 5.5 thinking is always on, and `{type: "disabled"}` returns 400. `output_config: { effort: "low" }` is a real SDK field.
- `app/api/dashboard-summary/route.ts` lines 58-59: only a rate limit is told apart (503 `busy`); every other SDK error is 502 `claude_failed`.
- `data/claudeClient.ts`: one client, 20-second timeout, 1 retry.
- `components/dashboard/SummaryPanel.tsx`: the 30-second lock is in the browser only. It stops a double click; it is not a security limit.
- The summary is not saved anywhere.

## Line counts of changed files

- app/api/dashboard-summary/route.ts: 61
- data/claudeClient.ts: 22
- data/dashboardFields.ts: 5
- data/dashboardRead.ts: edited (uses DASHBOARD_VISIT_FIELDS)
- data/summaryRead.ts: 36
- data/dashboardSummary.ts: 23
- lib/summaryInput.ts, lib/summaryAnswer.ts, lib/summaryMessage.ts (24), lib/summaryPrompt.ts (32), each with a test file
- components/dashboard/SummaryPanel.tsx: 54
- components/dashboard/DashboardView.tsx: 48
- .env.example: one new line `ANTHROPIC_API_KEY=` with no value

## Checked

- `npm test`: Test Files 89 passed (89), Tests 543 passed (543), on 2026-11-20 in this session.
- `npm run lint`: no problems, on 2026-11-20 in this session.
- `npm run build`: compiled successfully; `/api/dashboard-summary` is a dynamic route.

- Test by hand on 2026-11-20 (reported by the owner in this session): `npm run dev`, staff sign-in, /dashboard, the button in Real and in Demo, with the real Claude API. Everything ran as expected.

## Not checked

- No test that a non-staff account gets 403 from the live route.
- No test that a call with no token gets 401 from the live route.

## Helpers that the changed lines call (not in the diff)

### lib/staffAccess.ts

```ts
// Who may open the staff screens (/staff and /dashboard): only a signed-in staff account.
// This is the quick check made before a page loads; the database's row-level security is
// the real lock, so a page opened anyway would still show no visit data.

/** The parts of a sign-in token this check reads. Supabase sets app_metadata; users cannot. */
export type StaffClaims = { app_metadata?: Record<string, unknown> } | null | undefined;

export type StaffAccess = "allow" | "sign_in" | "not_staff";

const STAFF_PATHS = ["/staff", "/dashboard"];

/** True for /staff, /dashboard and any page under them. */
export function isStaffPath(pathname: string): boolean {
  return STAFF_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** True only when the account is marked role = staff (the same mark is_staff() checks). */
export function isStaffAccount(claims: StaffClaims): boolean {
  return claims?.app_metadata?.role === "staff";
}

/** Let the page open, send the visitor to sign in, or tell them the account is not staff. */
export function staffAccess(pathname: string, claims: StaffClaims): StaffAccess {
  if (!isStaffPath(pathname)) return "allow";
  if (!claims) return "sign_in";
  return isStaffAccount(claims) ? "allow" : "not_staff";
}

/**
 * Where to go after signing in. Only a staff page is allowed, so a link like
 * /login?next=https://elsewhere.example cannot send staff to another site.
 */
export function pageAfterSignIn(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && isStaffPath(next.split(/[?#]/)[0])) {
    return next;
  }
  return "/staff";
}
```

### lib/torontoDay.ts

```ts
// Turns a moment in time into its calendar date in Toronto (for example "2026-11-18"), so "today" on the dashboard means the clinic's day.

// Built once at module level, because making a formatter is slow and the settings never change.
const torontoFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** For example "2026-11-19T04:30:00.000Z" gives "2026-11-18", because that is 23:30 on the 18th in Toronto. */
export function torontoDay(iso: string): string {
  return torontoFormat.format(new Date(iso));
}
```

### data/supabaseSettings.ts

```ts
// Reads the two public Supabase settings from .env.local (or Vercel's settings), and says
// plainly which one is missing instead of failing with an unclear error later.
// Next.js only copies NEXT_PUBLIC_ values into the browser when they are written out in full,
// so each one is named exactly here.

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

### data/supabaseBrowser.ts

```ts
// The one Supabase connection used by screens in the browser. It uses only the publishable
// key, so what it can see is decided by row-level security: everything for signed-in staff,
// and for patients only the token functions.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSettings } from "./supabaseSettings";

let client: SupabaseClient | undefined;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = supabaseSettings();
    client = createBrowserClient(url, publishableKey);
  }
  return client;
}
```

### lib/dashboardNumbers.ts

```ts
// Counts the staff dashboard numbers for one day, per site: the live visits plus the daily_stats totals.
// Raw counts and sums only. Percentages and averages are worked out by another file.

import { torontoDay } from "./torontoDay";
import type { Site, Visit } from "./visit";

/** One row of daily_stats (see supabase/migrations/20261116100000_daily_stats_and_cleanup.sql). */
export type DailyStatsRow = {
  day: string;
  site: Site;
  is_demo: boolean;
  triaged_ctas_4_5: number;
  not_eligible: number;
  offered: number;
  declined: number;
  called_and_arrived: number;
  call_to_arrival_seconds: number;
  arrived: number;
  no_shows: number;
  removed_left: number;
  unable_to_reach: number;
  open_at_deletion: number;
  started_from_home: number;
  home_reached_triage: number;
  survey_responses: number;
  survey_score_sum: number;
  survey_9_or_10: number;
};

/** The visit fields the dashboard reads. */
export type DashboardVisit = Pick<
  Visit,
  | "site"
  | "source"
  | "ctas_level"
  | "status"
  | "removed_reason"
  | "created_at"
  | "triaged_at"
  | "offered_at"
  | "called_at"
  | "arrived_at"
  | "closed_at"
  | "survey_score"
  | "is_demo"
>;

/** Raw counts and sums for one site. */
export type SiteNumbers = {
  waitingNow: number;
  recalledNow: number;
  reassessmentNow: number;
  triaged: number;
  offered: number;
  declined: number;
  accepted: number;
  arrivedAfterRecall: number;
  recallToArrivalSeconds: number;
  noShows: number;
  unableToReach: number;
  left: number;
  startedFromHome: number;
  homeReachedTriage: number;
  surveyResponses: number;
  surveyScoreSum: number;
  survey9or10: number;
};

/** Counts every number for both sites. Only rows whose is_demo equals isDemo are used. */
export function dashboardNumbers(
  visits: DashboardVisit[],
  stats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): Record<Site, SiteNumbers> {
  return {
    A: siteNumbers("A", visits, stats, today, isDemo),
    B: siteNumbers("B", visits, stats, today, isDemo),
  };
}

function siteNumbers(
  site: Site,
  allVisits: DashboardVisit[],
  allStats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): SiteNumbers {
  const visits = allVisits.filter((v) => v.site === site && v.is_demo === isDemo);
  const stats = allStats.filter((s) => s.site === site && s.is_demo === isDemo && s.day === today);

  // True when this moment falls on today's Toronto date.
  const on = (iso: string | null): boolean => iso !== null && torontoDay(iso) === today;
  // Count the live visits that pass a test.
  const countVisits = (test: (v: DashboardVisit) => boolean): number => visits.filter(test).length;
  // Add up one daily_stats column over today's rows.
  const fromStats = (column: (s: DailyStatsRow) => number): number =>
    stats.reduce((total, s) => total + column(s), 0);

  // Visits that were called, then arrived today (the set behind the call-to-arrival average).
  const calledAndArrived = visits.filter(
    (v) => v.status === "arrived" && v.called_at !== null && on(v.arrived_at),
  );
  // Visits that answered a survey today (closed today with a score).
  const surveyed = visits.filter((v) => v.survey_score !== null && on(v.closed_at));
  // Visits started from home today.
  const startedHome = visits.filter((v) => v.source === "home" && on(v.created_at));

  const offered = countVisits((v) => on(v.offered_at)) + fromStats((s) => s.offered);
  const declined =
    countVisits((v) => v.status === "declined" && on(v.offered_at)) + fromStats((s) => s.declined);

  return {
    // Live now: no date test, because daily_stats has no "now" numbers.
    waitingNow: countVisits((v) => v.status === "waiting"),
    recalledNow: countVisits((v) => v.status === "called" || v.status === "on_the_way"),
    reassessmentNow: countVisits((v) => v.status === "needs_reassessment"),

    // CTAS 4 or 5 patients triaged today.
    triaged:
      countVisits((v) => (v.ctas_level === 4 || v.ctas_level === 5) && on(v.triaged_at)) +
      fromStats((s) => s.triaged_ctas_4_5),
    // Visits offered off-site waiting today.
    offered,
    // Offered today and then declined.
    declined,
    // Offered minus declined.
    accepted: offered - declined,

    // Called, then arrived today.
    arrivedAfterRecall: calledAndArrived.length + fromStats((s) => s.called_and_arrived),
    // Total seconds from call-back to arrival, rounded to whole seconds per visit.
    recallToArrivalSeconds:
      calledAndArrived.reduce((total, v) => total + secondsBetween(v.called_at, v.arrived_at), 0) +
      fromStats((s) => s.call_to_arrival_seconds),

    // Removed today as no-shows, or as left.
    noShows:
      countVisits((v) => v.status === "removed" && v.removed_reason === "no_show" && on(v.closed_at)) +
      fromStats((s) => s.no_shows),
    left:
      countVisits((v) => v.status === "removed" && v.removed_reason === "left" && on(v.closed_at)) +
      fromStats((s) => s.removed_left),
    // Confirmed unable to reach today.
    unableToReach:
      countVisits((v) => v.status === "unable_to_reach" && on(v.closed_at)) +
      fromStats((s) => s.unable_to_reach),

    // Started from home today, and of those, reached triage.
    startedFromHome: startedHome.length + fromStats((s) => s.started_from_home),
    homeReachedTriage:
      startedHome.filter((v) => v.triaged_at !== null).length + fromStats((s) => s.home_reached_triage),

    // Survey answers given today: the count, the score total, and the 9 or 10 scores.
    surveyResponses: surveyed.length + fromStats((s) => s.survey_responses),
    surveyScoreSum:
      surveyed.reduce((total, v) => total + (v.survey_score ?? 0), 0) + fromStats((s) => s.survey_score_sum),
    survey9or10:
      surveyed.filter((v) => v.survey_score === 9 || v.survey_score === 10).length +
      fromStats((s) => s.survey_9_or_10),
  };
}

// Whole seconds from one time to another (0 if either time is missing).
function secondsBetween(from: string | null, to: string | null): number {
  if (from === null || to === null) return 0;
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}
```

## Diff

```diff
diff --git a/.env.example b/.env.example
index 169fee2..366e1d1 100644
--- a/.env.example
+++ b/.env.example
@@ -28,6 +28,12 @@ CRON_SECRET=
 PUSHOVER_APP_TOKEN=
 PUSHOVER_USER_KEY=
 
+# Claude API key for the dashboard's "Write a short summary" button (app/api/dashboard-summary).
+# Make it at console.anthropic.com > API Keys. Keep it out of chat and out of git. SERVER ONLY:
+# never put NEXT_PUBLIC_ in front of it. Leave it empty to turn the summary off.
+# Vercel: Project Settings > Environment Variables, name ANTHROPIC_API_KEY (Production and Preview).
+ANTHROPIC_API_KEY=
+
 # Test staff account for the end-to-end tests (npm run e2e). LOCAL ONLY: never on Vercel.
 # Make the user in Supabase dashboard > Authentication > Users > Add user (auto-confirm on),
 # then give it the staff role in the SQL Editor. Use a test account, not your own.
diff --git a/app/api/dashboard-summary/route.ts b/app/api/dashboard-summary/route.ts
new file mode 100644
index 0000000..e01b46b
--- /dev/null
+++ b/app/api/dashboard-summary/route.ts
@@ -0,0 +1,61 @@
+// The server route behind the dashboard's "Write a short summary" button. It checks the caller
+// is staff, counts today's numbers itself (it never takes numbers from the browser), sends only
+// those totals to Claude, and returns Claude's 2 or 3 sentences. With no ANTHROPIC_API_KEY, it does nothing.
+
+import Anthropic from "@anthropic-ai/sdk";
+import { CLAUDE_MODEL, claudeClient, claudeIsSetUp } from "@/data/claudeClient";
+import { readSummaryRows } from "@/data/summaryRead";
+import { dashboardNumbers } from "@/lib/dashboardNumbers";
+import { summaryAnswer } from "@/lib/summaryAnswer";
+import { parseSummaryBody, summaryInput } from "@/lib/summaryInput";
+import { summarySystemPrompt, summaryUserMessage } from "@/lib/summaryPrompt";
+
+const MAX_BODY_CHARACTERS = 100; // the body is only {"isDemo":true}
+
+function answer(body: Record<string, string>, status: number): Response {
+  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
+}
+
+export async function POST(request: Request): Promise<Response> {
+  if (!claudeIsSetUp()) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
+
+  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
+  if (!token) return answer({ result: "not_signed_in" }, 401);
+
+  let body: unknown;
+  try {
+    const text = await request.text();
+    if (text.length > MAX_BODY_CHARACTERS) return answer({ result: "bad_request" }, 400);
+    body = JSON.parse(text);
+  } catch {
+    return answer({ result: "bad_request" }, 400);
+  }
+  const wanted = parseSummaryBody(body);
+  if (!wanted) return answer({ result: "bad_request" }, 400);
+
+  const rows = await readSummaryRows(token, wanted.isDemo);
+  if (rows === "not_staff") return answer({ result: "not_staff" }, 403);
+  if (rows === "error") return answer({ result: "error" }, 500);
+
+  const input = summaryInput(dashboardNumbers(rows.visits, rows.stats, rows.today, wanted.isDemo), wanted.isDemo);
+
+  try {
+    // Opus 5.5 always thinks, so there is no thinking setting; "low" effort keeps this short and cheap.
+    const reply = await claudeClient().messages.create({
+      model: CLAUDE_MODEL,
+      max_tokens: 400,
+      output_config: { effort: "low" },
+      system: summarySystemPrompt(),
+      messages: [{ role: "user", content: summaryUserMessage(input) }],
+    });
+    const result = summaryAnswer(reply);
+    return result.kind === "text"
+      ? answer({ result: "text", text: result.text }, 200)
+      : answer({ result: result.reason }, 200);
+  } catch (error) {
+    // Too many requests is told apart, so staff know a later try can work. Every other failure
+    // (a timeout, a wrong key, a network fault) is one plain result.
+    if (error instanceof Anthropic.RateLimitError) return answer({ result: "busy" }, 503);
+    return answer({ result: "claude_failed" }, 502);
+  }
+}
diff --git a/components/dashboard/DashboardView.tsx b/components/dashboard/DashboardView.tsx
index 5b88220..c2554a0 100644
--- a/components/dashboard/DashboardView.tsx
+++ b/components/dashboard/DashboardView.tsx
@@ -8,6 +8,7 @@ import { useDashboard } from "@/data/useDashboard";
 import { dashboardNumbers } from "@/lib/dashboardNumbers";
 import { ModeSwitch } from "@/components/dashboard/ModeSwitch";
 import { SiteNumbers } from "@/components/dashboard/SiteNumbers";
+import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
 
 export function DashboardView() {
   const [isDemo, setIsDemo] = useState(false);
@@ -30,10 +31,13 @@ export function DashboardView() {
       )}
 
       {counts ? (
-        <div className="grid gap-4 md:grid-cols-2">
-          <SiteNumbers site="A" numbers={counts.A} />
-          <SiteNumbers site="B" numbers={counts.B} />
-        </div>
+        <>
+          <div className="grid gap-4 md:grid-cols-2">
+            <SiteNumbers site="A" numbers={counts.A} />
+            <SiteNumbers site="B" numbers={counts.B} />
+          </div>
+          <SummaryPanel isDemo={isDemo} />
+        </>
       ) : outOfDate ? (
         <p>No numbers to show yet.</p>
       ) : (
diff --git a/components/dashboard/SummaryPanel.tsx b/components/dashboard/SummaryPanel.tsx
new file mode 100644
index 0000000..b4688fb
--- /dev/null
+++ b/components/dashboard/SummaryPanel.tsx
@@ -0,0 +1,54 @@
+"use client";
+
+// The "Write a short summary" button under the dashboard numbers. It asks the server for 2 or 3
+// sentences about today's totals and shows them with a line that an AI model wrote them.
+// The button stays off for 30 seconds after a click, so a double click does not pay twice.
+
+import { useEffect, useRef, useState } from "react";
+import { Button } from "@/components/Button";
+import { fetchDashboardSummary } from "@/data/dashboardSummary";
+import type { SummaryMessage } from "@/lib/summaryMessage";
+
+const WAIT_BETWEEN_CLICKS_MS = 30_000;
+
+export function SummaryPanel({ isDemo }: { isDemo: boolean }) {
+  // The summary keeps the mode it was written for; after a Real or Demo switch it is hidden.
+  const [shown, setShown] = useState<{ forDemo: boolean; message: SummaryMessage } | null>(null);
+  const [waiting, setWaiting] = useState(false);
+  const [resting, setResting] = useState(false);
+  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
+
+  useEffect(() => () => {
+    if (timer.current) clearTimeout(timer.current);
+  }, []);
+
+  async function writeSummary() {
+    setWaiting(true);
+    setResting(true);
+    setShown(null);
+    timer.current = setTimeout(() => setResting(false), WAIT_BETWEEN_CLICKS_MS);
+    const forDemo = isDemo;
+    setShown({ forDemo, message: await fetchDashboardSummary(forDemo) });
+    setWaiting(false);
+  }
+
+  const message = shown && shown.forDemo === isDemo ? shown.message : null;
+
+  return (
+    <section aria-label="Summary" className="space-y-3 rounded-lg border-2 border-slate-300 bg-white p-4">
+      <Button variant="secondary" onClick={writeSummary} disabled={waiting || resting}>
+        Write a short summary
+      </Button>
+      {waiting && <p role="status">Writing the summary...</p>}
+      {message?.kind === "text" && (
+        <>
+          <p>{message.text}</p>
+          <p className="text-sm text-slate-700">
+            {"Written by an AI model from today's totals. Check the numbers above."}
+          </p>
+        </>
+      )}
+      {message?.kind === "note" && <p role="status">{message.text}</p>}
+    </section>
+  );
+}
diff --git a/data/claudeClient.ts b/data/claudeClient.ts
new file mode 100644
index 0000000..d0b7daf
--- /dev/null
+++ b/data/claudeClient.ts
@@ -0,0 +1,22 @@
+// The one connection to Claude (the Anthropic API). It runs only on the server (the first line
+// makes the build fail if a browser file imports it). The key is read from ANTHROPIC_API_KEY in
+// .env.local (or Vercel's Environment Variables page), never from code.
+
+import "server-only";
+import Anthropic from "@anthropic-ai/sdk";
+
+/** The model every Claude feature in this app uses. */
+export const CLAUDE_MODEL = "claude-opus-5-5";
+
+let client: Anthropic | undefined;
+
+/** True when the key is set, so a route can switch its feature off without an error. */
+export function claudeIsSetUp(): boolean {
+  return Boolean(process.env.ANTHROPIC_API_KEY);
+}
+
+export function claudeClient(): Anthropic {
+  // Stop after 20 seconds and try once more at most, so a slow answer cannot keep a function open.
+  if (!client) client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
+  return client;
+}
diff --git a/data/dashboardFields.ts b/data/dashboardFields.ts
new file mode 100644
index 0000000..0679396
--- /dev/null
+++ b/data/dashboardFields.ts
@@ -0,0 +1,5 @@
+// The visit fields the dashboard reads, shared by the dashboard screen (data/dashboardRead.ts) and
+// the summary route (data/summaryRead.ts). Nothing here may name access_token or code.
+
+export const DASHBOARD_VISIT_FIELDS =
+  "site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo";
diff --git a/data/dashboardRead.ts b/data/dashboardRead.ts
index 2d13c18..539f591 100644
--- a/data/dashboardRead.ts
+++ b/data/dashboardRead.ts
@@ -4,6 +4,7 @@
 
 import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
 import { torontoDay } from "@/lib/torontoDay";
+import { DASHBOARD_VISIT_FIELDS } from "./dashboardFields";
 import { keepFresh } from "./keepFresh";
 import { serverNow } from "./serverClock";
 import { supabaseBrowser } from "./supabaseBrowser";
@@ -18,9 +19,6 @@ export type DashboardData = {
 
 export const EMPTY_DASHBOARD: DashboardData = { visits: null, stats: [], today: "", outOfDate: false };
 
-// Only these visit fields are read. Nothing here may name access_token or code.
-const VISIT_FIELDS =
-  "site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo";
 const REREAD_MS = 15_000; // in case a live update was missed
 
 type Store = {
@@ -66,7 +64,7 @@ export async function loadDashboard(isDemo: boolean): Promise<void> {
     const today = torontoDay(serverNow().toISOString());
     const db = supabaseBrowser();
     const [visitRead, statsRead] = await Promise.all([
-      db.from("visits").select(VISIT_FIELDS).eq("is_demo", isDemo),
+      db.from("visits").select(DASHBOARD_VISIT_FIELDS).eq("is_demo", isDemo),
       db.from("daily_stats").select("*").eq("is_demo", isDemo).eq("day", today),
     ]);
     if (!visitRead.error && !statsRead.error && Array.isArray(visitRead.data) && Array.isArray(statsRead.data)) {
diff --git a/data/dashboardSummary.ts b/data/dashboardSummary.ts
new file mode 100644
index 0000000..ab1d417
--- /dev/null
+++ b/data/dashboardSummary.ts
@@ -0,0 +1,23 @@
+// Asks the server for the short summary of today's numbers (app/api/dashboard-summary), with the
+// staff sign-in token, and turns the answer into the words the panel shows.
+
+import { summaryMessage, type SummaryMessage } from "@/lib/summaryMessage";
+import { supabaseBrowser } from "./supabaseBrowser";
+
+export async function fetchDashboardSummary(isDemo: boolean): Promise<SummaryMessage> {
+  try {
+    const { data } = await supabaseBrowser().auth.getSession();
+    const token = data.session?.access_token;
+    if (!token) return summaryMessage(401, { result: "not_signed_in" });
+    const response = await fetch("/api/dashboard-summary", {
+      method: "POST",
+      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
+      body: JSON.stringify({ isDemo }),
+    });
+    const body = response.status === 204 ? null : await response.json().catch(() => null);
+    return summaryMessage(response.status, body);
+  } catch {
+    // No connection: the fallback line says the numbers above are still correct.
+    return summaryMessage(0, null);
+  }
+}
diff --git a/data/summaryRead.ts b/data/summaryRead.ts
new file mode 100644
index 0000000..247a48e
--- /dev/null
+++ b/data/summaryRead.ts
@@ -0,0 +1,36 @@
+// The summary route's database read: checks that the sign-in token belongs to a staff account,
+// then reads today's visits and daily_stats rows as that person, so the database rules still apply.
+// It reads the same fields as the dashboard screen, never access_token or code.
+
+import { createClient } from "@supabase/supabase-js";
+import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
+import { isStaffAccount } from "@/lib/staffAccess";
+import { torontoDay } from "@/lib/torontoDay";
+import { DASHBOARD_VISIT_FIELDS } from "./dashboardFields";
+import { supabaseSettings } from "./supabaseSettings";
+
+export type SummaryRows = { visits: DashboardVisit[]; stats: DailyStatsRow[]; today: string };
+
+/** The rows for one mode, or "not_staff" for a token that is not a staff account, or "error". */
+export async function readSummaryRows(token: string, isDemo: boolean): Promise<SummaryRows | "not_staff" | "error"> {
+  const { url, publishableKey } = supabaseSettings();
+  const asCaller = createClient(url, publishableKey, {
+    auth: { persistSession: false, autoRefreshToken: false },
+    global: { headers: { Authorization: `Bearer ${token}` } },
+  });
+
+  // getUser asks Supabase to check the token, so a made-up token is refused here.
+  const { data: userData, error: userError } = await asCaller.auth.getUser(token);
+  if (userError || !userData.user) return "not_staff";
+  if (!isStaffAccount(userData.user)) return "not_staff";
+
+  const today = torontoDay(new Date().toISOString());
+  const [visitRead, statsRead] = await Promise.all([
+    asCaller.from("visits").select(DASHBOARD_VISIT_FIELDS).eq("is_demo", isDemo),
+    asCaller.from("daily_stats").select("*").eq("is_demo", isDemo).eq("day", today),
+  ]);
+  if (visitRead.error || statsRead.error || !Array.isArray(visitRead.data) || !Array.isArray(statsRead.data)) {
+    return "error";
+  }
+  return { visits: visitRead.data as DashboardVisit[], stats: statsRead.data as DailyStatsRow[], today };
+}
diff --git a/lib/summaryAnswer.test.ts b/lib/summaryAnswer.test.ts
new file mode 100644
index 0000000..4e92c7e
--- /dev/null
+++ b/lib/summaryAnswer.test.ts
@@ -0,0 +1,66 @@
+import { describe, expect, it } from "vitest";
+import { summaryAnswer, SUMMARY_NONE_TEXT, type ReplyLike } from "./summaryAnswer";
+
+function reply(extra: Partial<ReplyLike> = {}): ReplyLike {
+  return {
+    stop_reason: "end_turn",
+    content: [{ type: "text", text: "Site A has 3 visits waiting." }],
+    ...extra,
+  };
+}
+
+describe("summary answer", () => {
+  it("gives none with reason refusal when stop_reason is refusal", () => {
+    expect(summaryAnswer(reply({ stop_reason: "refusal" }))).toEqual({ kind: "none", reason: "refusal" });
+  });
+
+  it("gives none with reason cut_off when stop_reason is max_tokens", () => {
+    expect(summaryAnswer(reply({ stop_reason: "max_tokens" }))).toEqual({ kind: "none", reason: "cut_off" });
+  });
+
+  it("checks the stop reason before the text, so a refusal with text is still none", () => {
+    expect(summaryAnswer(reply({ stop_reason: "refusal" }))).toEqual({ kind: "none", reason: "refusal" });
+  });
+
+  it("gives none with reason empty when there is no text block", () => {
+    expect(summaryAnswer(reply({ content: [] }))).toEqual({ kind: "none", reason: "empty" });
+  });
+
+  it("gives none with reason empty when the text is only spaces", () => {
+    expect(summaryAnswer(reply({ content: [{ type: "text", text: "   " }] }))).toEqual({
+      kind: "none",
+      reason: "empty",
+    });
+  });
+
+  it("gives the trimmed text when there is one text block", () => {
+    expect(summaryAnswer(reply({ content: [{ type: "text", text: "  Site B is quiet.  " }] }))).toEqual({
+      kind: "text",
+      text: "Site B is quiet.",
+    });
+  });
+
+  it("skips thinking blocks and joins two text blocks with a space", () => {
+    const out = summaryAnswer(
+      reply({
+        content: [
+          { type: "thinking", text: "Let me add the totals." },
+          { type: "text", text: "Site A has 3 visits waiting." },
+          { type: "text", text: "Site B has 1." },
+        ],
+      }),
+    );
+    expect(out).toEqual({ kind: "text", text: "Site A has 3 visits waiting. Site B has 1." });
+  });
+
+  it("has plain staff text for each reason, with straight quotes and no em dashes", () => {
+    for (const text of Object.values(SUMMARY_NONE_TEXT)) {
+      expect(text).not.toContain(String.fromCharCode(0x2014));
+      expect(text).not.toContain(String.fromCharCode(0x201c));
+      expect(text).not.toContain(String.fromCharCode(0x201d));
+    }
+    expect(SUMMARY_NONE_TEXT.refusal).toBe(
+      "The summary could not be written for these numbers. The numbers above are still correct.",
+    );
+  });
+});
diff --git a/lib/summaryAnswer.ts b/lib/summaryAnswer.ts
new file mode 100644
index 0000000..8f5a217
--- /dev/null
+++ b/lib/summaryAnswer.ts
@@ -0,0 +1,33 @@
+// Turns Claude's reply to the dashboard summary into either the text to show or a plain staff message saying why there is none.
+// The shape is small on purpose, so this file does not import the Anthropic SDK.
+
+/** The parts of a Claude reply this file reads. */
+export type ReplyLike = {
+  stop_reason: string | null;
+  content: Array<{ type: string; text?: string }>;
+};
+
+/** Either the summary text, or the reason there is none. */
+export type SummaryAnswer =
+  | { kind: "text"; text: string }
+  | { kind: "none"; reason: "refusal" | "cut_off" | "empty" };
+
+/** The message staff see for each reason there is no summary. */
+export const SUMMARY_NONE_TEXT: Record<"refusal" | "cut_off" | "empty", string> = {
+  refusal: "The summary could not be written for these numbers. The numbers above are still correct.",
+  cut_off: "The summary was too long and was stopped. Please try again.",
+  empty: "The summary came back empty. Please try again.",
+};
+
+/** Checks the stop reason first, then joins the text blocks (thinking blocks are skipped). */
+export function summaryAnswer(reply: ReplyLike): SummaryAnswer {
+  if (reply.stop_reason === "refusal") return { kind: "none", reason: "refusal" };
+  if (reply.stop_reason === "max_tokens") return { kind: "none", reason: "cut_off" };
+  const text = reply.content
+    .filter((block) => block.type === "text")
+    .map((block) => block.text ?? "")
+    .join(" ")
+    .trim();
+  if (text === "") return { kind: "none", reason: "empty" };
+  return { kind: "text", text };
+}
diff --git a/lib/summaryInput.test.ts b/lib/summaryInput.test.ts
new file mode 100644
index 0000000..b937e42
--- /dev/null
+++ b/lib/summaryInput.test.ts
@@ -0,0 +1,77 @@
+import { describe, expect, it } from "vitest";
+import type { SiteNumbers } from "./dashboardNumbers";
+import { parseSummaryBody, summaryInput } from "./summaryInput";
+
+const KEYS = [
+  "waitingNow",
+  "recalledNow",
+  "reassessmentNow",
+  "triaged",
+  "offered",
+  "declined",
+  "accepted",
+  "arrivedAfterRecall",
+  "recallToArrivalSeconds",
+  "noShows",
+  "unableToReach",
+  "left",
+  "startedFromHome",
+  "homeReachedTriage",
+  "surveyResponses",
+  "surveyScoreSum",
+  "survey9or10",
+];
+
+function numbers(base: number): SiteNumbers {
+  const out = {} as Record<string, number>;
+  KEYS.forEach((k, i) => {
+    out[k] = base + i;
+  });
+  return out as unknown as SiteNumbers;
+}
+
+describe("summary input", () => {
+  it("gives each site exactly the 17 SiteNumbers keys, all numbers", () => {
+    const out = summaryInput({ A: numbers(1), B: numbers(100) }, true);
+    expect(Object.keys(out.sites).sort()).toEqual(["A", "B"]);
+    for (const site of ["A", "B"] as const) {
+      expect(Object.keys(out.sites[site]).sort()).toEqual([...KEYS].sort());
+      for (const value of Object.values(out.sites[site])) {
+        expect(typeof value).toBe("number");
+      }
+    }
+    expect(out.sites.B.waitingNow).toBe(100);
+    expect(out.sites.A.survey9or10).toBe(1 + 16);
+  });
+
+  it("leaves out an extra field that is not a SiteNumbers field, such as a visit code", () => {
+    const withCode = { ...numbers(1), code: "ABC234" } as unknown as SiteNumbers;
+    const out = summaryInput({ A: withCode, B: numbers(100) }, false);
+    expect(Object.keys(out.sites.A)).not.toContain("code");
+    expect(JSON.stringify(out)).not.toContain("ABC234");
+  });
+
+  it("carries isDemo over", () => {
+    expect(summaryInput({ A: numbers(1), B: numbers(1) }, true).isDemo).toBe(true);
+    expect(summaryInput({ A: numbers(1), B: numbers(1) }, false).isDemo).toBe(false);
+  });
+});
+
+describe("summary body", () => {
+  it("accepts a boolean isDemo", () => {
+    expect(parseSummaryBody({ isDemo: true })).toEqual({ isDemo: true });
+    expect(parseSummaryBody({ isDemo: false })).toEqual({ isDemo: false });
+  });
+
+  it("refuses a non-boolean isDemo, a missing isDemo, and a body that is not a plain object", () => {
+    expect(parseSummaryBody({ isDemo: "yes" })).toBeNull();
+    expect(parseSummaryBody({})).toBeNull();
+    expect(parseSummaryBody(null)).toBeNull();
+    expect(parseSummaryBody([])).toBeNull();
+    expect(parseSummaryBody("x")).toBeNull();
+  });
+
+  it("ignores extra fields and returns only isDemo", () => {
+    expect(parseSummaryBody({ isDemo: true, other: 1 })).toEqual({ isDemo: true });
+  });
+});
diff --git a/lib/summaryInput.ts b/lib/summaryInput.ts
new file mode 100644
index 0000000..3eebb3d
--- /dev/null
+++ b/lib/summaryInput.ts
@@ -0,0 +1,44 @@
+// Picks the only numbers that may leave for the Claude dashboard summary, and reads the request body that asks for one.
+// Each field is copied by name, so a field added later to SiteNumbers is never sent by accident (SPEC rule 1).
+
+import type { SiteNumbers } from "./dashboardNumbers";
+import type { Site } from "./visit";
+
+/** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers. */
+export type SummaryInput = { isDemo: boolean; sites: Record<Site, SiteNumbers> };
+
+/** Copies the 17 SiteNumbers fields for sites A and B into new objects, and nothing else. */
+export function summaryInput(numbers: Record<Site, SiteNumbers>, isDemo: boolean): SummaryInput {
+  return { isDemo, sites: { A: siteTotals(numbers.A), B: siteTotals(numbers.B) } };
+}
+
+/** The body the staff browser sends: `{ isDemo: true }` or `{ isDemo: false }`. Anything else gives null. */
+export function parseSummaryBody(body: unknown): { isDemo: boolean } | null {
+  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
+  const isDemo = (body as { isDemo?: unknown }).isDemo;
+  if (typeof isDemo !== "boolean") return null;
+  return { isDemo };
+}
+
+// Copies one site's 17 fields by name.
+function siteTotals(n: SiteNumbers): SiteNumbers {
+  return {
+    waitingNow: n.waitingNow,
+    recalledNow: n.recalledNow,
+    reassessmentNow: n.reassessmentNow,
+    triaged: n.triaged,
+    offered: n.offered,
+    declined: n.declined,
+    accepted: n.accepted,
+    arrivedAfterRecall: n.arrivedAfterRecall,
+    recallToArrivalSeconds: n.recallToArrivalSeconds,
+    noShows: n.noShows,
+    unableToReach: n.unableToReach,
+    left: n.left,
+    startedFromHome: n.startedFromHome,
+    homeReachedTriage: n.homeReachedTriage,
+    surveyResponses: n.surveyResponses,
+    surveyScoreSum: n.surveyScoreSum,
+    survey9or10: n.survey9or10,
+  };
+}
diff --git a/lib/summaryMessage.test.ts b/lib/summaryMessage.test.ts
new file mode 100644
index 0000000..31a2b74
--- /dev/null
+++ b/lib/summaryMessage.test.ts
@@ -0,0 +1,36 @@
+import { describe, expect, it } from "vitest";
+import { SUMMARY_NONE_TEXT } from "./summaryAnswer";
+import { summaryMessage } from "./summaryMessage";
+
+describe("summary message", () => {
+  it("shows Claude's text, trimmed", () => {
+    expect(summaryMessage(200, { result: "text", text: "  Site A is quiet.  " })).toEqual({
+      kind: "text",
+      text: "Site A is quiet.",
+    });
+  });
+
+  it("says the summary is off when the route has no key (204)", () => {
+    expect(summaryMessage(204, null)).toEqual({ kind: "note", text: "The summary is switched off on this server." });
+  });
+
+  it("uses the reply-check text for a refusal, a cut-off or an empty reply", () => {
+    expect(summaryMessage(200, { result: "refusal" }).text).toBe(SUMMARY_NONE_TEXT.refusal);
+    expect(summaryMessage(200, { result: "cut_off" }).text).toBe(SUMMARY_NONE_TEXT.cut_off);
+    expect(summaryMessage(200, { result: "empty" }).text).toBe(SUMMARY_NONE_TEXT.empty);
+  });
+
+  it("names sign-in, staff and busy answers", () => {
+    expect(summaryMessage(401, { result: "not_signed_in" }).text).toBe("Please sign in again to get a summary.");
+    expect(summaryMessage(403, { result: "not_staff" }).text).toBe("Only staff accounts can get a summary.");
+    expect(summaryMessage(503, { result: "busy" }).text).toBe("The summary service is busy. Please try again in a minute.");
+  });
+
+  it("falls back to one plain line for anything else", () => {
+    const fallback = "The summary could not be written just now. The numbers above are still correct.";
+    expect(summaryMessage(502, { result: "claude_failed" }).text).toBe(fallback);
+    expect(summaryMessage(500, null).text).toBe(fallback);
+    expect(summaryMessage(200, { result: "text", text: "   " }).text).toBe(fallback);
+    expect(summaryMessage(200, { result: "toString" }).text).toBe(fallback);
+  });
+});
diff --git a/lib/summaryMessage.ts b/lib/summaryMessage.ts
new file mode 100644
index 0000000..12b4c24
--- /dev/null
+++ b/lib/summaryMessage.ts
@@ -0,0 +1,24 @@
+// Decides what the dashboard's summary panel shows for the summary route's answer: Claude's
+// text, or one plain staff line that says why there is no summary.
+
+import { SUMMARY_NONE_TEXT } from "./summaryAnswer";
+
+export type SummaryMessage = { kind: "text"; text: string } | { kind: "note"; text: string };
+
+const NOTES: Record<string, string> = {
+  ...SUMMARY_NONE_TEXT,
+  off: "The summary is switched off on this server.",
+  not_signed_in: "Please sign in again to get a summary.",
+  not_staff: "Only staff accounts can get a summary.",
+  busy: "The summary service is busy. Please try again in a minute.",
+};
+const FALLBACK = "The summary could not be written just now. The numbers above are still correct.";
+
+/** status is the HTTP status; body is the parsed JSON, or null when there was none or it did not parse. */
+export function summaryMessage(status: number, body: unknown): SummaryMessage {
+  if (status === 204) return { kind: "note", text: NOTES.off };
+  const { result, text } = (typeof body === "object" && body !== null ? body : {}) as { result?: unknown; text?: unknown };
+  if (result === "text" && typeof text === "string" && text.trim() !== "") return { kind: "text", text: text.trim() };
+  if (typeof result === "string" && Object.hasOwn(NOTES, result)) return { kind: "note", text: NOTES[result] };
+  return { kind: "note", text: FALLBACK };
+}
diff --git a/lib/summaryPrompt.test.ts b/lib/summaryPrompt.test.ts
new file mode 100644
index 0000000..72c6a6c
--- /dev/null
+++ b/lib/summaryPrompt.test.ts
@@ -0,0 +1,33 @@
+import { describe, expect, it } from "vitest";
+import type { SiteNumbers } from "./dashboardNumbers";
+import { summaryInput } from "./summaryInput";
+import { SUMMARY_RULES, summarySystemPrompt, summaryUserMessage } from "./summaryPrompt";
+
+const zero: SiteNumbers = {
+  waitingNow: 0, recalledNow: 0, reassessmentNow: 0, triaged: 0, offered: 0, declined: 0, accepted: 0,
+  arrivedAfterRecall: 0, recallToArrivalSeconds: 0, noShows: 0, unableToReach: 0, left: 0,
+  startedFromHome: 0, homeReachedTriage: 0, surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
+};
+
+describe("summary prompt", () => {
+  it("forbids clinical advice (SPEC rule 2)", () => {
+    expect(summarySystemPrompt()).toMatch(/never give medical or clinical advice/i);
+  });
+
+  it("has one rule per line", () => {
+    expect(summarySystemPrompt().split("\n")).toHaveLength(SUMMARY_RULES.length);
+  });
+
+  it("says demo or real in the user message", () => {
+    const sites = { A: zero, B: zero };
+    expect(summaryUserMessage(summaryInput(sites, true))).toContain("demo (made-up) visits");
+    expect(summaryUserMessage(summaryInput(sites, false))).toContain("real visits");
+  });
+
+  it("sends only the site totals, not the isDemo flag or anything else", () => {
+    const message = summaryUserMessage(summaryInput({ A: { ...zero, waitingNow: 4 }, B: zero }, false));
+    const json = JSON.parse(message.slice(message.indexOf("\n") + 1));
+    expect(Object.keys(json)).toEqual(["A", "B"]);
+    expect(json.A.waitingNow).toBe(4);
+  });
+});
diff --git a/lib/summaryPrompt.ts b/lib/summaryPrompt.ts
new file mode 100644
index 0000000..cf1371e
--- /dev/null
+++ b/lib/summaryPrompt.ts
@@ -0,0 +1,32 @@
+// The words the dashboard summary route sends to Claude: the rules Claude must follow, and the
+// day's totals as JSON. Only the totals from lib/summaryInput.ts go in, never a code, token or time.
+
+import type { SummaryInput } from "./summaryInput";
+
+/** The rules Claude follows when it writes the summary. Each line is one rule. */
+export const SUMMARY_RULES: string[] = [
+  "You write a short summary of today's numbers for emergency department staff.",
+  // Keeps the answer short and easy to read on the dashboard.
+  "Write 2 or 3 short sentences in plain English. No headings, lists, bold or emoji.",
+  // Keeps Claude to facts that are in the totals.
+  "Use only the numbers you are given. Do not guess why a number is high or low.",
+  // SPEC rule 2: the app never makes clinical decisions.
+  "Never give medical or clinical advice, and never suggest a change to triage or to who waits off-site.",
+  // The totals hold sums, not averages; this stops a wrong average.
+  "recallToArrivalSeconds and surveyScoreSum are sums. Divide recallToArrivalSeconds by arrivedAfterRecall for the average minutes from recall to arrival, and surveyScoreSum by surveyResponses for the average score. If the count is 0, do not give that average.",
+  // A count of 0 is normal early in the day.
+  "If most counts are 0, say that there is not much to report yet.",
+  // Staff must never read demo numbers as real ones.
+  "If the totals are for demo visits, start with \"Demo numbers:\".",
+];
+
+/** The system prompt: the rules joined into one block of text. */
+export function summarySystemPrompt(): string {
+  return SUMMARY_RULES.join("\n");
+}
+
+/** The user message: says whether the numbers are demo numbers, then the totals as JSON. */
+export function summaryUserMessage(input: SummaryInput): string {
+  const kind = input.isDemo ? "demo (made-up) visits" : "real visits";
+  return `These are today's totals for ${kind} at sites A and B:\n${JSON.stringify(input.sites, null, 2)}`;
+}
```

## Response

Gemini Hydrogen 4, High, 2026-11-20 (pasted by the owner):

1. Expired or failed sign-in tokens show "Only staff accounts can get a summary." (403) instead of "Please sign in again to get a summary." (401)
   - File and line: `data/summaryRead.ts` lines 23-25; `app/api/dashboard-summary/route.ts` lines 36-37; `data/dashboardSummary.ts` lines 9-10.
   - What goes wrong: `fetchDashboardSummary` reads the cached session via `supabaseBrowser().auth.getSession()`, which can return an expired `access_token` if staff leave `/dashboard` open or sign out in another tab. When `asCaller.auth.getUser(token)` rejects that expired JWT (or fails due to a transient Supabase Auth outage), `readSummaryRows` returns `"not_staff"`, which the route maps to HTTP `403` (`{ result: "not_staff" }`). As a result, `not_signed_in` ("Please sign in again to get a summary.") is unreachable for invalid/expired tokens, and a signed-in staff user with an expired session is wrongly told their account is not staff.
   - Smallest fix: In `data/summaryRead.ts`, return `"not_signed_in"` when `userError || !userData.user` (or `"error"` when `userError` is a 5xx/network failure) and return `"not_staff"` only when `!isStaffAccount(userData.user)`. In `app/api/dashboard-summary/route.ts` line 37, add `if (rows === "not_signed_in") return answer({ result: "not_signed_in" }, 401);`.

2. `max_tokens: 400` shares budget with Opus 5.5's mandatory thinking tokens, causing premature `cut_off` errors
   - File and line: `app/api/dashboard-summary/route.ts` line 45 (`lib/summaryAnswer.ts` line 24).
   - What goes wrong: In the Anthropic Messages API, `max_tokens` caps the combined total of internal `thinking` tokens and visible `text` tokens. Because Opus 5.5 always thinks and must evaluate 34 numbers and two averages across Sites A and B, thinking can consume most or all of the 400-token budget even at `"low"` effort. When `max_tokens` runs out mid-thinking or mid-sentence, `stop_reason` is `"max_tokens"`, so `summaryAnswer` discards any text and tells staff "The summary was too long and was stopped. Please try again." even when zero text was produced and retrying hits the same 400-token cap.
   - Smallest fix: Increase `max_tokens` in `app/api/dashboard-summary/route.ts` line 45 from `400` to `1024` (relying on "Write 2 or 3 short sentences" in `SUMMARY_RULES` to keep the visible output brief).

3. `pause_turn` stop reason is not handled as an incomplete reply
   - File and line: `lib/summaryAnswer.ts` lines 23-25.
   - What goes wrong: `summaryAnswer` checks only `"refusal"` and `"max_tokens"` before joining `text` blocks. If Opus 5.5 returns `stop_reason === "pause_turn"` (used when a thinking turn pauses before completion), `summaryAnswer` either displays partial text as a finished summary or falls through to "The summary came back empty. Please try again.".
   - Smallest fix: Treat `"pause_turn"` as incomplete on line 24: `if (reply.stop_reason === "max_tokens" || reply.stop_reason === "pause_turn") return { kind: "none", reason: "cut_off" };`.

4. The "Demo numbers:" warning relies solely on the AI model obeying the prompt
   - File and line: `components/dashboard/SummaryPanel.tsx` lines 42-47 (`lib/summaryPrompt.ts` line 20).
   - What goes wrong: `SummaryPanel` renders `message.text` directly and leaves the "Demo numbers:" prefix up to `SUMMARY_RULES` line 20. With `output_config: { effort: "low" }`, the model can occasionally omit that prefix, showing synthetic demo numbers on `/dashboard` without clearly identifying them as demo data.
   - Smallest fix: In `components/dashboard/SummaryPanel.tsx` line 42, prepend "Demo numbers: " whenever `isDemo` is `true` and `!message.text.startsWith("Demo numbers:")`.

5. In-flight loading state and the 30-second button lock bleed across Real and Demo mode switches (and double-taps leak `timer.current`)
   - File and line: `components/dashboard/SummaryPanel.tsx` lines 17-33 and 39.
   - What goes wrong: `shown` tracks `forDemo` so a Real summary is not displayed in Demo, but `waiting` and `resting` are single booleans shared across both modes:
     - If staff clicks "Write a short summary" in Real and switches to Demo while the request is running, Demo displays "Writing the summary..." and disables the button for the rest of the 30-second cooldown (or up to about 40 seconds if the 20s timeout + 1 retry runs).
     - Switching Real to Demo to Real after a cooldown expires while a Demo request is in flight similarly shows Demo's spinner and locks Real's button.
     - `writeSummary()` has no `if (waiting || resting) return;` guard and overwrites `timer.current` on line 29 without calling `clearTimeout(timer.current)`, so a rapid double-tap before re-render sends two requests and leaves an orphaned timer that ends the 30-second lock early.
   - Smallest fix: Guard `writeSummary()` with `if (waiting || resting) return;`, clear `timer.current` before setting a new timeout, and store the mode on `waiting` and `resting` (`waitingFor: boolean | null` and `restingFor: boolean | null`) so the spinner and 30-second lock apply only to the mode that was clicked.

6. Dense single-line expressions and whitespace-only bearer tokens hurt beginner readability
   - File and line: `lib/summaryMessage.ts` line 18; `app/api/dashboard-summary/route.ts` line 22; `components/dashboard/SummaryPanel.tsx` lines 21-23.
   - What goes wrong:
     - `lib/summaryMessage.ts` line 18 combines a `typeof`/null guard, a ternary `{}` fallback, an inline type assertion, and destructuring in one 124-character line.
     - `app/api/dashboard-summary/route.ts` line 22 uses `?.match(/^Bearer (.+)$/)?.[1]`, which is harder for a beginner to read and also accepts whitespace-only tokens ("Bearer    ") as valid before hitting Supabase.
     - `components/dashboard/SummaryPanel.tsx` line 21 uses a curried one-liner `useEffect(() => () => { ... }, [])`.
   - Smallest fix:
     - In `lib/summaryMessage.ts` line 18, return `FALLBACK` early when `typeof body !== "object" || body === null`, then read `result` and `text` on the next line.
     - In `app/api/dashboard-summary/route.ts` line 22, read `const auth = request.headers.get("authorization") ?? "";` and `const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";`.
     - In `components/dashboard/SummaryPanel.tsx` lines 21-23, write an explicit `return () => { if (timer.current) clearTimeout(timer.current); };` inside `useEffect`.

## Check of the response (Claude, 2026-11-20)

1. Accept. A token that Supabase refuses, or an Auth fault, gives "not_staff" today. That is the wrong text. The fix: a small rule in lib/ (`callerCheck`) that gives "not_signed_in", "not_staff" or "staff", with a test that fails first.
2. Accept. Thinking tokens count toward `max_tokens`, so 400 is tight. The test by hand passed, but at a busy hour the numbers are larger. Raise to 1024. Staff pay only for the tokens that the model uses.
3. Reject. `pause_turn` comes from server tool loops (for example web search). This request has no tools, so the API does not send it. If it came, `summaryAnswer` joins the text that came back, and staff see either that text or "came back empty".
4. Accept the problem. The demo label must not depend on the model. The wording is a product decision for the owner (see the question in the session).
5. Accept the guard and the `clearTimeout`. Reject the lock for each mode: one lock for both modes is the cost guard, and a second lock for the other mode would allow two paid calls in 30 seconds. The "Writing the summary..." line in the other mode is true, so it stays.
6. Accept all three. They make the code easier to read and do not change what it does, except that a token of only spaces now gives 401 at once.
