// Signs in as the test staff account once, and saves the session to .auth/staff.json for the other tests.

import { expect, test as setup } from "@playwright/test";
import { STAFF_STATE, staffAccount } from "./helpers/staff";

setup("sign in as the test staff account", async ({ page }) => {
  const { email, password } = staffAccount();
  await page.goto("/login?next=/staff");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Wait for the path itself: the sign-in address "/login?next=/staff" also contains "/staff".
  await expect(page).toHaveURL((url) => url.pathname === "/staff", { timeout: 15_000 });
  await page.context().storageState({ path: STAFF_STATE });
});
