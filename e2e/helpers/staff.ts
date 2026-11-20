// Signs in as the test staff account in its own browser context, and gives back its page.

import { expect, type Browser, type Page } from "@playwright/test";

/** The test account from .env.local. Stops the test with a plain message if a value is missing. */
function staffAccount(): { email: string; password: string } {
  const email = process.env.E2E_STAFF_EMAIL ?? "";
  const password = process.env.E2E_STAFF_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error("Put E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD in .env.local (see .env.example).");
  }
  return { email, password };
}

/** A new staff context, signed in, on the staff list. */
export async function openStaff(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { email, password } = staffAccount();
  await page.goto("/login?next=/staff");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff/, { timeout: 15_000 });
  return page;
}
