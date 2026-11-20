# Gemini review: the Phase 5 browser tests (e2e)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.
Attach also: `docs/visit-lifecycle.html` (the map of every visit status and step).

## Question for the model

You review the browser tests of a concept prototype: a virtual ER waiting room. Low-acuity patients wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Synthetic data only. The tests use Playwright 1.65.1 against the dev server (Next.js App Router, Supabase).

Find problems. Do not confirm what is good. For each problem give: the file and line, what can go wrong (a concrete case), and the smallest fix. Look for:

1. Gaps: a status or step in `visit-lifecycle.html` that no test covers, or covers only the happy path.
2. Weak checks: a test that can pass while the app is wrong (for example it checks that a word is on the page, but not on the right screen or for the right visit).
3. Unstable tests: waits that depend on timing, the `page.clock` use in `timed-steps.spec.ts`, shared state between tests in the real database, order between tests.
4. Clean-up: a test visit whose code is not written down (each must go through `rememberCode`), so `npm run e2e:cleanup` misses it.
5. Safety: anything that can send a real alert, touch a real patient, or put the test account's values into a log.
6. Readability for a beginner: names, comments, files that do two jobs.

## Settled, do not report

- Two tests fail on purpose, on the phone and the laptop: `desk-checkin.spec.ts` "a link with a wrong token" (the app shows the wrong screen; fix planned) and `recall-arrive.spec.ts` (the survey question after arrival is not built yet; owner chose to build it next). They stay failing until the app is fixed.
- The database replaces each saved time with its own `now()` and checks only the order of steps, so the minute rules are tested by moving each page clock, with `/api/time` blocked.
- One worker on purpose: the tests share one real database.
- The cleanup prints SQL that the owner runs by hand; the tests have no service key on purpose.
- Pushover values are empty in `playwright.config.ts` on purpose, so no phone alert goes out.

## Checked (output in this session)

- `npm run e2e`: 32 passed, 4 failed (only the 2 settled faults, each on phone and laptop), 3.1 min.
- `npm test`: 85 test files, 520 tests pass. `npm run lint`: no faults. `npm run build`: passed. `npx tsc --noEmit -p .`: no faults.
- Cleanup: 28 test visits deleted; the count line gave 0.

## Not checked

- The tests on a real phone or on other browsers than Chromium.
- The tests against the live Vercel site (they run on localhost port 3100 only).
- Whether the tests pass when run many times in a row (each file passed in 1 to 3 full runs).

## Files (all new on branch `phase5-e2e`, line counts)

- `playwright.config.ts`: 35 lines
- `e2e/helpers/staff.ts`: 27 lines
- `e2e/helpers/patient.ts`: 19 lines
- `e2e/helpers/flows.ts`: 79 lines
- `e2e/helpers/visitCodes.ts`: 11 lines
- `e2e/helpers/axe.ts`: 16 lines
- `e2e/smoke.spec.ts`: 15 lines
- `e2e/home-start.spec.ts`: 44 lines
- `e2e/desk-checkin.spec.ts`: 69 lines
- `e2e/recall-arrive.spec.ts`: 49 lines
- `e2e/remove-undo.spec.ts`: 43 lines
- `e2e/declined-switch.spec.ts`: 49 lines
- `e2e/pause.spec.ts`: 63 lines
- `e2e/new-link.spec.ts`: 49 lines
- `e2e/timed-steps.spec.ts`: 169 lines
- `e2e/languages.spec.ts`: 49 lines
- `e2e/dashboard.spec.ts`: 69 lines
- `lib/e2eCleanup.ts`: 34 lines
- `lib/e2eCleanup.test.ts`: 50 lines
- `scripts/e2e-cleanup.mjs`: 20 lines

### playwright.config.ts

```ts
// Settings for the end-to-end tests (npm run e2e): which app to start, and the phone and laptop sizes.

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

// Reads .env.local into this process (E2E_STAFF_EMAIL, E2E_STAFF_PASSWORD). The values are never printed.
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const PORT = 3100; // Not 3000, so the owner's own dev server is not touched.

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 }, // A screen must change within 5 seconds of the other screen's action.
  fullyParallel: false,
  workers: 1, // The tests share one database and one site list, so they run one at a time.
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "laptop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `node scripts/dev.mjs -p ${PORT}`, // dev.mjs keeps the Norton fix (--use-system-ca).
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Empty Pushover values, so a test recall sends no message to the owner's phone.
    // Next.js does not replace a value that is already set in the process.
    env: { PUSHOVER_APP_TOKEN: "", PUSHOVER_USER_KEY: "" },
  },
});
```

### e2e/helpers/staff.ts

```ts
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
  // Wait for the path itself: the sign-in address "/login?next=/staff" also contains "/staff".
  await expect(page).toHaveURL((url) => url.pathname === "/staff", { timeout: 15_000 });
  return page;
}
```

### e2e/helpers/patient.ts

```ts
// Opens a patient phone with no saved data, and opens a visit from home or from a slip link.

import type { Browser, Page } from "@playwright/test";

/** A new context with no saved visit (a saved visit would hide the broken-link screen). */
export async function openPatient(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: undefined });
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
```

### e2e/helpers/flows.ts

```ts
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
    // Find the select by its role and name: the label around it also holds the option names.
    await staff.getByRole("combobox", { name: "Language", exact: true }).selectOption(options.language);
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
```

### e2e/helpers/visitCodes.ts

```ts
// Writes down each visit code a test makes, so npm run e2e:cleanup can delete those visits after the run.

import { appendFileSync, mkdirSync } from "node:fs";

export const CODES_FILE = "test-results/e2e-codes.txt"; // git ignores test-results/.

/** Adds one code on its own line. The cleanup script checks each code before it reaches SQL. */
export function rememberCode(code: string): void {
  mkdirSync("test-results", { recursive: true });
  appendFileSync(CODES_FILE, `${code}\n`);
}
```

### e2e/helpers/axe.ts

