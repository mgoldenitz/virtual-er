// Steps that many tests share: start a visit from home, check a patient in at the desk, find a staff row.
// Each step that makes a visit writes its code down for npm run e2e:cleanup.

import { expect, type Locator, type Page } from "@playwright/test";
import { rememberCode } from "./visitCodes";

export type Site = "A" | "B";

/** On the start page: choose the site, press "Start a visit", and give back the new visit code. */
export async function startFromHome(patient: Page, site: Site): Promise<string> {
  await patient.goto("/");
  await patient.getByRole("radio", { name: `Demo Site ${site}` }).check();
  await patient.getByRole("button", { name: "Start a visit" }).click();
  await expect(patient).toHaveURL(/\/patient/, { timeout: 15_000 });
  const code = await patientCode(patient);
  rememberCode(code);
  return code;
}

/** The visit code on the patient screen (the bold code after "Visit code:", in any language). */
export async function patientCode(patient: Page): Promise<string> {
  const code = patient.locator("main strong.font-mono").first();
  await expect(code).toHaveText(/^[A-Z0-9]{6}$/, { timeout: 15_000 });
  return (await code.textContent()) ?? "";
}

/** Chooses the site in the staff header. */
export async function chooseSite(staff: Page, site: Site): Promise<void> {
  // The header's select is the only combobox whose name starts with "Site".
  await staff.getByRole("combobox", { name: /^Site/ }).selectOption(site);
}

/** Fills the check-in form: CTAS 4, and (for off-site waiting) the three checklist ticks. */
export async function fillCheckIn(staff: Page, options: { ticks: boolean; language?: string } = { ticks: true }): Promise<void> {
  await staff.getByRole("radio", { name: "CTAS 4" }).check();
  if (options.ticks) {
    await staff.getByRole("checkbox", { name: "Has a phone with them" }).check();
    await staff.getByRole("checkbox", { name: "Can return within 20 minutes" }).check();
    await staff.getByRole("checkbox", { name: "Agrees to wait off-site" }).check();
  }
  if (options.language) {
    await staff.getByLabel("Language", { exact: true }).selectOption(options.language);
  }
}

/** The slip after a check-in: its code (written down for cleanup) and the link that opens the visit. */
export async function readSlip(staff: Page): Promise<{ code: string; link: string }> {
  const slip = staff.locator("section", { has: staff.locator("#slip-heading") });
  await expect(slip).toBeVisible();
  const code = (await slip.locator("strong.font-mono").textContent()) ?? "";
  const link = (await slip.getByRole("link", { name: /open the patient screen/ }).getAttribute("href")) ?? "";
  rememberCode(code);
  return { code, link };
}

/** A new desk check-in for off-site waiting. Gives back the slip. */
export async function deskCheckIn(staff: Page, site: Site, language?: string): Promise<{ code: string; link: string }> {
  await chooseSite(staff, site);
  await fillCheckIn(staff, { ticks: true, language });
  await staff.getByRole("button", { name: "Start off-site waiting" }).click();
  return readSlip(staff);
}

/** The code in the check-in message (for example "Visit ABC123 recorded as offered, declined."), written down for cleanup. */
export async function codeFromMessage(staff: Page, outcome: string): Promise<string> {
  const message = staff.getByText(new RegExp(`Visit [A-Z0-9]{6} recorded as ${outcome}`));
  await expect(message).toBeVisible();
  const text = (await message.textContent()) ?? "";
  const match = /Visit ([A-Z0-9]{6}) recorded/.exec(text);
  if (!match) throw new Error(`No visit code found in the check-in message: ${text}`);
  rememberCode(match[1]);
  return match[1];
}

/** The staff row of a visit in the off-site line. */
export function staffRow(staff: Page, code: string): Locator {
  return staff.getByTestId(`row-${code}`);
}
