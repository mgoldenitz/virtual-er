// The server route a phone calls to start a visit from home (SPEC rule 5). The phone sends
// only a site and a language; this route makes the code and token, and the database function
// start_home_visit sets source = home and status = pre_arrival itself, refuses while off-site
// waiting is paused, and allows 10 starts per site per minute.

import { supabaseServer } from "@/data/supabaseServer";
import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
import { parseStartVisitRequest } from "@/lib/startVisitRequest";

const TRIES = 3; // a new code and token each time the database says "taken"
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

  try {
    const supabase = supabaseServer();
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const token = makeAccessToken();
      const { data, error } = await supabase.rpc("start_home_visit", {
        p_site: wanted.site,
        p_language: wanted.language,
        p_code: makeDisplayCode(),
        p_token: token,
      });
      if (error) break;
      if (data === "saved") return answer({ result: "saved", token }, 200);
      if (data === "paused") return answer({ result: "paused" }, 409);
      if (data === "busy") return answer({ result: "busy" }, 429);
      if (data !== "taken") break;
    }
  } catch {
    // A missing setting or an unreachable database: the phone gets the same plain answer.
  }
  return answer({ result: "error" }, 500);
}
