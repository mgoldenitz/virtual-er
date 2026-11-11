// The daily keep-alive job (vercel.json "crons"): Vercel calls this once a day so the free
// Supabase project never pauses for lack of activity. Only Vercel's call, which carries the
// CRON_SECRET, is accepted. It reads one timestamp and returns nothing about any visit.

import { isCronRequest } from "@/lib/cronAuth";
import { keepAliveRead } from "@/data/keepAliveRead";

function answer(body: { ok: boolean }, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  if (!isCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return answer({ ok: false }, 401);
  }
  try {
    const ok = await keepAliveRead();
    return answer({ ok }, ok ? 200 : 502);
  } catch (problem) {
    console.error("keep-alive: could not reach the database", problem instanceof Error ? problem.message : "unknown");
    return answer({ ok: false }, 502);
  }
}
