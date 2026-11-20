// Part 1 of docs/visit-lifecycle.html: a visit started from home, then checked in at the desk.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { fillCheckIn, chooseSite, startFromHome, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("start from home, then staff check the visit in", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    await chooseSite(staff, "A");
    const code = await startFromHome(patient, "A");

    // pre_arrival screen: its heading, the triage sentence, the 911 line, and no accessibility fault.
    await expect(patient.getByText("Status: Started from home, not seen by a nurse yet")).toBeVisible();
    await expect(patient.getByText("Your place in line starts when a nurse sees you at triage.", { exact: false }).first()).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Staff see it in Expected arrivals, and check it in with the three ticks.
    const expected = staff.getByTestId(`expected-${code}`);
    await expect(expected).toBeVisible();
    await expected.getByRole("button", { name: /Check in/ }).click();
    await expect(staff.getByRole("heading", { name: `Check in visit ${code} after triage` })).toBeVisible();
    await fillCheckIn(staff, { ticks: true });
    await staff.getByRole("button", { name: "Start off-site waiting" }).click();
    await expect(staffRow(staff, code)).toBeVisible();

    // The patient screen changes to waiting: a place, a range, and the demo sentence.
    await expect(patient.getByText("Status: Waiting")).toBeVisible();
    await expect(patient.getByText("Your place in line:")).toBeVisible();
    await expect(patient.getByText("Estimated time until you're called back:")).toBeVisible();
    await expect(patient.getByText("This estimate is simulated for the demo.")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
