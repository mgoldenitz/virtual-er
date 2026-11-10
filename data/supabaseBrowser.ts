// The one Supabase connection used by screens in the browser. It uses only the publishable
// key, so what it can see is decided by row-level security: everything for signed-in staff,
// and for patients only the token functions.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSettings } from "./supabaseSettings";

let client: SupabaseClient | undefined;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = supabaseSettings();
    client = createBrowserClient(url, publishableKey);
  }
  return client;
}
