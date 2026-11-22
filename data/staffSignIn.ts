// Staff sign-in and sign-out on this device, through Supabase's sign-in service. After signing
// in it checks the account is marked staff; an account that is not is signed straight out again.

import { signInErrorResult, type SignInErrorResult } from "@/lib/signInError";
import { isStaffAccount, type StaffClaims } from "@/lib/staffAccess";
import { supabaseBrowser } from "./supabaseBrowser";

/** How a sign-in went: signed in, not a staff account, or one of the sign-in errors. */
export type SignInResult = "signed_in" | "not_staff" | SignInErrorResult;

export async function signInStaff(email: string, password: string): Promise<SignInResult> {
  const supabase = supabaseBrowser();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return signInErrorResult(error.status);
    const { data, error: claimsError } = await supabase.auth.getClaims();
    // The account could not be checked: sign out again, and say the service could not be reached.
    if (claimsError) {
      await supabase.auth.signOut().catch(() => {});
      return "no_connection";
    }
    if (!isStaffAccount((data?.claims ?? null) as StaffClaims)) {
      await supabase.auth.signOut();
      return "not_staff";
    }
    return "signed_in";
  } catch {
    return "no_connection";
  }
}

/** Ends the staff sign-in on this device. False if it could not be done. */
export async function signOutStaff(): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().auth.signOut();
    return !error;
  } catch {
    return false;
  }
}
