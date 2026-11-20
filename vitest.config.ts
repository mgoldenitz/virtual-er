import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // e2e/ holds the Playwright browser tests (npm run e2e); Vitest must not run them.
  test: { exclude: [...configDefaults.exclude, "e2e/**"] },
});
