// Test settings: lets tests use the same "@/..." import shortcut as the app (see tsconfig.json).

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
