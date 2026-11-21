# Gemini review: demo day plan (security and architecture)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Prompt to paste

You review a change to a concept prototype of a virtual emergency department waiting room. It uses synthetic data only. Find problems. Do not confirm that the code is good. For each problem, give: the file and line, what can go wrong, how likely it is, and the smallest fix. If you find no problem in an area, say "no problem found" for that area, and say what you checked.

The change: once a day, a Vercel cron calls `GET /api/demo-plan`. The route asks Claude (`claude-opus-5-5`) for 8 chances that the demo simulator uses (how often demo patients tap buttons, arrive, start from home, and the language mix). It checks them in TypeScript, then saves them through a Supabase SQL function `set_demo_plan`. A `pg_cron` SQL function `simulate_demo_tick()` runs every 5 minutes, reads the 8 chances, and moves demo visits (`is_demo = true`) only.

Hard rules that must stay true:
1. Claude gets no visit data: no code, token, id, time of a visit, or survey text.
2. Claude decides nothing clinical. It never sets a CTAS level. The CTAS level stays random 4 or 5 in SQL.
3. The simulator never reads or changes a real visit (`is_demo = false`).
4. Only Vercel's cron call (with `CRON_SECRET`) may run the route. Only the server's secret key (`service_role`) may call `set_demo_plan`. Browsers (`anon`, `authenticated`) may not. `service_role` may not read or change `demo_settings` directly, so it cannot switch the simulator on.

Review these areas:
A. Route security: the secret check, the error answers, what goes in the logs, cost if someone calls the route many times.
B. Prompt and reply: can a reply from Claude make the app save anything outside the ranges, or anything other than 8 numbers?
C. SQL rights: `security definer`, `search_path`, grants and revokes, the check constraints, Supabase default privileges on new functions and columns.
D. Simulator change: the tick diff below. Does any change let a plan affect a real visit, a CTAS level or a time limit?
E. The two check files: do they prove what their rows say?

Settled decisions (do not report these as faults):
- The ranges are kept in two places on purpose: `PLAN_LIMITS` in `lib/demoPlan.ts` and the check constraints in the migration (lines 19 to 26). The SQL checks are the last guard for every write path.
- The recall minutes (12 and 18), the target of 9 waiting, the 1 in 10 non-responders and every time limit stay fixed in SQL (migration lines 6 to 9). Claude sets only how often a recall comes early.
- No `thinking` field in the Claude call (route line 28 to 34). On this model, thinking is always on, and `effort: "low"` keeps the call small.
- `max_tokens` 1024 and a client timeout of 20 seconds with 1 retry (`data/claudeClient.ts` line 20).
- With no `ANTHROPIC_API_KEY`, the route answers 204 and the simulator keeps its last plan (route line 23).
- The "at least half near usual" rule is only in the prompt and is not enforced in code (`lib/demoPlanPrompt.ts` line 16). Only the ranges are hard limits.

## Files changed (line counts)

- `app/api/demo-plan/route.ts`: 51 lines (new)
- `lib/demoPlan.ts`: 67 lines (new)
- `lib/demoPlanPrompt.ts`: 31 lines (new)
- `lib/demoPlanReply.ts`: 21 lines (new)
- `data/demoPlanSave.ts`: 25 lines (new)
- `data/supabaseServer.ts`: 21 lines (1 comment line changed)
- `supabase/migrations/20261120000000_demo_plan.sql`: 265 lines (new)
- `supabase/checks/demo_plan.sql`: 87 lines (new)
- `supabase/checks/demo_tick.sql`: 221 lines (8 lines added: set the normal plan before the ticks)
- `vercel.json`: 13 lines (1 cron added)
- Tests: `lib/demoPlan.test.ts` 80, `lib/demoPlanPrompt.test.ts` 24, `lib/demoPlanReply.test.ts` 25

## app/api/demo-plan/route.ts

