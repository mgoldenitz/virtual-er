// Decides which part of a page address may go to Vercel Web Analytics: the site and the path only.
// The patient link holds the access token after "#" (/patient#t=...), and the token opens the visit (SPEC rule 1).

/** The site and the path of `url` (for example "https://site/patient"), or null if `url` is not a full address. */
export function privateAddress(url: string): string | null {
  // TODO(human): keep only the site and the path; return null for an address that cannot be read.
  return url;
}
