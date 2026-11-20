// The server route behind the dashboard's "Write a short summary" button. It checks the caller
// is staff, counts today's numbers itself (it never takes numbers from the browser), sends only
// those totals to Claude, and returns Claude's 2 or 3 sentences. With no ANTHROPIC_API_KEY, it does nothing.

import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, claudeClient, claudeIsSetUp } from "@/data/claudeClient";
import { readSummaryRows } from "@/data/summaryRead";
import { dashboardNumbers } from "@/lib/dashboardNumbers";
import { summaryAnswer } from "@/lib/summaryAnswer";
import { parseSummaryBody, summaryInput } from "@/lib/summaryInput";
import { summarySystemPrompt, summaryUserMessage } from "@/lib/summaryPrompt";

const MAX_BODY_CHARACTERS = 100; // the body is only {"isDemo":true}

function answer(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!claudeIsSetUp()) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) return answer({ result: "not_signed_in" }, 401);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARACTERS) return answer({ result: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return answer({ result: "bad_request" }, 400);
  }
  const wanted = parseSummaryBody(body);
  if (!wanted) return answer({ result: "bad_request" }, 400);

  const rows = await readSummaryRows(token, wanted.isDemo);
  if (rows === "not_signed_in") return answer({ result: "not_signed_in" }, 401);
  if (rows === "not_staff") return answer({ result: "not_staff" }, 403);
  if (rows === "error") return answer({ result: "error" }, 500);

  const input = summaryInput(dashboardNumbers(rows.visits, rows.stats, rows.today, wanted.isDemo), wanted.isDemo);

  try {
    // Opus 5.5 always thinks, so there is no thinking setting; "low" effort keeps this short and cheap.
    // max_tokens counts the thinking too, so it is well above what 3 sentences need.
    const reply = await claudeClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: summarySystemPrompt(),
      messages: [{ role: "user", content: summaryUserMessage(input) }],
    });
    const result = summaryAnswer(reply);
    return result.kind === "text"
      ? answer({ result: "text", text: result.text }, 200)
      : answer({ result: result.reason }, 200);
  } catch (error) {
    // Too many requests is told apart, so staff know a later try can work. Every other failure
    // (a timeout, a wrong key, a network fault) is one plain result.
    if (error instanceof Anthropic.RateLimitError) return answer({ result: "busy" }, 503);
    return answer({ result: "claude_failed" }, 502);
  }
}
