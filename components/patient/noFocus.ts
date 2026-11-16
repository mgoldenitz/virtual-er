// Says whether focus is on nobody: no element, the page body, or the <html> element. The HTML rules
// say the body, but some browsers may give <html> after the focused part leaves the page.

/** True when no real part of the page has focus. */
export function focusIsOnNobody(): boolean {
  const focused = document.activeElement;
  return !focused || focused === document.body || focused === document.documentElement;
}
