// Decides whether the patient screen shows "This link did not work" after the page reads the link.

/** What one read of the link gave (see takeTokenFromLink in data/savedToken.ts). */
export type LinkRead = { token: string | null; brokenLink: boolean };

/**
 * The broken-link state after one more read of the link. `previous` is the state before it.
 * A read with no link and no saved token tells nothing new, so it keeps `previous`. This
 * matters because the first read removes the link from the address bar: in the dev server
 * React reads a second time and finds nothing. Every other read gives its own answer.
 */
export function brokenLinkAfterRead(previous: boolean, link: LinkRead): boolean {
  if (link.token === null && !link.brokenLink) return previous;
  return link.brokenLink;
}
