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
type LanguageCase = { code: string; dir: "ltr" | "rtl"; text: typeof en };

const CASES: LanguageCase[] = [
  { code: "fr", dir: "ltr", text: fr },
  { code: "ar", dir: "rtl", text: ar },
];

for (const { code, dir, text } of CASES) {
  test(`a desk check-in in "${code}" opens the patient screen in "${code}"`, async ({ browser }) => {
    const staff = await openStaff(browser);
    const patient = await openPatient(browser);
    try {
      // The staff check in the visit with this language. The slip link carries the same language.
      const { link } = await deskCheckIn(staff, "A", code);

      // The patient opens the slip link on the phone.
      await patient.goto(link);

      // The page language and the text direction of the main part of the screen.
      const main = patient.locator("main");
      await expect(main).toHaveAttribute("lang", code);
      await expect(main).toHaveAttribute("dir", dir);

      // The waiting heading and the 911 line are in this language, and the English heading is not shown.
      await expect(patient.getByRole("heading", { name: text.patient.waitingHeading })).toBeVisible();
      await expect(patient.getByText(text.emergencyLine).first()).toBeVisible();
      await expect(patient.getByText(en.patient.waitingHeading, { exact: true })).toHaveCount(0);

      expect(await axeFaults(patient)).toEqual([]);
    } finally {
      await staff.context().close();
      await patient.context().close();
    }
  });
}
