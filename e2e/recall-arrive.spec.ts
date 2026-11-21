// Recall and arrival: staff recall a waiting patient, the patient is on the way, staff mark arrived, the patient answers the survey, and Undo brings the visit back; a second arrival shows thank you, not a second survey.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
// The survey's fieldset has this question as its name. (The text size switch has radio buttons too.)
const SURVEY = "How would you rate your waiting experience?";

test("recall, on the way, arrived, the survey, then undo and arrive again",async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Recall: staff confirm, and the phone shows the called screen.
    await row.getByRole("button", { name: /^Recall patient/ }).click();
    await row.getByRole("button", { name: "Yes, recall patient" }).click();
    await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // The patient is on the way: the phone confirms, and the staff row says so.
    await patient.getByRole("button", { name: "I'm on my way" }).click();
    await expect(patient.getByTestId("confirmed")).toHaveText("Thank you. Staff know you are on your way.");
    await expect(row.getByTestId("progress")).toContainText("On the way");
    expect(await axeFaults(patient)).toEqual([]);

    // Staff mark the patient arrived: the row leaves the list, and the phone shows the desk screen.
    await row.getByRole("button", { name: "Mark arrived" }).click();
    await expect(row).toBeHidden();
    await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toBeVisible();
    await expect(patient.getByText("How would you rate your waiting experience?")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // The survey: pick 8, Submit, and the phone says thank you instead of asking again.
    await patient.getByRole("radio", { name: "8" }).check();
    await patient.getByRole("button", { name: "Submit" }).click();
    await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toBeVisible();
    await expect(patient.getByRole("group", { name: SURVEY })).toHaveCount(0);
    expect(await axeFaults(patient)).toEqual([]);

    // Undo in Recently closed: the row shows on the list again.
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();

    // Undo puts the visit back to on_the_way, so the phone shows the called screen again.
    await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
    await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toHaveCount(0);

    // A second arrival keeps the score (owner decision 2026-11-20): thank you, and no second survey.
    await row.getByRole("button", { name: "Mark arrived" }).click();
    await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toBeVisible();
    await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toBeVisible();
    await expect(patient.getByRole("group", { name: SURVEY })).toHaveCount(0);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
