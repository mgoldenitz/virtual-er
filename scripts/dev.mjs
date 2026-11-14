// Starts the app for testing on this computer (npm run dev). It first tells Node to trust the
// same certificates as Windows and the browser, so an antivirus that checks secure web traffic
// (Norton on the owner's computer) does not stop the app's server from reaching the database.
// Next.js passes NODE_OPTIONS on to the server it starts, which is why it is set here.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const SETTING = "--use-system-ca";
const current = process.env.NODE_OPTIONS ?? "";
// Node before 22.15 does not know the setting and would refuse to start, so there it is left out.
const add = process.allowedNodeEnvironmentFlags.has(SETTING) && !current.includes(SETTING);
const nodeOptions = [current, add ? SETTING : ""].filter(Boolean).join(" ");

// Start Next.js's own start file with this same Node, with no shell in between, so words
// typed after "npm run dev --" reach it exactly as typed.
const nextStart = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextStart, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

// Stop requests: wait for Next.js to shut down before this file ends. In a Windows terminal,
// Ctrl+C already reaches Next.js directly; elsewhere (for example an editor's stop button on
// macOS or Linux) the request is passed on.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (process.platform !== "win32") child.kill(signal);
  });
}
// Ends with Next.js's exit code; 1 if it was stopped by a signal instead.
child.on("exit", (code) => process.exit(code ?? 1));
