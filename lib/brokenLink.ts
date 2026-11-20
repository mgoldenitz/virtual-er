// Decides whether the patient screen shows "This link did not work" after the page reads the link.

/** What one read of the link gave (see takeTokenFromLink in data/savedToken.ts). */
export type LinkRead = { token: string | null; brokenLink: boolean };

/**
 * The broken-link state after one more read of the link. `previous` is the state before it.
 */
export function brokenLinkAfterRead(previous: boolean, link: LinkRead): boolean {
  return link.brokenLink;
}
