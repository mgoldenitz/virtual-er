# Handoff: review the local dev start script

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js 16.4 (App Router) and Supabase prototype, run on a Windows 11 laptop with Node 26 for local testing. Norton Antivirus re-signs HTTPS traffic with its own root certificate, installed in the Windows certificate store. The browser trusted it, but Node in the owner's terminal did not, so every server-side Supabase call failed with "fetch failed" (cause UNABLE_TO_VERIFY_LEAF_SIGNATURE). Staff sign-in then looped back to /login, because proxy.ts could not check the sign-in.

Fix: `npm run dev` now runs `scripts/dev.mjs`, which starts `next dev` with `--use-system-ca` added to NODE_OPTIONS. (`next dev` forks its server process and passes NODE_OPTIONS on to it, while a flag given to the parent node process would not reach it.) `npm run build` and Vercel are unchanged.

Checked: lint passes; with plain `npm run dev`, /api/site-status reads the database again and the owner reached /staff after signing in.

## Find problems (do not just confirm)

1. Does trusting the system certificate store for local development weaken security in a way that matters for this project?
2. Can the script break on another computer (macOS, Linux, a path with spaces, an existing NODE_OPTIONS, Ctrl+C leaving a server running)?
3. Is there a simpler way that needs no new file and no new dependency?

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change

```diff
diff --git a/package.json b/package.json
index 8788a61..d5a2c2b 100644
--- a/package.json
+++ b/package.json
@@ -3,7 +3,7 @@
   "version": "0.1.0",
   "private": true,
   "scripts": {
-    "dev": "next dev",
+    "dev": "node scripts/dev.mjs",
     "build": "next build",
     "start": "next start",
     "lint": "eslint",

+++ scripts/dev.mjs (new file)
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
```
