// Decides who is calling a staff-only server route, from Supabase's answer to getUser(token):
// a staff account, a signed-in account that is not staff, a token that is not (or no longer) good,
// or a fault in Supabase itself.

import { isStaffAccount, type StaffClaims } from "./staffAccess";

export type CallerCheck = "staff" | "not_staff" | "not_signed_in" | "error";

/** user and error are what auth.getUser(token) gives back; only error.status is read. */
export function callerCheck(user: StaffClaims, error: { status?: number } | null): CallerCheck {
  if (error || !user) return "not_staff";
  return isStaffAccount(user) ? "staff" : "not_staff";
}
