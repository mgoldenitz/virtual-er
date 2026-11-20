// A declined visit is switched to off-site waiting: the new slip opens a waiting visit, and Undo switch puts it back on-site.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { chooseSite, codeFromMessage, fillCheckIn, readSlip, staffRow } from "./helpers/flows";
import { openPatient, openSlipLink } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("declined, then switched to off-site waiting, then undone", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    // At the desk, the patient is offered off-site waiting and declines. The visit is listed as waiting on-site.
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Offered, declined" }).click();
    const code = await codeFromMessage(staff, "offered, declined");
    const onsite = staff.getByTestId(`onsite-${code}`);
    await expect(onsite).toBeVisible();

    // The patient changes their mind. Staff open the switch for this visit, tick all three items, and confirm.
    await onsite.getByRole("button", { name: "Switch to off-site waiting" }).click();
    await onsite.getByRole("checkbox", { name: "Has a phone with them" }).check();
    await onsite.getByRole("checkbox", { name: "Can return within 20 minutes" }).check();
    await onsite.getByRole("checkbox", { name: "Agrees to wait off-site" }).check();
    await onsite.getByRole("button", { name: "Start off-site waiting" }).click();

    // The new slip is for the same code, and the visit is a row in the off-site line.
    const slip = await readSlip(staff);
    expect(slip.code).toBe(code);
    await expect(staffRow(staff, code)).toBeVisible();

    // The slip link opens a waiting visit on the patient phone.
    await openSlipLink(patient, slip.link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Staff press Undo switch: the visit is back on-site, and its row leaves the off-site line.
    await staff.getByRole("button", { name: `Undo switch for visit ${code}`, exact: true }).click();
    await expect(onsite).toBeVisible();
    await expect(staffRow(staff, code)).toHaveCount(0);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
