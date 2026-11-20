// Timed steps: the "I'm still here" prompt, the 10, 20 and 30 minute steps after a recall, and a
// visit reopened after "unable to reach". Each page's own clock is moved on with page.clock. The
// database checks only the order of the steps, not the minutes, so the minutes come from these clocks.

import { expect, test, type Browser, type Page } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, fillCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
const UNABLE_TEXT =
  "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.";
const STAFF_LIST = /Off-site: waiting or called back/;

/** Stops the page from asking the server for its time, then takes over its clock so it can be moved on. */
async function makeClockMovable(page: Page): Promise<void> {
  await page.route("**/api/time", (route) => route.abort());
  await page.clock.install();
}

/** Puts a page's clock back to the real time, then lets its 15-second refresh run once. */
async function backToRealTime(page: Page): Promise<void> {
  await page.clock.setSystemTime(new Date());
  await page.clock.runFor(16_000);
}

/** A patient phone whose clock can be moved on. */
async function openMovablePatient(browser: Browser): Promise<Page> {
  const patient = await openPatient(browser);
  await makeClockMovable(patient);
  return patient;
}

/**
 * A signed-in staff page whose clock can be moved on. The page loads /staff again after the clock
 * is set, so its 15-second timer starts on the moved clock (a timer started before cannot be moved).
 */
async function openMovableStaff(browser: Browser): Promise<Page> {
  const staff = await openStaff(browser);
  await makeClockMovable(staff);
  await staff.goto("/staff");
  await expect(staff.getByRole("heading", { name: STAFF_LIST })).toBeVisible({ timeout: 30_000 });
  return staff;
}

test("still here: the prompt shows at 30 minutes, a tap clears it, and a missed tap is flagged to staff", async ({ browser }) => {
  const staff = await openMovableStaff(browser);
  const patient = await openMovablePatient(browser);
  try {
    // Check the patient in at the desk, then the patient opens the link.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Move the patient's clock on 31 minutes: the "I'm still here" prompt is due.
    await patient.clock.fastForward("31:00");
    await expect(patient.getByText("Are you still following your visit?")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Tap "I'm still here". The staff row then shows the time of the last tap.
    await patient.getByRole("button", { name: "I'm still here" }).click();
    await expect(row.getByTestId("progress")).toContainText(/last "I'm still here"/);

    // The patient's clock still says 31 minutes on, so the prompt is due again. Put the clock back to real time.
    await backToRealTime(patient);
    await expect(patient.getByTestId("still-here")).toBeHidden();
    await expect(patient.getByTestId("still-here-card")).toContainText("Thank you.");
    expect(await axeFaults(patient)).toEqual([]);

    // Staff: 40 minutes after the last tap with no new tap is "missed". Move the staff clock on 40 minutes.
    await staff.clock.fastForward("40:00");
    await expect(row.getByTestId("still-here-flag")).toContainText("Missed");
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});

test("recall with no answer: the 10, 20 and 30 minute steps, unable to reach, reopen, and triage again", async ({ browser }) => {
  const staff = await openMovableStaff(browser);
  const patient = await openMovablePatient(browser);
  try {
    // Check the patient in at the desk, then the patient opens the link.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    // Recall the patient and confirm. The phone shows the called screen. The patient does not answer.
    await row.getByRole("button", { name: /^Recall patient/ }).click();
    await row.getByRole("button", { name: "Yes, recall patient" }).click();
    await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // 10 minutes: the patient's phone shows the second alert, and staff see "Phone the patient now".
    await patient.clock.fastForward("10:00");
    await staff.clock.fastForward("10:00");
    await expect(patient.getByTestId("call-reminder-second_alert")).toHaveText(
      "Please come back to the emergency department right now. Staff may phone you.",
    );
    await expect(row.getByTestId("flag-phone")).toContainText("Phone the patient now.");
    expect(await axeFaults(patient)).toEqual([]);

    // Record one phone call with no answer. The flag goes, because one call is now recorded.
    await row.getByRole("button", { name: "Phoned, no answer" }).click();
    await expect(row.getByTestId("flag-phone")).toBeHidden();

    // 20 minutes: the patient's phone shows "Please return now", and staff see "Phone the patient again".
    await patient.clock.fastForward("10:00");
    await staff.clock.fastForward("10:00");
    await expect(patient.getByTestId("call-reminder-return_now")).toHaveText(
      "We have not heard from you. Please return now. Staff will review your visit if you do not respond.",
    );
    await expect(row.getByTestId("flag-phone_again")).toContainText("Phone the patient again.");
    expect(await axeFaults(patient)).toEqual([]);

    // Record the second phone call with no answer. The flag goes.
    await row.getByRole("button", { name: "Phoned, no answer" }).click();
    await expect(row.getByTestId("flag-phone_again")).toBeHidden();

    // 30 minutes with no answered call: staff see "Review: unable to reach". A nurse must confirm it.
    await staff.clock.fastForward("10:00");
    await expect(row.getByTestId("flag-review")).toContainText("Review: unable to reach.");

    // Confirm unable to reach. The visit leaves the off-site line and shows under Recently closed.
    await row.locator("summary", { hasText: "Confirm unable to reach" }).click();
    await row.getByRole("button", { name: "Yes, unable to reach" }).click();
    await expect(row).toBeHidden();
    await expect(staff.getByTestId(`closed-${code}`)).toBeVisible();

    // The patient's phone shows the unable-to-reach screen, with the 911 line.
    await expect(patient.getByRole("heading", { name: "Your off-site wait has ended" })).toBeVisible();
    await expect(patient.getByText(UNABLE_TEXT)).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Put both clocks back to the real time before the visit is reopened and triaged again.
    await backToRealTime(patient);
    await backToRealTime(staff);

    // Reopen in Recently closed: the visit needs reassessment, and shows under "Back for reassessment".
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Reopen" }).click();
    await expect(staff.getByTestId(`reassess-${code}`)).toBeVisible();
    await expect(patient.getByRole("heading", { name: "Please go to the triage desk" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Triage again: the check-in form opens, and its heading names this visit.
    await staff.getByTestId(`reassess-${code}`).getByRole("button", { name: "Triage again" }).click();
    await expect(staff.getByRole("heading", { name: `Check in visit ${code} after triage` })).toBeVisible();

    // Finish the check-in with the three ticks. The visit is waiting again, on the staff list and the phone.
    await fillCheckIn(staff, { ticks: true });
    await staff.getByRole("button", { name: "Start off-site waiting", exact: true }).click();
    await expect(row).toBeVisible();
    await expect(row.getByTestId("progress")).toHaveText("Waiting off-site");
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
