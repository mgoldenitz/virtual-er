// Removing a visit: staff remove a patient as "Left" or "No-show", the phone shows the ended screen, and Undo brings the visit back.

import { expect, test, type Browser } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

/** Removes a waiting visit with the given button, checks the phone, then undoes the removal. */
async function removeThenUndo(browser: Browser, button: "Left" | "No-show"): Promise<void> {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    await row.locator("summary", { hasText: "Remove from list" }).click();
    await row.getByRole("button", { name: button, exact: true }).click();
    await expect(patient.getByRole("heading", { name: "Your off-site wait has ended" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Undo in Recently closed: the row shows on the list, and the phone is waiting again.
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
}

test("remove as Left, then undo", async ({ browser }) => {
  await removeThenUndo(browser, "Left");
});

test("remove as No-show, then undo", async ({ browser }) => {
  await removeThenUndo(browser, "No-show");
});
