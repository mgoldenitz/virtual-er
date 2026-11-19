// The server route a staff screen calls after a recall saves. It sends one ntfy message to the
// owner's phone for real (not demo) visits. It reads the visits with the caller's own sign-in
// token, so the database rules decide: only staff can read visits, and a caller who is not staff
// gets no rows, so nothing is sent. With no NTFY_TOPIC set, the route does nothing.

import { createClient } from "@supabase/supabase-js";
import { supabaseSettings } from "@/data/supabaseSettings";
import { alertsToSend, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "@/lib/recallAlert";

const MAX_BODY_CHARACTERS = 2_500; // 50 ids of 36 characters, with room to spare

function answer(result: string, status: number): Response {
  return Response.json({ result }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return answer("not_signed_in", 401);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARACTERS) return answer("bad_request", 400);
    body = JSON.parse(text);
  } catch {
    return answer("bad_request", 400);
  }
  const wanted = parseRecallAlertBody(body);
  if (!wanted) return answer("bad_request", 400);

  const { url, publishableKey } = supabaseSettings();
  const asCaller = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await asCaller
    .from("visits")
    .select("id, code, site, status, called_at, is_demo")
    .in("id", wanted.ids);
  if (error || !Array.isArray(data)) return answer("error", 500);

  const rows = alertsToSend(data as RecallAlertRow[], new Date());
  if (rows.length === 0) return answer("nothing_to_send", 200);

  try {
    const sent = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      body: recallAlertText(rows),
      headers: { Title: "Virtual waiting room demo", Priority: "high" },
    });
    return sent.ok ? answer("sent", 200) : answer("ntfy_failed", 502);
  } catch {
    return answer("ntfy_failed", 502);
  }
}
