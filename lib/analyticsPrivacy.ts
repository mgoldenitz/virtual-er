// Decides which part of a page address may go to Vercel Web Analytics (the site and the path only), and drops an event it cannot read.
// The patient link holds the access token after "#" (/patient#t=...), and the token opens the visit (SPEC rule 1).

/** The site and the path of `url` (for example "https://site/patient"), or null if `url` is not a full address. */
export function privateAddress(url: string): string | null {
  try {
    // URL splits the address into parts, so the "?" and "#" parts are simply left out.
    const address = new URL(url);
    return `${address.origin}${address.pathname}`;
  } catch {
    // Not a full address: drop the event. A lost page view is safer than a leaked token.
    return null;
  }
}

/** The analytics event with only the site and the path in `url`, or null to drop the event. */
export function privateEvent<T extends { url: string }>(event: T): T | null {
  const url = privateAddress(event.url);
  return url === null ? null : { ...event, url };
}
