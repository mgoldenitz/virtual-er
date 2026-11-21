// Dashboard: real visits show by default, a desk check-in at Site A adds 1 to the "Waiting off-site"
// and "Accepted" numbers, and Demo shows the demo numbers for both sites.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn } from "./helpers/flows";
import { openStaff } from "./helpers/staff";

/** The value cell (dd) of the row whose label (dt) is given, inside one site's section. */
function rowValue(section: Locator, label: string): Locator {
  return section.getByText(label, { exact: true }).locator("xpath=following-sibling::dd[1]");
}

/** The first whole number in a row's value: 3 from "3", or 3 from "3 of 5 offered (60%)". */
async function rowNumber(section: Locator, label: string): Promise<number> {
  const text = (await rowValue(section, label).textContent()) ?? "";
  const match = /\d+/.exec(text);
  if (!match) throw new Error(`No number in the "${label}" row: ${text}`);
  return Number(match[0]);
}

/** Waits until both site sections are on the page. They only show once the numbers have loaded. */
// exact: true, because the trend box "Demo Site A, past 7 days" is a region too, and the name is matched as a part otherwise.
async function waitForNumbers(page: Page): Promise<void> {
  await expect(page.getByRole("region", { name: "Demo Site A", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Site B", exact: true })).toBeVisible();
}

test("real visits show by default, a desk check-in adds to the Site A numbers, and demo shows both sites", async ({ browser }) => {
  const staff = await openStaff(browser);
  try {
    // The dashboard opens in a second page of the same staff sign-in.
    const dashboard = await staff.context().newPage();
    const realButton = dashboard.getByRole("button", { name: "Real", exact: true });
    const demoButton = dashboard.getByRole("button", { name: "Demo", exact: true });

    // Real is the default.
    await dashboard.goto("/dashboard");
    await waitForNumbers(dashboard);
    await expect(dashboard.getByText("Showing real visits only.")).toBeVisible();
    await expect(realButton).toHaveAttribute("aria-pressed", "true");

    // Read the Site A numbers before the check-in.
    const siteA = dashboard.getByRole("region", { name: "Demo Site A", exact: true });
    const waitingBefore = await rowNumber(siteA, "Waiting off-site");
    const acceptedBefore = await rowNumber(siteA, "Accepted");

    // A desk check-in at Site A on the staff page, then the dashboard is loaded again.
    await deskCheckIn(staff, "A");
    await dashboard.reload();
    await waitForNumbers(dashboard);
    await expect.poll(() => rowNumber(siteA, "Waiting off-site")).toBe(waitingBefore + 1);
    await expect.poll(() => rowNumber(siteA, "Accepted")).toBe(acceptedBefore + 1);

    // Demo shows demo visits, and both site sections show numbers.
    await demoButton.click();
    await expect(dashboard.getByText("Showing demo visits only.")).toBeVisible();
    await expect(demoButton).toHaveAttribute("aria-pressed", "true");
    await expect(realButton).toHaveAttribute("aria-pressed", "false");
    await waitForNumbers(dashboard);
    for (const site of ["A", "B"]) {
      const section = dashboard.getByRole("region", { name: `Demo Site ${site}`, exact: true });
      await expect(rowValue(section, "Waiting off-site")).toHaveText(/^\d+$/);
    }

    expect(await axeFaults(dashboard)).toEqual([]);
  } finally {
    await staff.context().close();
  }
});