```ts
// The daily demo-plan job (vercel.json "crons"): once a day Claude writes the chances the demo
// simulator uses (how often demo patients tap, arrive, start from home...). The plan is checked
// by lib/demoPlan.ts and again by the database. Claude never sees a visit and never sets a CTAS level.
// Only Vercel's call, which carries the CRON_SECRET, is accepted.

import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, claudeClient, claudeIsSetUp } from "@/data/claudeClient";
import { saveDemoPlan } from "@/data/demoPlanSave";
import { isCronRequest } from "@/lib/cronAuth";
import { demoPlanSchema } from "@/lib/demoPlan";
import { demoPlanSystemPrompt, demoPlanUserMessage } from "@/lib/demoPlanPrompt";
import { demoPlanReply } from "@/lib/demoPlanReply";

function answer(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  if (!isCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return answer({ result: "not_allowed" }, 401);
  }
  // With no key, the simulator keeps its last plan (or the normal numbers).
  if (!claudeIsSetUp()) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  let reply;
  try {
    // Structured output: Claude must answer with JSON that matches the schema (one number per field).
    reply = await claudeClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: "low", format: { type: "json_schema", schema: demoPlanSchema() } },
      system: demoPlanSystemPrompt(),
      messages: [{ role: "user", content: demoPlanUserMessage(new Date().toISOString().slice(0, 10)) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return answer({ result: "busy" }, 503);
    console.error("demo-plan: Claude call failed", error instanceof Error ? error.name : "unknown");
    return answer({ result: "claude_failed" }, 502);
  }

  const result = demoPlanReply(reply);
  if (result.kind === "none") return answer({ result: result.reason }, 502);

  try {
    const saved = await saveDemoPlan(result.plan);
    return saved ? answer({ result: "saved", plan: result.plan }, 200) : answer({ result: "not_saved" }, 502);
  } catch (problem) {
    console.error("demo-plan: could not reach the database", problem instanceof Error ? problem.message : "unknown");
    return answer({ result: "not_saved" }, 502);
  }
}
```

## lib/demoPlan.ts

```ts
// Checks the demo "day plan" that Claude writes once a day: the chances the demo simulator uses.
// Every number is kept inside a safe range, a missing or bad number gets today's fixed value, and
// any other field is dropped. Claude never sets a CTAS level or the recall minutes (SPEC.md line 118).

/** The names of the chances in a day plan. Each one is a number from 0 to 1. */
export type DemoPlanField =
  | "seen_chance"
  | "on_my_way_chance"
  | "still_here_chance"
  | "arrive_chance"
  | "quick_recall_chance"
  | "home_start_chance"
  | "desk_offer_chance"
  | "english_share";

export type DemoPlan = Record<DemoPlanField, number>;

type Limit = { normal: number; min: number; max: number; meaning: string };

export const PLAN_LIMITS: Record<DemoPlanField, Limit> = {
  seen_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a demo patient taps Seen in a tick" },
  on_my_way_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a recalled demo patient taps I'm on my way" },
  still_here_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a demo patient answers I'm still here" },
  arrive_chance: { normal: 0.5, min: 0.2, max: 0.9, meaning: "chance a demo patient on the way arrives in a tick" },
  quick_recall_chance: { normal: 0.5, min: 0.3, max: 0.7, meaning: "chance the next recall comes after 12 minutes, not 18" },
  home_start_chance: { normal: 0.1, min: 0.02, max: 0.3, meaning: "chance a new demo visit starts from home in a tick" },
  desk_offer_chance: { normal: 0.8, min: 0.5, max: 0.95, meaning: "share of new desk visits offered the virtual wait" },
  english_share: { normal: 0.7, min: 0.3, max: 0.9, meaning: "share of new demo visits in English" },
};

export const PLAN_FIELDS = Object.keys(PLAN_LIMITS) as DemoPlanField[];

export function normalPlan(): DemoPlan {
  return Object.fromEntries(PLAN_FIELDS.map((field) => [field, PLAN_LIMITS[field].normal])) as DemoPlan;
}

function keepInRange(value: unknown, limit: Limit): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return limit.normal;
  const inRange = Math.min(limit.max, Math.max(limit.min, value));
  return Math.round(inRange * 100) / 100; // two decimals, the same as the SQL numeric(3,2) columns
}

export function checkDemoPlan(raw: unknown): DemoPlan {
  const given = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    PLAN_FIELDS.map((field) => [field, keepInRange(Object.hasOwn(given, field) ? given[field] : undefined, PLAN_LIMITS[field])]),
  ) as DemoPlan;
}

export function demoPlanSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: Object.fromEntries(
      PLAN_FIELDS.map((field) => [field, { type: "number", description: PLAN_LIMITS[field].meaning }]),
    ),
    required: PLAN_FIELDS,
    additionalProperties: false,
  };
}
```

## lib/demoPlanPrompt.ts

```ts
import { PLAN_FIELDS, PLAN_LIMITS } from "./demoPlan";

export const DEMO_PLAN_RULES: string[] = [
  "You set the chances for a demo simulator of a virtual emergency department waiting room. All visits are made up.",
  "Give one number from 0 to 1 for each field. Stay inside the range given for each field.",
  "Pick one theme for the day, for example a quiet day, a busy day, or a day when many patients are slow to answer, and move the related numbers together to match it.",
  "On a Saturday or Sunday, make home starts and quick recalls a little more likely than on a weekday.",
  "Keep at least half of the numbers close to their usual value, so the demo still looks like a normal waiting room.",
];

export function demoPlanSystemPrompt(): string {
  return DEMO_PLAN_RULES.join("\n");
}

export function demoPlanUserMessage(today: string): string {
  const lines = PLAN_FIELDS.map((field) => {
    const { meaning, min, max, normal } = PLAN_LIMITS[field];
    return `- ${field}: ${meaning}. Range ${min} to ${max}; a usual day is ${normal}.`;
  });
  return `Write the demo day plan for ${today}.\n${lines.join("\n")}`;
}
```

