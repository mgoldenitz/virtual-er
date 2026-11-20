// The Supabase connection that uses the secret key. It runs only on the server (the first
// line makes the build fail if a browser file ever imports it). Only the start-a-visit route
// (data/startHomeVisit.ts), the site-status route (data/siteStatusRead.ts) and the daily
// demo-plan job (data/demoPlanSave.ts) use it. The secret key is read from .env.local (or Vercel's settings), never from code.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
    if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local (see .env.example).");
    // No sign-in is kept or refreshed: this connection acts as the server itself, not as a person.
    client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
