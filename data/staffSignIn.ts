// Staff sign-in and sign-out on this device, through Supabase's sign-in service. After signing
// in it checks the account is marked staff; an account that is not is signed straight out again.

import { isStaffAccount, type StaffClaims } from "@/lib/staffAccess";
import { supabaseBrowser } from "./supabaseBrowser";

/** How a sign-in went: signed in, wrong email or password, not a staff account, or no connection. */
export type SignInResult = "signed_in" | "wrong" | "not_staff" | "no_connection";

export async function signInStaff(email: string, password: string): Promise<SignInResult> {
  const supabase = supabaseBrowser();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.status && error.status < 500 ? "wrong" : "no_connection";
    const { data } = await supabase.auth.getClaims();
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
  const { error } = await supabaseBrowser().auth.signOut();
  return !error;
}
