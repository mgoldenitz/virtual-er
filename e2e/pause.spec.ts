// Pausing off-site waiting at site B: the start page shows the paused message, the check-in offers on-site waiting only, and site B is switched on again.

import { expect, test, type Page } from "@playwright/test";
import { chooseSite, codeFromMessage, fillCheckIn } from "./helpers/flows";
import { openHome, openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const PAUSED_START_TEXT = "Off-site waiting is paused right now. Please come to the emergency department and wait there.";
const PAUSED_AT_SITE_TEXT = "Off-site waiting is paused at this site: the patient waits on-site.";
const RESUME_TICK = "I have checked that patients can be reached again (phones and this app work).";

/** The button that pauses site B (shown while site B is on). */
function pauseButton(staff: Page) {
  return staff.getByRole("button", { name: "Pause off-site waiting at Demo Site B…" });
}

/** The button that turns site B back on (shown while site B is paused). */
function resumeButton(staff: Page) {
  return staff.getByRole("button", { name: "Turn off-site waiting back on…" });
}

/** Turns site B back on if it is paused. Does nothing when site B is already on. */
async function turnSiteBOnIfPaused(staff: Page): Promise<void> {
  await chooseSite(staff, "B");
  // Wait until the switch has read site B: it then shows either the pause button or the turn-on button.
  await expect(pauseButton(staff).or(resumeButton(staff))).toBeVisible();
  if (!(await resumeButton(staff).isVisible())) return;
  await resumeButton(staff).click();
  await staff.getByRole("checkbox", { name: RESUME_TICK }).check();
  await staff.getByRole("button", { name: "Yes, turn it back on" }).click();
  await expect(pauseButton(staff)).toBeVisible();
}

test("paused site B: the start page and the check-in offer no off-site waiting", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    // A run stopped before finally can leave site B paused.
    await turnSiteBOnIfPaused(staff);

    // Staff pause off-site waiting at site B, and confirm.
    await chooseSite(staff, "B");
    await pauseButton(staff).click();
    await staff.getByRole("button", { name: "Yes, pause off-site waiting" }).click();
    await expect(staff.getByTestId("paused-banner")).toBeVisible();

    // The start page for site B shows the paused message, and no "Start a visit" button.
    await openHome(patient);
    await patient.getByRole("radio", { name: "Demo Site B" }).check();
    await expect(patient.getByTestId("site-paused")).toHaveText(PAUSED_START_TEXT);
    await expect(patient.getByRole("button", { name: "Start a visit" })).toHaveCount(0);

    // The check-in for site B says the site is paused, offers "Waits on-site", and no "Start off-site waiting".
    await expect(staff.getByText(PAUSED_AT_SITE_TEXT)).toBeVisible();
    await expect(staff.getByRole("button", { name: "Waits on-site" })).toBeVisible();
    await expect(staff.getByRole("button", { name: "Start off-site waiting" })).toHaveCount(0);

    // Press "Waits on-site" (the CTAS level must be chosen first). The message gives the code, and no slip is shown.
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Waits on-site" }).click();
    const code = await codeFromMessage(staff, "waiting on-site \\(off-site waiting paused\\)");
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    await expect(staff.locator("#slip-heading")).toHaveCount(0);
  } finally {
    // Always switch site B back on, even when a check above failed, so no test leaves it paused.
    try {
      await turnSiteBOnIfPaused(staff);
    } finally {
      await staff.context().close();
      await patient.context().close();
    }
  }
});
