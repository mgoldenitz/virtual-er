// Runs before /staff, /dashboard and /login load (Next.js 16 calls this file "proxy";
// older versions called it middleware). It keeps the staff sign-in fresh and sends anyone
// who is not a signed-in staff account to the login screen. The database's row-level
// security is the real lock; this only stops the staff screens opening empty.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseSettings } from "@/data/supabaseSettings";
import { staffAccess, type StaffClaims } from "@/lib/staffAccess";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseSettings();

  // A new connection for every request, reading and refreshing the sign-in cookies.
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Checks the sign-in token's signature (nothing else may run between these two steps,
  // or staff can be signed out at random, per Supabase's guide).
  const { data } = await supabase.auth.getClaims();
  const access = staffAccess(request.nextUrl.pathname, (data?.claims ?? null) as StaffClaims);
  if (access === "allow") return response;

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", request.nextUrl.pathname);
  if (access === "not_staff") login.searchParams.set("reason", "not_staff");
  const redirect = NextResponse.redirect(login);
  // Keep any refreshed sign-in cookies on the redirect too.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/staff/:path*", "/dashboard/:path*", "/login"],
};
