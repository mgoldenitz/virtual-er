// Writes down each visit code a test makes, so npm run e2e:cleanup can delete those visits after the run.

import { appendFileSync } from "node:fs";

// Not in test-results/: Playwright empties that folder at the start of each run.
export const CODES_FILE = ".e2e-codes.txt";

/** Adds one code on its own line. The cleanup script checks each code before it reaches SQL. */
export function rememberCode(code: string): void {
  appendFileSync(CODES_FILE, `${code}\n`);
}
