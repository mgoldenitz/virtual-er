// Languages: a desk check-in in French or Arabic gives a slip. The slip link opens the patient screen
// in that language, with the right text direction, the translated waiting heading and emergency line,
// and no accessibility faults. The words come from the language files, not typed here.

import { expect, test } from "@playwright/test";
import { ar } from "../lib/text/ar";
import { en } from "../lib/text/en";
import { fr } from "../lib/text/fr";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

// One case per language: its code, the text direction the screen must use, and its language file.
type LanguageCase = { lang: string; dir: "ltr" | "rtl"; text: typeof en };

const CASES: LanguageCase[] = [
  { lang: "fr", dir: "ltr", text: fr },
  { lang: "ar", dir: "rtl", text: ar },
];

for (const { lang, dir, text } of CASES) {
  test(`a desk check-in in "${lang}" opens the patient screen in "${lang}"`, async ({ browser }) => {
    const staff = await openStaff(browser);
    const patient = await openPatient(browser);
    try {
      // The staff check in the visit with this language. The slip link carries the same language.
      const { link } = await deskCheckIn(staff, "A", lang);

      // The patient opens the slip link on the phone.
      await patient.goto(link);

      // The page language and the text direction of the main part of the screen.
      const main = patient.locator("main");
      await expect(main).toHaveAttribute("lang", lang);
      await expect(main).toHaveAttribute("dir", dir);
      // The head script hid the screen until it showed this language; now it shows again.
      await expect(patient.locator("html")).not.toHaveAttribute("data-lang-wait", /.*/);
      await expect(main).toBeVisible();

      // The waiting heading and the 911 line are in this language, and the English heading is not shown.
      await expect(patient.getByRole("heading", { name: text.patient.waitingHeading })).toBeVisible();
      await expect(patient.getByText(text.emergencyLine).first()).toBeVisible();
      await expect(patient.getByText(en.patient.waitingHeading, { exact: true })).toHaveCount(0);

      // fr and ar are not approved yet, so the draft notice shows in that language.
      await expect(patient.getByTestId("draft-notice")).toHaveText(text.language.draftNotice);

      expect(await axeFaults(patient)).toEqual([]);
    } finally {
      await staff.context().close();
      await patient.context().close();
    }
  });
}

test("a saved language shows before React loads, never English", async ({ page }) => {
  // Arabic is saved on the phone, then every script file is held back 3 s, so React loads late.
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("vwr.language", "ar"));
  await page.route(/\.js(\?|$)/, async (route) => {
    await new Promise((done) => setTimeout(done, 3000));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  const html = page.locator("html");
  const main = page.locator("main");
  await main.waitFor({ state: "attached" });

  // Before React: the head script set Arabic, right to left, and hid the English main part.
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("data-lang-wait", "ar");
  await expect(main).toBeHidden();

  // After the 1.5 s limit, the main part shows again, so the page never stays empty.
  await expect(html).not.toHaveAttribute("data-lang-wait", /.*/, { timeout: 2500 });
  await expect(main).toBeVisible();

  // After React: the heading is in Arabic.
  await expect(page.getByRole("heading", { name: ar.appName })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(en.appName, { exact: true })).toHaveCount(0);
});
