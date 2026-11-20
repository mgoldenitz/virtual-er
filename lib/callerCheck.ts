// Decides who is calling a staff-only server route, from Supabase's answer to getUser(token):
// a staff account, a signed-in account that is not staff, a token that is not (or no longer) good,
// or a fault in Supabase itself.

import { isStaffAccount, type StaffClaims } from "./staffAccess";

export type CallerCheck = "staff" | "not_staff" | "not_signed_in" | "error";

/** user and error are what auth.getUser(token) gives back; only error.status is read. */
export function callerCheck(user: StaffClaims, error: { status?: number } | null): CallerCheck {
  if (error) {
    // 400, 401, 403 and 422 mean Supabase refused the token. Any other status, or none (a network
    // fault), is a problem on Supabase's side, so asking staff to sign in again would not help.
    const refused = [400, 401, 403, 422].includes(error.status ?? 0);
    return refused ? "not_signed_in" : "error";
  }
  if (!user) return "not_signed_in";
  return isStaffAccount(user) ? "staff" : "not_staff";
}
