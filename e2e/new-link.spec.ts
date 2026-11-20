// Lost phone: staff issue a new link, the old link stops working, and the new link opens the same waiting visit.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, readSlip, staffRow } from "./helpers/flows";
import { openPatient, openSlipLink } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
const DEAD_LINK_HEADING = "This visit link does not work or is no longer active";

test("a new link replaces the old one, and the new link opens the waiting visit", async ({ browser }) => {
  const staff = await openStaff(browser);
  const oldPhone = await openPatient(browser);
  const newPhone = await openPatient(browser);
  try {
    // Check in at the desk, and open the slip link on the first phone: it shows waiting.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await openSlipLink(oldPhone, link);
    await expect(oldPhone.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    // Staff open "Lost or stolen phone", press "Issue a new link", then confirm.
    await row.locator("summary", { hasText: "Lost or stolen phone" }).click();
    await row.getByRole("button", { name: "Issue a new link" }).click();
    await row.getByRole("button", { name: "Yes, issue a new link" }).click();

    // Staff see the status message. The slip now shows the new link.
    await expect(row.getByText(`New link issued for ${code}. The old link no longer works.`)).toBeVisible();
    const fresh = await readSlip(staff);
    expect(fresh.code).toBe(code);
    expect(fresh.link).not.toBe(link);

    // The first phone shows the dead-link screen, with the 911 line and no accessibility fault.
    await expect(oldPhone.getByRole("heading", { name: DEAD_LINK_HEADING })).toBeVisible();
    await expect(oldPhone.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(oldPhone)).toEqual([]);

    // The new link opens the same visit on the second phone: waiting, the 911 line, and no accessibility fault.
    await openSlipLink(newPhone, fresh.link);
    await expect(newPhone.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(newPhone.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(newPhone)).toEqual([]);
  } finally {
    await staff.context().close();
    await oldPhone.context().close();
    await newPhone.context().close();
  }
});
