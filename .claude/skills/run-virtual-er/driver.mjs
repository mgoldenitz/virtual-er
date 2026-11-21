// Drives the running app in a headless Chromium (Playwright) and saves screenshots.
// For agents: start the dev server first (see SKILL.md), then run one command per call:
//
//   node .claude/skills/run-virtual-er/driver.mjs shot login        (a path with no leading /; add --phone for a 390x844 phone)
//   node .claude/skills/run-virtual-er/driver.mjs start-visit A     (start page -> "Start a visit" -> patient screen)
//   node .claude/skills/run-virtual-er/driver.mjs staff             (staff list, needs .auth/staff.json from npm run e2e)
//
// Screenshots go to screenshots/run/. The page's text is printed, so you can check it without the image.
// RUN_URL changes the address (default http://localhost:3200).

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.RUN_URL ?? "http://localhost:3200";
const OUT = "screenshots/run";
const STAFF_STATE = ".auth/staff.json"; // saved by e2e/auth.setup.ts during npm run e2e
const CODES_FILE = ".e2e-codes.txt"; // npm run e2e:cleanup deletes the visits listed here

const args = process.argv.slice(2);
const phone = args.includes("--phone");
const [command, arg] = args.filter((a) => a !== "--phone");

/** A file name from a path, for example "/patient#t=..." -> "patient". */
function nameFor(path) {
  const clean = path.replace(/[#?].*$/, "").replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
  return clean || "home";
}

/** Saves a full-page screenshot and prints where it is and the visible text of <main>. */
async function report(page, name) {
  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/${name}${phone ? "-phone" : ""}.png`;
  // A long staff list (old test visits) can make the page over 60000 px tall: then only the visible screen.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: file, fullPage: height <= 4000 });
  const main = page.locator("main").first();
  const text = (await main.count()) ? await main.innerText() : await page.locator("body").innerText();
  console.log(`url: ${page.url()}`);
  console.log(`screenshot: ${file}`);
  console.log("--- text ---");
  console.log(text.trim());
}

async function run() {
  const browser = await chromium.launch();
  const contextOptions = phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {};
  try {
    if (command === "shot") {
      // Paths are given without the leading "/" (Git Bash turns "/" into "C:/Program Files/Git/").
      if (arg && /^[A-Za-z]:[\\/]/.test(arg)) throw new Error(`Git Bash changed the path to ${arg}: give it without the leading "/" (for example: shot patient).`);
      const path = `/${(arg ?? "").replace(/^\/+/, "")}`;
      const page = await (await browser.newContext({ ...contextOptions, baseURL: BASE })).newPage();
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await report(page, nameFor(path));
    } else if (command === "start-visit") {
      const site = arg ?? "A";
      const page = await (await browser.newContext({ ...contextOptions, baseURL: BASE })).newPage();
      await page.goto("/");
      await page.getByRole("radio", { name: `Demo Site ${site}` }).check();
      await page.getByRole("button", { name: "Start a visit" }).click();
      await page.waitForURL(/\/patient/, { timeout: 15_000 });
      const code = page.locator("main strong.font-mono").first();
      await code.waitFor({ timeout: 15_000 });
      const value = ((await code.textContent()) ?? "").trim();
      // Written down so npm run e2e:cleanup removes this test visit from the database later.
      if (/^[A-Z0-9]{6}$/.test(value)) appendFileSync(CODES_FILE, `${value}\n`);
      console.log(`visit code: ${value} (added to ${CODES_FILE})`);
      await report(page, "patient-started");
    } else if (command === "staff") {
      if (!existsSync(STAFF_STATE)) throw new Error(`${STAFF_STATE} is missing: run npm run e2e once to sign in the test staff account.`);
      const context = await browser.newContext({ ...contextOptions, baseURL: BASE, storageState: STAFF_STATE });
      const page = await context.newPage();
      await page.goto("/staff");
      await page.waitForLoadState("networkidle");
      if (new URL(page.url()).pathname !== "/staff") console.log("note: the saved session is old, the page went to sign-in.");
      await report(page, "staff");
    } else {
      console.log("Commands: shot <path> | start-visit A|B | staff   (add --phone for a phone size)");
      process.exitCode = 2;
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
