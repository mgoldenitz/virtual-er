import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Browser test helpers and logs from the Playwright tool; git ignores this folder too.
    ".playwright-mcp/**",
    // Other copies of the repo for other sessions; git does not save this folder.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
