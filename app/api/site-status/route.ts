// Answers whether off-site waiting is paused at each demo site, for example
// { "A": false, "B": true }, and nothing else. The start page uses it to hide "Start a visit"
// while a site is paused; the staff screen uses it to show the switch. It reads no visit.

import { connection } from "next/server";
import { readSitePauses } from "@/data/siteStatusRead";

export async function GET(): Promise<Response> {
  await connection(); // read the switch now, never at build time
  const headers = { "Cache-Control": "no-store" };
  try {
    const pauses = await readSitePauses();
    if (pauses) return Response.json(pauses, { headers });
  } catch (problem) {
    console.error("site-status: could not reach the database", problem instanceof Error ? problem.message : "unknown");
  }
  return Response.json({ result: "error" }, { status: 500, headers });
}
