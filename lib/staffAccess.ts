// Who may open the staff screens (/staff and /dashboard): only a signed-in staff account.
// This is the quick check made before a page loads; the database's row-level security is
// the real lock, so a page opened anyway would still show no visit data.

/** The parts of a sign-in token this check reads. Supabase sets app_metadata; users cannot. */
export type StaffClaims = { app_metadata?: Record<string, unknown> } | null | undefined;

export type StaffAccess = "allow" | "sign_in" | "not_staff";

const STAFF_PATHS = ["/staff", "/dashboard"];

/** True for /staff, /dashboard and any page under them. */
export function isStaffPath(pathname: string): boolean {
  return STAFF_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** True only when the account is marked role = staff (the same mark is_staff() checks). */
export function isStaffAccount(claims: StaffClaims): boolean {
  return claims?.app_metadata?.role === "staff";
}

/** Let the page open, send the visitor to sign in, or tell them the account is not staff. */
export function staffAccess(pathname: string, claims: StaffClaims): StaffAccess {
  if (!isStaffPath(pathname)) return "allow";
  if (!claims) return "sign_in";
  return isStaffAccount(claims) ? "allow" : "not_staff";
}

/**
 * Where to go after signing in. Only a staff page is allowed, so a link like
 * /login?next=https://elsewhere.example cannot send staff to another site.
 */
export function pageAfterSignIn(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && isStaffPath(next.split(/[?#]/)[0])) {
    return next;
  }
  return "/staff";
}
