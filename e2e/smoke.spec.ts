// First check that the test set-up works: the app starts on port 3100 and the staff account can sign in.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { openStaff } from "./helpers/staff";

test("the start page opens and shows the 911 line", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/911/).first()).toBeVisible();
});

test("the start page has no accessibility fault, with its pictures loaded", async ({ page }) => {
  await page.goto("/");
  // The pictures load lazily, so scroll to each one first; then axe checks the page as a patient sees it.
  const pictures = page.locator('section[aria-labelledby="how-heading"] img');
  await expect(pictures).toHaveCount(6);
  for (const picture of await pictures.all()) {
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  expect(await axeFaults(page)).toEqual([]);
});

test("the test staff account signs in", async ({ browser }) => {
  const staff = await openStaff(browser);
  await expect(staff).toHaveURL(/\/staff/);
  await staff.context().close();
});
