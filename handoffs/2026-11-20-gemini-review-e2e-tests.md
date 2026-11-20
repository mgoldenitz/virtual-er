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
