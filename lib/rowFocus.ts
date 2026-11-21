// Decides when a staff row must take keyboard focus back: the part that had focus left the page
// (for example "Recall patient" after another screen recalled the visit), and nothing has focus now.

/**
 * True when focus is on nobody and the last part of the row that had focus is no longer on the page.
 * `lastFocusedOnPage` is null when no part of the row had focus.
 * Focus on a part that stays, or on the page body after a phone tap, is left where it is.
 */
export function focusLeftWithPart(focusOnNobody: boolean, lastFocusedOnPage: boolean | null): boolean {
  return focusOnNobody && lastFocusedOnPage === false;
}
