// The server route a phone calls to start a visit from home (SPEC rule 5). The phone sends
// only a site and a language; data/startHomeVisit.ts makes the code and token, and the database
// function start_home_visit sets source = home and status = pre_arrival itself, refuses while
// off-site waiting is paused, and allows 10 starts per site per minute.

import { startHomeVisit } from "@/data/startHomeVisit";
import { parseStartVisitRequest } from "@/lib/startVisitRequest";

const MAX_BODY_CHARACTERS = 200;

function answer(body: { result: string; token?: string }, status: number): Response {
  // The answer carries the token, so it must never be kept by a cache.
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARACTERS) return answer({ result: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return answer({ result: "bad_request" }, 400);
  }
  const wanted = parseStartVisitRequest(body);
  if (!wanted) return answer({ result: "bad_request" }, 400);

  const started = await startHomeVisit(wanted.site, wanted.language);
  if (started.result === "saved") return answer({ result: "saved", token: started.token }, 200);
  if (started.result === "paused") return answer({ result: "paused" }, 409);
  if (started.result === "busy") return answer({ result: "busy" }, 429);
  return answer({ result: "error" }, 500);
}
