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