```ts
// Runs the axe accessibility checks (WCAG 2.2 AA) on the open page and gives back the faults.

import type { Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Each fault as "rule-id: help text (N places)". An empty list means no fault. */
export async function axeFaults(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  return page.evaluate(async (tags) => {
    // axe is put on window by the script above.
    const axe = (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; help: string; nodes: unknown[] }[] }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} places)`);
  }, WCAG_TAGS);
}
```

### e2e/smoke.spec.ts

```ts
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
```

### e2e/home-start.spec.ts

```ts
// Part 1 of docs/visit-lifecycle.html: a visit started from home, then checked in at the desk.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { fillCheckIn, chooseSite, startFromHome, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("start from home, then staff check the visit in", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    await chooseSite(staff, "A");
    const code = await startFromHome(patient, "A");

    // pre_arrival screen: its heading, the triage sentence, the 911 line, and no accessibility fault.
    await expect(patient.getByText("Status: Started from home, not seen by a nurse yet")).toBeVisible();
    await expect(patient.getByText("Your place in line starts when a nurse sees you at triage.", { exact: false }).first()).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Staff see it in Expected arrivals, and check it in with the three ticks.
    const expected = staff.getByTestId(`expected-${code}`);
    await expect(expected).toBeVisible();
    await expected.getByRole("button", { name: /Check in/ }).click();
    await expect(staff.getByRole("heading", { name: `Check in visit ${code} after triage` })).toBeVisible();
    await fillCheckIn(staff, { ticks: true });
    await staff.getByRole("button", { name: "Start off-site waiting" }).click();
    await expect(staffRow(staff, code)).toBeVisible();

    // The patient screen changes to waiting: a place, a range, and the demo sentence.
    await expect(patient.getByText("Status: Waiting")).toBeVisible();
    await expect(patient.getByText("Your place in line:")).toBeVisible();
    await expect(patient.getByText("Estimated time until you're called back:")).toBeVisible();
    await expect(patient.getByText("This estimate is simulated for the demo.")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
```

### e2e/desk-checkin.spec.ts

```ts
// Desk check-in: a visit checked in with the three ticks gets a slip, and a patient who is offered or not eligible gets none.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { chooseSite, codeFromMessage, deskCheckIn, fillCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("a desk check-in gives a slip, and the slip link opens a waiting visit", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    await expect(staffRow(staff, code)).toBeVisible();

    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText("Your place in line:")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});

test("offered, declined: no slip, and the visit is listed as waiting on-site", async ({ browser }) => {
  const staff = await openStaff(browser);
  try {
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Offered, declined" }).click();

    const code = await codeFromMessage(staff, "offered, declined");
    await expect(staff.locator("#slip-heading")).toHaveCount(0);
    await expect(staff.getByRole("heading", { name: /Waiting on-site: offered, declined/ })).toBeVisible();
    await expect(staff.getByTestId(`onsite-${code}`)).toBeVisible();
  } finally {
    await staff.context().close();
  }
});

test("not eligible: no slip", async ({ browser }) => {
  const staff = await openStaff(browser);
  try {
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Not eligible" }).click();

    await codeFromMessage(staff, "not eligible");
    await expect(staff.locator("#slip-heading")).toHaveCount(0);
  } finally {
    await staff.context().close();
  }
});

