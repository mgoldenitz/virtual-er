// Prints the SQL lines that delete the visits the end-to-end tests made. The owner runs them in the SQL Editor.
// Run with: npm run e2e:cleanup

import { existsSync, readFileSync } from "node:fs";
import { cleanupSql, countSql } from "../lib/e2eCleanup.ts";
import { CODES_FILE } from "../e2e/helpers/visitCodes.ts";

const codes = existsSync(CODES_FILE) ? readFileSync(CODES_FILE, "utf8").split(/\r?\n/) : [];
const deleteLine = cleanupSql(codes);

if (deleteLine === null) {
  console.log("No test visits to delete.");
} else {
  console.log("1. Run this in the Supabase SQL Editor:\n");
  console.log(deleteLine);
  console.log("\n2. Then run this. It must give 0:\n");
  console.log(countSql(codes));
  console.log(`\n3. After the count is 0, delete ${CODES_FILE}.`);
}
