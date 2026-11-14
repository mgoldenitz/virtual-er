// Starts the app for testing on this computer (npm run dev). It first tells Node to trust the
// same certificates as Windows and the browser, so an antivirus that checks secure web traffic
// (Norton on the owner's computer) does not stop the app's server from reaching the database.
// Next.js passes NODE_OPTIONS on to the server it starts, which is why it is set here.

import { spawn } from "node:child_process";

const nodeOptions = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
// One command line ("next dev" plus anything typed after npm run dev --), run by the shell.
const command = ["next", "dev", ...process.argv.slice(2)].join(" ");
const child = spawn(command, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});
child.on("exit", (code) => process.exit(code ?? 0));