test("a link with a wrong token shows the broken-link screen", async ({ browser }) => {
  const patient = await openPatient(browser);
  try {
    await patient.goto("/patient#t=NOTAREALTOKEN");
    await expect(patient.getByRole("heading", { name: "This link did not work" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await patient.context().close();
  }
});
```

### e2e/recall-arrive.spec.ts

```ts
// Recall and arrival: staff recall a waiting patient, the patient is on the way, staff mark arrived, and Undo brings the visit back to the list.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("recall, on the way, arrived, then undo the arrival", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Recall: staff confirm, and the phone shows the called screen.
    await row.getByRole("button", { name: /^Recall patient/ }).click();
    await row.getByRole("button", { name: "Yes, recall patient" }).click();
    await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // The patient is on the way: the phone confirms, and the staff row says so.
    await patient.getByRole("button", { name: "I'm on my way" }).click();
    await expect(patient.getByTestId("confirmed")).toHaveText("Thank you. Staff know you are on your way.");
    await expect(row.getByTestId("progress")).toContainText("On the way");
    expect(await axeFaults(patient)).toEqual([]);

    // Staff mark the patient arrived: the row leaves the list, and the phone shows the desk screen.
    await row.getByRole("button", { name: "Mark arrived" }).click();
    await expect(row).toBeHidden();
    await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toBeVisible();
    await expect(patient.getByText("How would you rate your waiting experience?")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Undo in Recently closed: the row shows on the list again.
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
```

### e2e/remove-undo.spec.ts

```ts
// Removing a visit: staff remove a patient as "Left" or "No-show", the phone shows the ended screen, and Undo brings the visit back.

import { expect, test, type Browser } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

/** Removes a waiting visit with the given button, checks the phone, then undoes the removal. */
async function removeThenUndo(browser: Browser, button: "Left" | "No-show"): Promise<void> {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    await row.locator("summary", { hasText: "Remove from list" }).click();
    await row.getByRole("button", { name: button, exact: true }).click();
    await expect(patient.getByRole("heading", { name: "Your off-site wait has ended" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Undo in Recently closed: the row shows on the list, and the phone is waiting again.
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
}

test("remove as Left, then undo", async ({ browser }) => {
  await removeThenUndo(browser, "Left");
});

test("remove as No-show, then undo", async ({ browser }) => {
  await removeThenUndo(browser, "No-show");
});
```

### e2e/declined-switch.spec.ts

```ts
// A declined visit is switched to off-site waiting: the new slip opens a waiting visit, and Undo switch puts it back on-site.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { chooseSite, codeFromMessage, fillCheckIn, readSlip, staffRow } from "./helpers/flows";
import { openPatient, openSlipLink } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";

test("declined, then switched to off-site waiting, then undone", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    // At the desk, the patient is offered off-site waiting and declines. The visit is listed as waiting on-site.
    await chooseSite(staff, "A");
    await fillCheckIn(staff, { ticks: false });
    await staff.getByRole("button", { name: "Offered, declined" }).click();
    const code = await codeFromMessage(staff, "offered, declined");
    const onsite = staff.getByTestId(`onsite-${code}`);
    await expect(onsite).toBeVisible();

    // The patient changes their mind. Staff open the switch for this visit, tick all three items, and confirm.
    await onsite.getByRole("button", { name: "Switch to off-site waiting" }).click();
    await onsite.getByRole("checkbox", { name: "Has a phone with them" }).check();
    await onsite.getByRole("checkbox", { name: "Can return within 20 minutes" }).check();
    await onsite.getByRole("checkbox", { name: "Agrees to wait off-site" }).check();
    await onsite.getByRole("button", { name: "Start off-site waiting" }).click();

    // The new slip is for the same code, and the visit is a row in the off-site line.
    const slip = await readSlip(staff);
    expect(slip.code).toBe(code);
    await expect(staffRow(staff, code)).toBeVisible();

    // The slip link opens a waiting visit on the patient phone.
    await openSlipLink(patient, slip.link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Staff press Undo switch: the visit is back on-site, and its row leaves the off-site line.
    await staff.getByRole("button", { name: `Undo switch for visit ${code}`, exact: true }).click();
    await expect(onsite).toBeVisible();
    await expect(staffRow(staff, code)).toHaveCount(0);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
```

### e2e/pause.spec.ts

```ts
// Pausing off-site waiting at site B: the start page shows the paused message, the check-in offers on-site waiting only, and site B is switched on again.

import { expect, test, type Page } from "@playwright/test";
import { chooseSite } from "./helpers/flows";
import { openHome, openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const PAUSED_START_TEXT = "Off-site waiting is paused right now. Please come to the emergency department and wait there.";
const PAUSED_AT_SITE_TEXT = "Off-site waiting is paused at this site: the patient waits on-site.";
const RESUME_TICK = "I have checked that patients can be reached again (phones and this app work).";

/** The button that pauses site B (shown while site B is on). */
function pauseButton(staff: Page) {
  return staff.getByRole("button", { name: "Pause off-site waiting at Demo Site B…" });
}

/** The button that turns site B back on (shown while site B is paused). */
function resumeButton(staff: Page) {
  return staff.getByRole("button", { name: "Turn off-site waiting back on…" });
}

/** Turns site B back on if it is paused. Does nothing when site B is already on. */
async function turnSiteBOnIfPaused(staff: Page): Promise<void> {
  await chooseSite(staff, "B");
  // Wait until the switch has read site B: it then shows either the pause button or the turn-on button.
  await expect(pauseButton(staff).or(resumeButton(staff))).toBeVisible();
  if (!(await resumeButton(staff).isVisible())) return;
  await resumeButton(staff).click();
  await staff.getByRole("checkbox", { name: RESUME_TICK }).check();
  await staff.getByRole("button", { name: "Yes, turn it back on" }).click();
  await expect(pauseButton(staff)).toBeVisible();
}

test("paused site B: the start page and the check-in offer no off-site waiting", async ({ browser }) => {
  const staff = await openStaff(browser);
  const patient = await openPatient(browser);
  try {
    // Staff pause off-site waiting at site B, and confirm.
    await chooseSite(staff, "B");
    await pauseButton(staff).click();
    await staff.getByRole("button", { name: "Yes, pause off-site waiting" }).click();
    await expect(staff.getByTestId("paused-banner")).toBeVisible();

    // The start page for site B shows the paused message, and no "Start a visit" button.
    await openHome(patient);
    await patient.getByRole("radio", { name: "Demo Site B" }).check();
    await expect(patient.getByTestId("site-paused")).toHaveText(PAUSED_START_TEXT);
    await expect(patient.getByRole("button", { name: "Start a visit" })).toHaveCount(0);

    // The check-in for site B says the site is paused, offers "Waits on-site", and no "Start off-site waiting".
    await expect(staff.getByText(PAUSED_AT_SITE_TEXT)).toBeVisible();
    await expect(staff.getByRole("button", { name: "Waits on-site" })).toBeVisible();
    await expect(staff.getByRole("button", { name: "Start off-site waiting" })).toHaveCount(0);
  } finally {
    // Always switch site B back on, even when a check above failed, so no test leaves it paused.
    try {
      await turnSiteBOnIfPaused(staff);
    } finally {
      await staff.context().close();
      await patient.context().close();
    }
  }
});
```

### e2e/new-link.spec.ts

```ts
// Lost phone: staff issue a new link, the old link stops working, and the new link opens the same waiting visit.

import { expect, test } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, readSlip, staffRow } from "./helpers/flows";
import { openPatient, openSlipLink } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
const DEAD_LINK_HEADING = "This visit link does not work or is no longer active";

test("a new link replaces the old one, and the new link opens the waiting visit", async ({ browser }) => {
  const staff = await openStaff(browser);
  const oldPhone = await openPatient(browser);
  const newPhone = await openPatient(browser);
  try {
    // Check in at the desk, and open the slip link on the first phone: it shows waiting.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await openSlipLink(oldPhone, link);
    await expect(oldPhone.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    // Staff open "Lost or stolen phone", press "Issue a new link", then confirm.
    await row.locator("summary", { hasText: "Lost or stolen phone" }).click();
    await row.getByRole("button", { name: "Issue a new link" }).click();
    await row.getByRole("button", { name: "Yes, issue a new link" }).click();

    // Staff see the status message. The slip now shows the new link.
    await expect(row.getByText(`New link issued for ${code}. The old link no longer works.`)).toBeVisible();
    const fresh = await readSlip(staff);
    expect(fresh.code).toBe(code);
    expect(fresh.link).not.toBe(link);

    // The first phone shows the dead-link screen, with the 911 line and no accessibility fault.
    await expect(oldPhone.getByRole("heading", { name: DEAD_LINK_HEADING })).toBeVisible();
    await expect(oldPhone.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(oldPhone)).toEqual([]);

    // The new link opens the same visit on the second phone: waiting, the 911 line, and no accessibility fault.
    await openSlipLink(newPhone, fresh.link);
    await expect(newPhone.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(newPhone.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(newPhone)).toEqual([]);
  } finally {
    await staff.context().close();
    await oldPhone.context().close();
    await newPhone.context().close();
  }
});
```

### e2e/timed-steps.spec.ts

```ts
// Timed steps: the "I'm still here" prompt, the 10, 20 and 30 minute steps after a recall, and a
// visit reopened after "unable to reach". Each page's own clock is moved on with page.clock. The
// database checks only the order of the steps, not the minutes, so the minutes come from these clocks.

import { expect, test, type Browser, type Page } from "@playwright/test";
import { axeFaults } from "./helpers/axe";
import { deskCheckIn, fillCheckIn, staffRow } from "./helpers/flows";
import { openPatient } from "./helpers/patient";
import { openStaff } from "./helpers/staff";

const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
const UNABLE_TEXT =
  "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.";
const STAFF_LIST = /Off-site: waiting or called back/;

/** Stops the page from asking the server for its time, then takes over its clock so it can be moved on. */
async function makeClockMovable(page: Page): Promise<void> {
  await page.route("**/api/time", (route) => route.abort());
  await page.clock.install();
}

/** Puts a page's clock back to the real time, then lets its 15-second refresh run once. */
async function backToRealTime(page: Page): Promise<void> {
  await page.clock.setSystemTime(new Date());
  await page.clock.runFor(16_000);
}

/** A patient phone whose clock can be moved on. */
async function openMovablePatient(browser: Browser): Promise<Page> {
  const patient = await openPatient(browser);
  await makeClockMovable(patient);
  return patient;
}

/**
 * A signed-in staff page whose clock can be moved on. The page loads /staff again after the clock
 * is set, so its 15-second timer starts on the moved clock (a timer started before cannot be moved).
 */
async function openMovableStaff(browser: Browser): Promise<Page> {
  const staff = await openStaff(browser);
  await makeClockMovable(staff);
  await staff.goto("/staff");
  await expect(staff.getByRole("heading", { name: STAFF_LIST })).toBeVisible({ timeout: 30_000 });
  return staff;
}

test("still here: the prompt shows at 30 minutes, a tap clears it, and a missed tap is flagged to staff", async ({ browser }) => {
  const staff = await openMovableStaff(browser);
  const patient = await openMovablePatient(browser);
  try {
    // Check the patient in at the desk, then the patient opens the link.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Move the patient's clock on 31 minutes: the "I'm still here" prompt is due.
    await patient.clock.fastForward("31:00");
    await expect(patient.getByText("Are you still following your visit?")).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Tap "I'm still here". The staff row then shows the time of the last tap.
    await patient.getByRole("button", { name: "I'm still here" }).click();
    await expect(row.getByTestId("progress")).toContainText(/last "I'm still here"/);

    // The patient's clock still says 31 minutes on, so the prompt is due again. Put the clock back to real time.
    await backToRealTime(patient);
    await expect(patient.getByTestId("still-here")).toBeHidden();
    await expect(patient.getByTestId("still-here-card")).toContainText("Thank you.");
    expect(await axeFaults(patient)).toEqual([]);

    // Staff: 40 minutes after the last tap with no new tap is "missed". Move the staff clock on 40 minutes.
    await staff.clock.fastForward("40:00");
    await expect(row.getByTestId("still-here-flag")).toContainText("Missed");
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});

test("recall with no answer: the 10, 20 and 30 minute steps, unable to reach, reopen, and triage again", async ({ browser }) => {
  const staff = await openMovableStaff(browser);
  const patient = await openMovablePatient(browser);
  try {
    // Check the patient in at the desk, then the patient opens the link.
    const { code, link } = await deskCheckIn(staff, "A");
    const row = staffRow(staff, code);
    await patient.goto(link);
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();

    // Recall the patient and confirm. The phone shows the called screen. The patient does not answer.
    await row.getByRole("button", { name: /^Recall patient/ }).click();
    await row.getByRole("button", { name: "Yes, recall patient" }).click();
    await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // 10 minutes: the patient's phone shows the second alert, and staff see "Phone the patient now".
    await patient.clock.fastForward("10:00");
    await staff.clock.fastForward("10:00");
    await expect(patient.getByTestId("call-reminder-second_alert")).toHaveText(
      "Please come back to the emergency department right now. Staff may phone you.",
    );
    await expect(row.getByTestId("flag-phone")).toContainText("Phone the patient now.");
    expect(await axeFaults(patient)).toEqual([]);

    // Record one phone call with no answer. The flag goes, because one call is now recorded.
    await row.getByRole("button", { name: "Phoned, no answer" }).click();
    await expect(row.getByTestId("flag-phone")).toBeHidden();

    // 20 minutes: the patient's phone shows "Please return now", and staff see "Phone the patient again".
    await patient.clock.fastForward("10:00");
    await staff.clock.fastForward("10:00");
    await expect(patient.getByTestId("call-reminder-return_now")).toHaveText(
      "We have not heard from you. Please return now. Staff will review your visit if you do not respond.",
    );
    await expect(row.getByTestId("flag-phone_again")).toContainText("Phone the patient again.");
    expect(await axeFaults(patient)).toEqual([]);

    // Record the second phone call with no answer. The flag goes.
    await row.getByRole("button", { name: "Phoned, no answer" }).click();
    await expect(row.getByTestId("flag-phone_again")).toBeHidden();

    // 30 minutes with no answered call: staff see "Review: unable to reach". A nurse must confirm it.
    await staff.clock.fastForward("10:00");
    await expect(row.getByTestId("flag-review")).toContainText("Review: unable to reach.");

    // Confirm unable to reach. The visit leaves the off-site line and shows under Recently closed.
    await row.locator("summary", { hasText: "Confirm unable to reach" }).click();
    await row.getByRole("button", { name: "Yes, unable to reach" }).click();
    await expect(row).toBeHidden();
    await expect(staff.getByTestId(`closed-${code}`)).toBeVisible();

    // The patient's phone shows the unable-to-reach screen, with the 911 line.
    await expect(patient.getByRole("heading", { name: "Your off-site wait has ended" })).toBeVisible();
    await expect(patient.getByText(UNABLE_TEXT)).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Put both clocks back to the real time before the visit is reopened and triaged again.
    await backToRealTime(patient);
    await backToRealTime(staff);

    // Reopen in Recently closed: the visit needs reassessment, and shows under "Back for reassessment".
    await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Reopen" }).click();
    await expect(staff.getByTestId(`reassess-${code}`)).toBeVisible();
    await expect(patient.getByRole("heading", { name: "Please go to the triage desk" })).toBeVisible();
    await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);

    // Triage again: the check-in form opens, and its heading names this visit.
    await staff.getByTestId(`reassess-${code}`).getByRole("button", { name: "Triage again" }).click();
    await expect(staff.getByRole("heading", { name: `Check in visit ${code} after triage` })).toBeVisible();

    // Finish the check-in with the three ticks. The visit is waiting again, on the staff list and the phone.
    await fillCheckIn(staff, { ticks: true });
    await staff.getByRole("button", { name: "Start off-site waiting", exact: true }).click();
    await expect(row).toBeVisible();
    await expect(row.getByTestId("progress")).toHaveText("Waiting off-site");
    await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible();
    expect(await axeFaults(patient)).toEqual([]);
  } finally {
    await staff.context().close();
    await patient.context().close();
  }
});
```

### e2e/languages.spec.ts

```ts
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
```

### e2e/dashboard.spec.ts

```ts
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
async function waitForNumbers(page: Page): Promise<void> {
  await expect(page.getByRole("region", { name: "Demo Site A" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Site B" })).toBeVisible();
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
    const siteA = dashboard.getByRole("region", { name: "Demo Site A" });
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
      const section = dashboard.getByRole("region", { name: `Demo Site ${site}` });
      await expect(rowValue(section, "Waiting off-site")).toHaveText(/^\d+$/);
    }

    expect(await axeFaults(dashboard)).toEqual([]);
  } finally {
    await staff.context().close();
  }
});
```

### lib/e2eCleanup.ts

```ts
// Makes the SQL lines that delete the visits the end-to-end tests made (npm run e2e:cleanup).
// The codes come from a text file, so only real display codes may reach the SQL.

import { CODE_ALPHABET } from "./codes";

/** The codes that are exactly 6 characters from CODE_ALPHABET, each once, in first order. */
export function cleanCodes(codes: string[]): string[] {
  const good: string[] = [];
  for (const code of codes) {
    if (code.length === 6 && [...code].every((c) => CODE_ALPHABET.includes(c)) && !good.includes(code)) {
      good.push(code);
    }
  }
  return good;
}

/** "('ABC234', 'XYZ789')", or null when no good code is left. */
function codeList(codes: string[]): string | null {
  const good = cleanCodes(codes);
  if (good.length === 0) return null;
  return `(${good.map((code) => `'${code}'`).join(", ")})`;
}

/** The delete line for the owner to run in the SQL Editor, or null when there is nothing to delete. */
export function cleanupSql(codes: string[]): string | null {
  const list = codeList(codes);
  return list === null ? null : `delete from public.visits where code in ${list};`;
}

/** The count line that must give 0 after the delete, or null when there is nothing to count. */
export function countSql(codes: string[]): string | null {
  const list = codeList(codes);
  return list === null ? null : `select count(*) from public.visits where code in ${list};`;
}
```

### lib/e2eCleanup.test.ts

```ts
import { describe, expect, it } from "vitest";
import { cleanCodes, cleanupSql, countSql } from "./e2eCleanup";

describe("cleanCodes", () => {
  it("keeps 6-character codes from the code alphabet", () => {
    expect(cleanCodes(["ABC234", "XYZ789"])).toEqual(["ABC234", "XYZ789"]);
  });

  it("removes repeats and keeps the first order", () => {
    expect(cleanCodes(["XYZ789", "ABC234", "XYZ789"])).toEqual(["XYZ789", "ABC234"]);
  });

  it("drops codes with the wrong length", () => {
    expect(cleanCodes(["ABC23", "ABC2345", ""])).toEqual([]);
  });

  it("drops characters that are not in the code alphabet", () => {
    // O, 0, I, 1 and L are left out of CODE_ALPHABET; lower case is not in it either.
    expect(cleanCodes(["ABCDE0", "ABCDEO", "ABCDE1", "ABCDEI", "ABCDEL", "abc234"])).toEqual([]);
  });

  it("drops anything that could change the SQL", () => {
    expect(cleanCodes(["AB'C23", "ABC 23", "ABC;23", " ABC234", "ABC234\n"])).toEqual([]);
  });
});

describe("cleanupSql", () => {
  it("makes one delete line for the good codes", () => {
    expect(cleanupSql(["ABC234", "bad", "XYZ789", "ABC234"])).toBe(
      "delete from public.visits where code in ('ABC234', 'XYZ789');",
    );
  });

  it("gives no line when no code is left", () => {
    expect(cleanupSql([])).toBeNull();
    expect(cleanupSql(["x'); drop table visits; --"])).toBeNull();
  });
});

describe("countSql", () => {
  it("makes the count line for the same codes", () => {
    expect(countSql(["ABC234", "XYZ789"])).toBe(
      "select count(*) from public.visits where code in ('ABC234', 'XYZ789');",
    );
  });

  it("gives no line when no code is left", () => {
    expect(countSql(["", "nope"])).toBeNull();
  });
});
```

### scripts/e2e-cleanup.mjs

```js
// Prints the SQL lines that delete the visits the end-to-end tests made. The owner runs them in the SQL Editor.
// Run with: npm run e2e:cleanup

import { existsSync, readFileSync } from "node:fs";
import { cleanupSql, countSql } from "../lib/e2eCleanup.ts";

const FILE = "test-results/e2e-codes.txt";

const codes = existsSync(FILE) ? readFileSync(FILE, "utf8").split(/\r?\n/) : [];
const deleteLine = cleanupSql(codes);

if (deleteLine === null) {
  console.log("No test visits to delete.");
} else {
  console.log("1. Run this in the Supabase SQL Editor:\n");
  console.log(deleteLine);
  console.log("\n2. Then run this. It must give 0:\n");
  console.log(countSql(codes));
  console.log(`\n3. After the count is 0, delete ${FILE}.`);
}
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-20. Pasted by the owner, verbatim.

### 1. Gaps in `visit-lifecycle.html` and screen coverage

* **`pre_arrival` expiry (`expired`) and `"Not eligible"` check-in have no test**
* **File and line:** `e2e/home-start.spec.ts`, lines 26–31.
* **What can go wrong:** A patient who starts a visit from home (`pre_arrival`) and never arrives within 6 hours transitions to `expired` ("Your visit request has expired" on `/` and "This visit request has expired" on `/patient`), and staff checking in an expected arrival can reject them with `"Not eligible"`. Neither path is tested, so a broken `expired` screen or a bug where `"Not eligible"` fails on a `pre_arrival` row goes undetected.
* **Smallest fix:** Add a second test in `e2e/home-start.spec.ts` that checks in a `pre_arrival` visit as `"Not eligible"` (verifying it leaves `Expected arrivals` and does not enter `Waiting off-site`), and add an expiry case in `e2e/timed-steps.spec.ts` advancing `patient.clock` past 6 hours on a `pre_arrival` visit.

* **Direct arrival (`waiting -> arrived` and `called -> arrived`) and `"Recall all"` are never tested**
* **File and line:** `e2e/recall-arrive.spec.ts`, lines 11–44.
* **What can go wrong:** `recall-arrive.spec.ts` only tests the sequential chain `waiting -> called -> on_the_way -> arrived`. If a patient walks back to the desk before being recalled (`waiting -> arrived`) or without tapping `"I'm on my way"` (`called -> arrived`), or if staff use `"Call all off-site patients back"` (`RecallAllPanel`), any broken database transition or UI handler on those paths passes unnoticed.
* **Smallest fix:** Add a test in `e2e/recall-arrive.spec.ts` where staff click `"Mark arrived"` directly on a `waiting` row and verify `patient` transitions straight to `"Status: Ready at the desk"`.

* **Reassessment ending in `"Not eligible"` (and `Reopen` on a `removed` visit) are never tested**
* **File and line:** `e2e/timed-steps.spec.ts`, lines 154–162; `e2e/remove-undo.spec.ts`, lines 28–31.
* **What can go wrong:** When a closed visit is reopened to `needs_reassessment` and staff click `"Triage again"`, `timed-steps.spec.ts` only tests returning the patient to `"Start off-site waiting"`. If a nurse decides during reassessment that the patient is `"Not eligible"` (for example, vitals worsened), that exit from `needs_reassessment` is untested. Likewise, `Reopen` is tested only on `unable_to_reach`, never on a visit removed as `Left` or `No-show`.
* **Smallest fix:** In `e2e/remove-undo.spec.ts`, add a check clicking `"Reopen"` on a removed visit and completing `"Triage again"` with `"Not eligible"`, verifying the visit leaves `"Back for reassessment"` and the patient sees the ended screen.

* **Patient offline banner, sound switch, text-size switch, and `/` saved-visit cards have zero e2e coverage**
* **File and line:** `e2e/home-start.spec.ts`, lines 34–40; `e2e/recall-arrive.spec.ts`, lines 23–27.
* **What can go wrong:** Four core patient-screen features—going offline (`OfflineBanner`), enabling audio alerts (`SoundSwitch`), enlarging text to `Extra large` (`TextSizeSwitch` + `axeFaults` reflow/contrast), and returning to `/` while an open or ended visit is saved in `localStorage`—have no browser test. A runtime error in `useOnline` or `TextSizeSwitch` would ship with `npm run e2e` green.
* **Smallest fix:** Add a `patient-controls.spec.ts` (or steps in `recall-arrive.spec.ts`) that toggles `TextSizeSwitch` to `"Extra large"` and runs `axeFaults`, clicks `"Turn on sound"` and asserts `"Sound is on"`, toggles `patient.context().setOffline(true)` to assert the offline banner appears and clears on reconnect, and opens `/` to verify `"You have an open visit on this phone"`.

* **Urdu (`ur`), Mandarin (`zh`), and patient-side language switching are never tested**
* **File and line:** `e2e/languages.spec.ts`, lines 17–20.
* **What can go wrong:** `CASES` tests only `fr` and `ar` set by staff at check-in. Urdu (`ur`, the second RTL language) and Mandarin (`zh`) are never rendered in a real browser, and changing the language via `"Select language"` on `/` or `/patient` (where `localStorage` overrides or interacts with the visit language) is never tested.
* **Smallest fix:** Add `ur` (`dir: "rtl"`) and `zh` (`dir: "ltr"`) to `CASES` in `e2e/languages.spec.ts`, and assert that changing `"Select language"` on `/patient` updates `main[lang]` and `main[dir]`.

### 2. Weak checks that can pass while the app is wrong

* **Queue position and wait-time range are never checked for actual numbers**
* **File and line:** `e2e/home-start.spec.ts`, lines 36–37; `e2e/desk-checkin.spec.ts`, line 19.
* **What can go wrong:** Asserting only `getByText("Your place in line:")` and `getByText("Estimated time until you're called back:")` passes even if the RPC returns `null` or `NaN` and the screen renders `"Your place in line: "` or `"undefined to undefined minutes"`.
* **Smallest fix:** Assert `/Your place in line:\s*[1-9]\d*/` and `/\d+\s+to\s+\d+\s+minutes/` on `patient.locator("main")`.

* **`"not eligible: no slip"` never checks that the visit stayed out of both waiting lists**
* **File and line:** `e2e/desk-checkin.spec.ts`, lines 42–50.
* **What can go wrong:** The test checks only `expect(staff.locator("#slip-heading")).toHaveCount(0)`. If a bug recorded `"Not eligible"` visits in `Waiting on-site: offered, declined` (`onsite-${code}`) or in the off-site queue (`row-${code}`), the test would still pass.
* **Smallest fix:** Capture `const code = await codeFromMessage(staff, "not eligible");` on line 48 and assert `await expect(staffRow(staff, code)).toHaveCount(0)` and `await expect(staff.getByTestId(\`onsite-${code}`)).toHaveCount(0)`.

* **`"Undo switch"` and `"Undo"` after arrival never check the patient's phone**
* **File and line:** `e2e/declined-switch.spec.ts`, lines 40–43; `e2e/recall-arrive.spec.ts`, lines 41–43.
* **What can go wrong:** Both tests keep `patient` open right beside `staff`, yet after clicking `"Undo switch"` or `"Undo"`, they check only the staff list. If `"Undo switch"` left the patient's phone stuck on `"Status: Waiting"` instead of switching to `"Status: Waiting in the emergency department"`, or if `"Undo"` after arrival left the patient on `"Status: Ready at the desk"`, both tests would still pass.
* **Smallest fix:** Assert `await expect(patient.getByRole("heading", { name: "Status: Waiting in the emergency department" })).toBeVisible()` at line 43 of `e2e/declined-switch.spec.ts`, and `await expect(patient.getByRole("heading", { name: "Status: Waiting" })).toBeVisible()` at line 43 of `e2e/recall-arrive.spec.ts`.

* **Dashboard `"Demo"` toggle passes even if real visits (or all zeros) are shown**
* **File and line:** `e2e/dashboard.spec.ts`, lines 53–57.
* **What can go wrong:** Checking `toHaveText(/^\d+$/)` on `"Waiting off-site"` passes if `"Demo"` renders `"0"` for every metric or fails to switch away from real visits.
* **Smallest fix:** Assert that seeded demo metrics are non-zero when `"Demo"` is active (for example, `expect(await rowNumber(section, "Triaged")).toBeGreaterThan(0)` for both sites).

* **`new-link.spec.ts` never checks that the revoked token is cleared on reload or `/**`
* **File and line:** `e2e/new-link.spec.ts`, lines 31–35.
* **What can go wrong:** `oldPhone` only checks the live-poll transition to `DEAD_LINK_HEADING`. If `oldPhone` leaves the dead token in `localStorage`, reloading `/patient` or opening `/` later shows a broken `"We cannot open the saved visit on this phone"` / `"No visit found"` state instead of a clean start screen.
* **Smallest fix:** After line 34, navigate `oldPhone` to `/` (`await oldPhone.goto("/")`) and assert `await expect(oldPhone.getByRole("button", { name: "Start a visit" })).toBeVisible()`.

* **`pause.spec.ts` never submits `"Waits on-site"` while Site B is paused**
* **File and line:** `e2e/pause.spec.ts`, lines 46–48.
* **What can go wrong:** The test checks that the `"Waits on-site"` button is visible, but never clicks it. If submitting `"Waits on-site"` while paused fails validation or opens a slip, the test passes anyway.
* **Smallest fix:** Click `staff.getByRole("button", { name: "Waits on-site" })`, record the visit code with `codeFromMessage` so cleanup deletes it, and assert `await expect(staff.locator("#slip-heading")).toHaveCount(0)`.

* **`languages.spec.ts` never checks the draft-translation notice or staff row language label**
* **File and line:** `e2e/languages.spec.ts`, lines 25–39.
* **What can go wrong:** Non-English patient screens must display `text.language.draftNotice` ("This translation is a draft..."), and staff rows must show the patient's selected language so nurses know an interpreter is needed before phoning. Neither is checked.
* **Smallest fix:** Assert `await expect(patient.getByText(text.language.draftNotice)).toBeVisible()` on `/patient` and check the language badge on `staffRow(staff, visitCode)`.

### 3. Unstable tests (timing, `page.clock`, shared state, test order)

* **`timed-steps.spec.ts` subtracts wall-clock setup time from `page.clock.fastForward`, making the 10- and 40-minute checks flaky**
* **File and line:** `e2e/timed-steps.spec.ts`, lines 60–71 and lines 98–107.
* **What can go wrong:** `page.clock.install()` freezes the page's clock at the moment `openMovableStaff` runs ($t_0$). Meanwhile, `deskCheckIn`, `patient.goto`, `axeFaults`, and clicking `"I'm still here"` or `"Yes, recall patient"` take 3–8 real seconds before Postgres writes `last_still_here_at = now()` or `called_at = now()` ($t_0 + 6\text{s}$). When the test then calls `staff.clock.fastForward("40:00")` (line 70) or `staff.clock.fastForward("10:00")` (line 104), `staff`'s clock lands at $t_0 + 40\text{m}$ or $t_0 + 10\text{m}$, so elapsed time since the database timestamp is only `39m 54s` or `9m 54s`—short of the 40- and 10-minute thresholds whenever setup takes more than 0 seconds.
* **Smallest fix:** Sync `staff`'s clock to `new Date()` right before fast-forwarding from a newly written database timestamp (e.g., `await staff.clock.setSystemTime(new Date()); await staff.clock.fastForward("40:00");` at line 70, and the same before line 104).

* **`page.clock.install()` freezes background 15-second polling on `patient`, causing line 140 to flake if Realtime is delayed**
* **File and line:** `e2e/timed-steps.spec.ts`, lines 17–20 and lines 130–140.
* **What can go wrong:** `page.clock.install()` pauses all `setInterval`/`setTimeout` timers on `patient` unless `fastForward` or `runFor` is called. At line 136, staff confirm `"Yes, unable to reach"`, and line 140 expects `patient` to show `"Your off-site wait has ended"` within 5 seconds. Because `patient`'s 15-second fallback polling timer is frozen, any dropped or slow Supabase Realtime packet hangs `patient` forever and fails the test.
* **Smallest fix:** In `makeClockMovable` (line 19), call `await page.clock.resume()` right after `await page.clock.install()` (or call `await patient.clock.runFor(16_000)` after line 136) so timers keep ticking naturally between `fastForward` jumps.

* **Global 5-second `expect` timeout is shorter than the app's 15-second fallback poll**
* **File and line:** `playwright.config.ts`, line 14 (`expect: { timeout: 5_000 }`); `e2e/home-start.spec.ts`, line 34; `e2e/recall-arrive.spec.ts`, lines 25, 31, 36; `e2e/remove-undo.spec.ts`, lines 22, 29; `e2e/new-link.spec.ts`, line 32.
* **What can go wrong:** Both `/patient` and `/staff` fall back to a 15-second poll whenever Supabase Realtime `change_signal` takes longer than a couple of seconds (for example during a cold Next.js dev compile or transient WebSocket hiccup). A 5-second `expect` timeout fails before the first 15-second poll can fire.
* **Smallest fix:** Increase `expect: { timeout: 20_000 }` in `playwright.config.ts` line 14 (it adds zero wait time when Realtime delivers updates immediately, while covering one full 15-second poll cycle on slow runs).

* **`pause.spec.ts` fails immediately if a previous aborted run left Site B paused**
* **File and line:** `e2e/pause.spec.ts`, lines 33–36.
* **What can go wrong:** If a prior test run was interrupted (`Ctrl+C` or killed process) before `finally` executed, Site B remains paused in the shared `site_settings` table. On the next run, line 34 (`await pauseButton(staff).click()`) times out because `"Turn off-site waiting back on…"` is shown instead.
* **Smallest fix:** Call `await turnSiteBOnIfPaused(staff);` at the start of `try` (line 33) as well as inside `finally`.

### 4. Clean-up (`rememberCode` and `e2e-cleanup.mjs`)

* **Storing `e2e-codes.txt` inside Playwright's `test-results/` directory wipes un-cleaned codes on a second run**
* **File and line:** `e2e/helpers/visitCodes.ts`, line 5 (`export const CODES_FILE = "test-results/e2e-codes.txt";`); `scripts/e2e-cleanup.mjs`, line 7.
* **What can go wrong:** Playwright automatically deletes and recreates `test-results/` (its default `outputDir`) at the start of every `npx playwright test` run. If the owner runs `npm run e2e` and then re-runs `npm run e2e` (or runs a single spec file) before running `npm run e2e:cleanup`, Playwright deletes `test-results/e2e-codes.txt`, permanently orphaning all 28 test visits from the first run in Supabase.
* **Smallest fix:** Move `CODES_FILE` outside `test-results/` (for example `".e2e-codes.txt"`, added to `.gitignore`) and import `CODES_FILE` in `scripts/e2e-cleanup.mjs` so multiple test runs append safely until `npm run e2e:cleanup` is run.

* **`readSlip` records the code after reading `href`, losing the code if `href` fails**
* **File and line:** `e2e/helpers/flows.ts`, lines 51–53.
* **What can go wrong:** `code` is read from the DOM on line 51 (after the database has already created the visit), but `rememberCode(code)` is not called until line 53 after `getAttribute("href")`. If `getAttribute("href")` fails or times out, the visit exists in Supabase without its code in `CODES_FILE`.
* **Smallest fix:** Call `if (code) rememberCode(code);` immediately after line 51 before reading `link`.

### 5. Safety

* **`trace: "retain-on-failure"` writes plaintext `E2E_STAFF_EMAIL` and `E2E_STAFF_PASSWORD` into `trace.zip**`
* **File and line:** `playwright.config.ts`, lines 6 and 21; `e2e/helpers/staff.ts`, lines 20–21.
* **What can go wrong:** Although `playwright.config.ts` line 6 notes *"The values are never printed"*, `trace: "retain-on-failure"` (line 21) records every `fill()` input value, DOM snapshot, and auth request body into `test-results/.../trace.zip` whenever any test using `openStaff` fails. Sharing or archiving a failure trace exposes the test staff password and session token in plain text.
* **Smallest fix:** Authenticate once in a setup project with `use: { trace: "off" }` that saves `storageState` to a git-ignored file (e.g., `.auth/staff.json`), and load that `storageState` in `openStaff` (`browser.newContext({ storageState: ".auth/staff.json" })`) so login credentials never enter a traced context (and tests skip 15+ redundant UI logins).

### 6. Readability for a beginner

* **`e2e/helpers/flows.ts` combines four unrelated jobs while `patient.ts` is nearly empty**
* **File and line:** `e2e/helpers/flows.ts`, lines 1–79; `e2e/helpers/patient.ts`, lines 1–19.
* **What can go wrong:** `flows.ts` mixes patient-screen actions (`startFromHome`, `patientCode`), staff check-in actions (`chooseSite`, `fillCheckIn`, `deskCheckIn`), DOM message parsers (`readSlip`, `codeFromMessage`), and queue locators (`staffRow`), making a beginner hunt across `patient.ts`, `staff.ts`, and `flows.ts` to find a helper.
* **Smallest fix:** Move `startFromHome` and `patientCode` into `e2e/helpers/patient.ts` and the staff helpers into `e2e/helpers/staff.ts`, removing `flows.ts` (or keeping `flows.ts` strictly for multi-screen flows).

* **`readSlip` hides a file-write side effect inside a `read*` function**
* **File and line:** `e2e/helpers/flows.ts`, lines 48–55; `e2e/new-link.spec.ts`, line 28.
* **What can go wrong:** A function named `readSlip` sounds read-only, yet it appends to `CODES_FILE` every time it is called (including in `new-link.spec.ts` line 28 when re-reading the slip after issuing a new link for an existing visit).
* **Smallest fix:** Have `readSlip` only read `{ code, link }`, and call `rememberCode(slip.code)` explicitly in `deskCheckIn` and `declined-switch.spec.ts` where a visit is created or switched.

* **Misleading comments and shadowed variable name (`code`)**
* **File and line:** `e2e/helpers/patient.ts`, line 6 (`{ storageState: undefined }`); `e2e/timed-steps.spec.ts`, lines 63–64; `e2e/languages.spec.ts`, line 15 (`code: string`).
* **What can go wrong:** `{ storageState: undefined }` in `patient.ts` is a no-op (`browser.newContext()` is already empty) that suggests `undefined` is required to clear state; the comment on `timed-steps.spec.ts` line 63 wrongly says the `"I'm still here"` prompt is "due again" right after tapping it; and `code` in `languages.spec.ts` means language code (`"fr"`) whereas `code` in every other test means the 6-character visit code.
* **Smallest fix:** Use `browser.newContext()` with no options in `patient.ts` line 6, update the comment on `timed-steps.spec.ts` line 63 to explain that `backToRealTime` aligns `patient`'s clock with `staff` before the 40-minute missed check, and rename `code` to `lang` in `e2e/languages.spec.ts` line 15.

## Check of the response (Claude, 2026-11-20)

Accepted (the code shows the fault):
- 4a `CODES_FILE` in `test-results/`: Playwright empties its `outputDir` (default `test-results/`) at the start of each run. A second `npm run e2e` before `npm run e2e:cleanup` loses the codes of the first run. Real risk.
- 4b `readSlip`: `rememberCode` comes after `getAttribute("href")` (flows.ts line 52 to 53). Small, real.
- 3d `pause.spec.ts`: a run stopped before `finally` leaves site B paused, and the next run fails at `pauseButton(staff).click()`. Call `turnSiteBOnIfPaused` first.
- 5 trace: a trace records each `fill()` value, so a failed staff test writes the test password into `trace.zip` under `test-results/`. Git ignores that folder, so the risk is only when a trace is shared.
- 2 weak checks: all 7 are real gaps in the checks. `text.language.draftNotice` exists (lib/text/en.ts line 175, shown by components/LanguageSwitch.tsx line 41).
- 6 readability: `{ storageState: undefined }` is a no-op; rename `code` to `lang` in languages.spec.ts; split flows.ts.
- 1 gaps: all 5 are real gaps in coverage. They are new tests, not fixes.

Rejected:
- 3a fastForward lag and 3b frozen patient poll: `page.clock.install()` with no `pauseAt` lets time flow at real speed, and timers still fire. So the staff clock is at real time when `fastForward` starts, and the 10 and 40 minute checks land after the database time. The tests passed on every run in this session.
- 3c `expect` timeout 5 s to 20 s: SPEC.md line 135 says the two screens update each other "within about 2 seconds". A 20 s timeout would let a broken realtime link pass on the 15 s poll. Keep 5 s.
- 6 the comment at timed-steps.spec.ts line 63 is correct: after the tap, the patient clock is still 31 minutes ahead of the tap time, so the prompt is due again until `backToRealTime`.
