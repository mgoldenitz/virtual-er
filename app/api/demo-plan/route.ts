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
