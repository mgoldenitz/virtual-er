// Server only: asks the database to start a visit from home (start_home_visit), for the
// /api/start-visit route. It makes the code and token here and tries again with new ones if
// the database says they are taken. Problems go to the server log only, never to the phone.

import "server-only";
import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
import type { Site } from "@/lib/visit";
import { supabaseServer } from "./supabaseServer";

const TRIES = 3; // a new code and token each time the database says "taken"

/** What the database answered; the token comes back only when the visit was saved. */
export type StartHomeVisitResult =
  | { result: "saved"; token: string }
  | { result: "paused" | "busy" | "error" };

export async function startHomeVisit(site: Site, language: string): Promise<StartHomeVisitResult> {
  try {
    const supabase = supabaseServer();
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const token = makeAccessToken();
      const { data, error } = await supabase.rpc("start_home_visit", {
        p_site: site,
        p_language: language,
        p_code: makeDisplayCode(),
        p_token: token,
      });
      if (error) {
        // Written to the server log only (Vercel's runtime logs). Holds no token or key.
        console.error("start-visit: database refused", { code: error.code, message: error.message });
        break;
      }
      if (data === "saved") return { result: "saved", token };
      if (data === "paused") return { result: "paused" };
      if (data === "busy") return { result: "busy" };
      if (data !== "taken") {
        console.error("start-visit: unexpected answer from start_home_visit", { answer: String(data).slice(0, 40) });
        break;
      }
    }
  } catch (problem) {
    // A missing setting or an unreachable database: the phone gets the same plain answer,
    // and the reason goes to the server log only.
    console.error("start-visit: could not reach the database", problem instanceof Error ? problem.message : "unknown");
  }
  return { result: "error" };
}
