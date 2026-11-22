// Decides what a failed staff sign-in tells staff, from the HTTP status of the sign-in error.

/** What a sign-in error means: wrong email or password, too many tries, or no connection. */
export type SignInErrorResult = "wrong" | "too_many" | "no_connection";

/**
 * 429 is too many tries, 408 is a time-out, and 500 and up (or no status) is a server or network fault.
 * Any other 4xx means the email or password was not accepted.
 */
export function signInErrorResult(status: number | undefined): SignInErrorResult {
  if (status === 429) return "too_many";
  if (status === undefined || status === 408 || status >= 500 || status < 400) return "no_connection";
  return "wrong";
}
