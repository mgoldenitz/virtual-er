// Staff text for the check-in panel (CheckInPanel.tsx).

// The database refused off-site waiting because the site was paused on another screen.
// The fallback button says "Not eligible" until the pause switch is read again (it may not be,
// while the network is down), then "Waits on-site" (also its label while the switch is not read yet). Name both.
export const PAUSED_NOT_SAVED =
  'Off-site waiting is paused at this site. Nothing was saved. Press "Not eligible" or "Waits on-site" so the patient waits on-site.';

// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
// If the network is down, the "Waits on-site" save fails too ("could not be reached").
export const READ_FAILED =
  "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. " +
  "If the network is still down, no button can save.";

// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
// If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
// If the network is still down, every save fails with "could not be reached", on every button.
// While the last good read said "not paused", the fallback button is labelled "Not eligible".
export const STALE_READ =
  "Warning: could not check just now whether off-site waiting is paused. The last check said it was not paused. " +
  "The screen checks again every 5 seconds. If it was paused since then, a start will not be saved: " +
  'press "Not eligible" so the patient waits on-site. If the network is still down, no button can save.';

/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
export function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
  // Paused comes first: it is the safer fact, even when a later read failed.
  if (offsitePaused) {
    const paused = "Off-site waiting is paused at this site: the patient waits on-site.";
    // A later read failed, so the network may be down, and then the save fails too.
    return pauseReadFailed ? `${paused} If the network is still down, no button can save.` : paused;
  }
  if (pauseReadFailed) return READ_FAILED;
  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
}
