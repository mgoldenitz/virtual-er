// The server route behind the dashboard's "Ask about today's numbers" box. It checks the caller
// is staff, refuses a question with a visit code in it (SPEC rule 1), counts today's numbers
// itself (it never takes numbers from the browser), and sends only those totals and the question
// to Claude. Nothing is saved. With no ANTHROPIC_API_KEY, it does nothing.

import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, claudeClient, claudeIsSetUp } from "@/data/claudeClient";
import { readSummaryRows } from "@/data/summaryRead";
import { chatMessages, chatSystemPrompt } from "@/lib/chatPrompt";
import { CHAT_LIMITS, parseChatBody, requestHasVisitCode } from "@/lib/chatRequest";
import { dashboardNumbers } from "@/lib/dashboardNumbers";
import { summaryAnswer } from "@/lib/summaryAnswer";
import { summaryInput } from "@/lib/summaryInput";

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
    if (text.length > CHAT_LIMITS.bodyCharacters) return answer({ result: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return answer({ result: "bad_request" }, 400);
  }
  const wanted = parseChatBody(body);
  if (!wanted) return answer({ result: "bad_request" }, 400);
  // The browser refuses a code too; this check stops one that comes another way.
  if (requestHasVisitCode(wanted)) return answer({ result: "has_code" }, 400);

  const rows = await readSummaryRows(token, wanted.isDemo);
  if (rows === "not_signed_in") return answer({ result: "not_signed_in" }, 401);
  if (rows === "not_staff") return answer({ result: "not_staff" }, 403);
  if (rows === "error") return answer({ result: "error" }, 500);

  const input = summaryInput(dashboardNumbers(rows.visits, rows.stats, rows.today, wanted.isDemo), wanted.isDemo);

  try {
    // Same settings as the summary route: "low" effort, and max_tokens well above 4 sentences plus thinking.
    const reply = await claudeClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: chatSystemPrompt(input),
      messages: chatMessages(wanted.history, wanted.question),
    });
    const result = summaryAnswer(reply);
    return result.kind === "text"
      ? answer({ result: "text", text: result.text }, 200)
      : answer({ result: result.reason }, 200);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return answer({ result: "busy" }, 503);
    return answer({ result: "claude_failed" }, 502);
  }
}
