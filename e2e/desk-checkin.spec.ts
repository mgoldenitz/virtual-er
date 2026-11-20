// Desk check-in: a visit checked in with the three ticks gets a slip, and a patient who is offered or not eligible gets none.

import { expect, test, type Page } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { chooseSite, deskCheckIn, fillCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";
import { rememberCode } from "./helpers/visitCodes";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

/** The code in the check-in message (for example "Visit ABC123 recorded as offered, declined."), written down for cleanup. */
async function codeFromMessage(staff: Page, outcome: string): Promise<string> {
  const message = staff.getByText(new RegExp(`Visit [A-Z0-9]{6} recorded as ${outcome}`));
  await expect(message).toBeVisible();
  const text = (await message.textContent()) ?? "";
  const match = /Visit ([A-Z0-9]{6}) recorded/.exec(text);
  if (!match) throw new Error(`No visit code found in the check-in message: ${text}`);
  rememberCode(match[1]);
  return match[1];
}

test("a desk check-in gives a slip, and the slip link opens a waiting visit", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    await expect(staffRow(staff, code)).toBeVisible();

    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText("Your place in line:")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});

test("offered, declined: no slip, and the visit is listed as waiting on-site", async ({ browser }) => {
  const staff = await openStaff(browser);
  try {
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Offered, declined" }).click();

    const code = await codeFromMessage(staff, "offered, declined");
    await expect(staff.locator("#slip-heading")).toHaveCount(0);
    await expect(staff.getByRole("heading", { name: /Waiting on-site: offered, declined/ })).toBeVisible();
    await expect(staff.getByTestId(`onsite-${code}`)).toBeVisible();
  } finally {
    await staff.context().close();
  }
});

test("not eligible: no slip", async ({ browser }) => {
  const staff = await openStaff(browser);
  try {
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Not eligible" }).click();

    await codeFromMessage(staff, "not eligible");
    await expect(staff.locator("#slip-heading")).toHaveCount(0);
  } finally {
    await staff.context().close();
  }
});

test("a link with a wrong token shows the broken-link screen", async ({ browser }) => {
  const patient = await openPatient(browser);
  try {
    await patient.goto("/patient#t=NOTAREALTOKEN");
    await expect(patient.getByRole("heading", { name: "This link did not work" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await patient.context().close();
  }
});
