// Opens a staff page in its own browser context, with the session that the setup saved (e2e/auth.setup.ts).

import { expect, type Browser, type Page } from "@playwright/test";

/** Where the setup saves the signed-in staff session. Git ignores this folder. */
export const STAFF_STATE = ".auth/staff.json";

/** The test account from .env.local. Stops the test with a plain message if a value is missing. */
export function staffAccount(): { email: string; password: string } {
  const email = process.env.E2E_STAFF_EMAIL ?? "";
  const password = process.env.E2E_STAFF_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error("Put E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD in .env.local (see .env.example).");
  }
  return { email, password };
}

/** A new staff context with the saved session, on the staff list. */
export async function openStaff(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: STAFF_STATE });
  const page = await context.newPage();
  await page.goto("/staff");
  // Wait for the path itself: the sign-in address "/login?next=/staff" also contains "/staff".
  await expect(page).toHaveURL((url) => url.pathname === "/staff", { timeout: 15_000 });
  return page;
}
