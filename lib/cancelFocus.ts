// After Cancel, focus moves to the check-in heading only once the home visit is gone, so the heading already shows its new title.

/** true when focus should move to the check-in heading: Cancel was pressed and no home visit is open any more. */
export function shouldFocusHeading(cancelled: boolean, homeVisitOpen: boolean): boolean {
  return cancelled && !homeVisitOpen;
}