## lib/demoPlanReply.ts

```ts
import { checkDemoPlan, type DemoPlan } from "./demoPlan";
import type { ReplyLike } from "./summaryAnswer";

export type DemoPlanReply = { kind: "plan"; plan: DemoPlan } | { kind: "none"; reason: "refusal" | "cut_off" | "not_json" };

export function demoPlanReply(reply: ReplyLike): DemoPlanReply {
  if (reply.stop_reason === "refusal") return { kind: "none", reason: "refusal" };
  if (reply.stop_reason === "max_tokens") return { kind: "none", reason: "cut_off" };
  const text = reply.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  try {
    return { kind: "plan", plan: checkDemoPlan(JSON.parse(text)) };
  } catch {
    return { kind: "none", reason: "not_json" };
  }
}
```

## data/demoPlanSave.ts

```ts
import "server-only";
import type { DemoPlan } from "@/lib/demoPlan";
import { supabaseServer } from "./supabaseServer";

export async function saveDemoPlan(plan: DemoPlan): Promise<boolean> {
  const { error } = await supabaseServer().rpc("set_demo_plan", {
    p_seen_chance: plan.seen_chance,
    p_on_my_way_chance: plan.on_my_way_chance,
    p_still_here_chance: plan.still_here_chance,
    p_arrive_chance: plan.arrive_chance,
    p_quick_recall_chance: plan.quick_recall_chance,
    p_home_start_chance: plan.home_start_chance,
    p_desk_offer_chance: plan.desk_offer_chance,
    p_english_share: plan.english_share,
  });
  if (error) {
    console.error("demo-plan: database refused the plan", { code: error.code, message: error.message });
    return false;
  }
  return true;
}
```

## Helpers the changed lines call (not changed)

`lib/cronAuth.ts` (12 lines):

```ts
import { timingSafeEqual } from "node:crypto";

export function isCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const given = Buffer.from(authorization);
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
```

`data/claudeClient.ts` (22 lines):

```ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-5-5";

let client: Anthropic | undefined;

export function claudeIsSetUp(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claudeClient(): Anthropic {
  if (!client) client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}
```

`data/supabaseServer.ts` (21 lines):

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
    if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local (see .env.example).");
    client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
```

`ReplyLike` in `lib/summaryAnswer.ts`:

```ts
export type ReplyLike = {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string }>;
};
```

`demo_settings` table (from `20261118000000_demo_settings.sql`, lines 12 and 16): `id smallint primary key default 1 check (id = 1)`, and the migration inserts `(1, false)` for `(id, running)`.

## supabase/migrations/20261120000000_demo_plan.sql, parts 1 and 2 (lines 17 to 64)

```sql
-- 1. The plan columns. Each check refuses a number outside its range, from any caller.
alter table public.demo_settings
  add column seen_chance numeric(3,2) not null default 0.70 check (seen_chance between 0.30 and 0.95),
  add column on_my_way_chance numeric(3,2) not null default 0.70 check (on_my_way_chance between 0.30 and 0.95),
  add column still_here_chance numeric(3,2) not null default 0.70 check (still_here_chance between 0.30 and 0.95),
  add column arrive_chance numeric(3,2) not null default 0.50 check (arrive_chance between 0.20 and 0.90),
  add column quick_recall_chance numeric(3,2) not null default 0.50 check (quick_recall_chance between 0.30 and 0.70),
  add column home_start_chance numeric(3,2) not null default 0.10 check (home_start_chance between 0.02 and 0.30),
  add column desk_offer_chance numeric(3,2) not null default 0.80 check (desk_offer_chance between 0.50 and 0.95),
  add column english_share numeric(3,2) not null default 0.70 check (english_share between 0.30 and 0.90),
  add column plan_set_at timestamptz;

