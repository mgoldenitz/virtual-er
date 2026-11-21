// Opens a patient phone with no saved data, and opens a visit from home or from a slip link.

import type { Browser, Page } from "@playwright/test";

/** A new context starts with no saved data, so no saved visit hides the broken-link screen. */
export async function openPatient(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

/** Opens the start page, where a patient starts a visit before arrival. */
export async function openHome(page: Page): Promise<void> {
  await page.goto("/");
}

/** Opens a slip link (for example "http://localhost:3100/patient#t=..."). */
export async function openSlipLink(page: Page, link: string): Promise<void> {
  await page.goto(link);
}
