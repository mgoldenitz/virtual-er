// First check that the test set-up works: the app starts on port 3100 and the staff account can sign in.

import { expect, test } from "@playwright/test";
import { openStaff } from "./helpers/staff";

test("the start page opens and shows the 911 line", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/911/).first()).toBeVisible();
});

test("the test staff account signs in", async ({ browser }) => {
  const staff = await openStaff(browser);
  await expect(staff).toHaveURL(/\/staff/);
  await staff.context().close();
});
