// Staff text for the check-in panel (CheckInPanel.tsx).

// The database refused off-site waiting because the site was paused on another screen.
export const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.';

// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
export const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";

// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
// If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
// (If the network is still down, the screen says "could not be reached" in place of "paused".)
export const STALE_READ =
  "Warning: could not check just now whether off-site waiting is paused. The last check said not paused. " +
  'The screen checks again every 5 seconds. If off-site waiting was paused since then, nothing is saved: press "Waits on-site" instead.';

/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
export function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
  // Paused comes first: it is the safer fact, even when a later read failed.
  if (offsitePaused) return "Off-site waiting is paused at this site: the patient waits on-site.";
  if (pauseReadFailed) return READ_FAILED;
  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
}
