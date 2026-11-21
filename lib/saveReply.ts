// Decides whether a save's reply still belongs to the visit on screen: a new link opened while
// the save was on its way means the reply is for the old visit, so the page ignores it.

/** True when the reply is for the link that is open now (the tap's link is still the current one). */
export function replyIsForCurrentLink(tapToken: string | null, currentToken: string | null): boolean {
  void tapToken;
  void currentToken;
  return true; // stub: the failing test comes first
}