-- 2. set_demo_plan: saves the 8 chances. A number outside its range fails the check above, so
-- nothing is saved. It never touches the running switch or any visit.
create or replace function public.set_demo_plan(
  p_seen_chance numeric,
  p_on_my_way_chance numeric,
  p_still_here_chance numeric,
  p_arrive_chance numeric,
  p_quick_recall_chance numeric,
  p_home_start_chance numeric,
  p_desk_offer_chance numeric,
  p_english_share numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.demo_settings
  set seen_chance = p_seen_chance,
      on_my_way_chance = p_on_my_way_chance,
      still_here_chance = p_still_here_chance,
      arrive_chance = p_arrive_chance,
      quick_recall_chance = p_quick_recall_chance,
      home_start_chance = p_home_start_chance,
      desk_offer_chance = p_desk_offer_chance,
      english_share = p_english_share,
      plan_set_at = now()
  where id = 1;
end;
$$;

revoke execute on function public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  to service_role;
```

## Part 3: `simulate_demo_tick()`, diff against the earlier version (20261118000200_demo_simulator_fixes.sql)

The whole function is replaced with `create or replace` (same `security definer`, `set search_path = ''`). Only these lines differ (comment lines left out):

```diff
+  p record; -- today's day plan (the chances), read once per run
 ...
+  select seen_chance, on_my_way_chance, still_here_chance, arrive_chance, quick_recall_chance,
+         home_start_chance, desk_offer_chance, english_share
+  into p from public.demo_settings where id = 1;
 ...
-      if random() < 0.7 then          -- record_seen
+      if random() < coalesce(p.seen_chance, 0.7) then
-      if random() < 0.7 then          -- confirm_on_my_way
+      if random() < coalesce(p.on_my_way_chance, 0.7) then
-      if random() < 0.7 then          -- record_still_here
+      if random() < coalesce(p.still_here_chance, 0.7) then
-      if random() < 0.5 then          -- arrived
+      if random() < coalesce(p.arrive_chance, 0.5) then
-        or (v_last_call <= now() - interval '12 minutes' and random() < 0.5))
+        or (v_last_call <= now() - interval '12 minutes' and random() < coalesce(p.quick_recall_chance, 0.5)))
-      if not v_paused and random() < 0.1 then
-        v_lang := case when random() < 0.7 then 'en'
+      if not v_paused and random() < coalesce(p.home_start_chance, 0.1) then
+        v_lang := case when random() < coalesce(p.english_share, 0.7) then 'en'
-        v_lang := case when random() < 0.7 then 'en'
+        v_lang := case when random() < coalesce(p.english_share, 0.7) then 'en'
-        if random() < 0.8 then        -- desk visit offered: waiting
+        if random() < coalesce(p.desk_offer_chance, 0.8) then
```

The plan is read after the advisory lock and after the `running` check. Every statement that writes a visit still has `is_demo = true`. The CTAS line `case when random() < 0.5 then 4 else 5 end` did not change.

The migration ends with:

```sql
revoke execute on function public.simulate_demo_tick() from public, anon, authenticated, service_role;
revoke all on table public.demo_settings from service_role;
```

## Checked (output in this session, 2026-11-20)

- `npm test`: "Test Files 93 passed (93)", "Tests 565 passed (565)". `npm run lint`: no errors. `npm run build`: "Compiled successfully".
- The owner ran the migration in the Supabase SQL Editor.
- `supabase/checks/demo_plan.sql`, all 10 rows as expected: a too-high and a too-low plan refused (1, 1); a refused plan left the row as it was (1); a good plan saved (1); the on switch and real visits not changed (0, 0); `anon` and `authenticated` may not call `set_demo_plan` (0, 0); `service_role` may call it (1); `service_role` may not read `demo_settings` (0).
- `supabase/checks/demo_tick.sql` after "Clear demo data", all 13 rows in range: 00 = 0; 02, 03, 06, 11, 12 = 0; 04 = 9, 05 = 10 (range 7 to 10); 07 = 9 (range 8 to 11); 08 = 17; 09 = 5; 10 = 0 (allowed, "more than 0 in most runs").
- A local call of the route with the `CRON_SECRET` header gave `saved`. The `demo_settings` row then had seen 0.50, on my way 0.50, still here 0.55, arrive 0.50, quick recall 0.50, home start 0.10, desk offer 0.80, English 0.70, and `plan_set_at` 2026-11-20 22:59 UTC.
- With that plan and the simulator on, the demo visits moved: site A 9 waiting, 1 called, 1 on the way, 7 arrived; site B 10 waiting, 1 called, 1 on the way, 5 arrived, 1 unable to reach.

## Not checked

- The cron on Vercel: the branch is not deployed, so no scheduled call has run.
- A call as the `service_role` role itself in SQL (the check reads the privilege with `has_function_privilege`; the route call above used the secret key and saved).
- The answer of the route when Claude returns a refusal or a cut-off reply (covered only by unit tests in `lib/demoPlanReply.test.ts`).
- The 401 answer without the header (covered by the `isCronRequest` unit tests, not by a live call).
