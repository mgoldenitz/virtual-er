// Answers with the server's current time and nothing else, so every phone and laptop can
// correct its own clock (lib/clockOffset.ts). It reads no visit and needs no sign-in.

import { connection } from "next/server";

export async function GET(): Promise<Response> {
  // Wait for a real request, so the time is read now and never stored at build time.
  await connection();
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
