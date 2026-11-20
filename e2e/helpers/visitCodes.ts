// Writes down each visit code a test makes, so npm run e2e:cleanup can delete those visits after the run.

import { appendFileSync, mkdirSync } from "node:fs";

export const CODES_FILE = "test-results/e2e-codes.txt"; // git ignores test-results/.

/** Adds one code on its own line. The cleanup script checks each code before it reaches SQL. */
export function rememberCode(code: string): void {
  mkdirSync("test-results", { recursive: true });
  appendFileSync(CODES_FILE, `${code}\n`);
}
