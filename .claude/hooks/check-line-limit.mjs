// Runs after Claude edits or writes a file: warns Claude when a code file is over the
// 300-line limit in CLAUDE.md, so it splits the file. It never changes or blocks anything.

import { existsSync, readFileSync } from "node:fs";

const LIMIT = 300;
const CODE_FILE = /\.(ts|tsx|js|mjs|cjs|css|sql)$/;

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let path;
  try {
    const event = JSON.parse(input.replace(/^﻿/, "")); // PowerShell can add an invisible mark at the start
    path = event.tool_input?.file_path ?? event.tool_response?.filePath;
  } catch {
    process.exit(0); // Not the input we expect: say nothing.
  }
  if (!path || !CODE_FILE.test(path) || path.includes("node_modules") || !existsSync(path)) process.exit(0);

  const lines = readFileSync(path, "utf8").replace(/\n$/, "").split("\n").length; // the last newline ends a line, it does not start one
  if (lines <= LIMIT) process.exit(0);

  // Exit code 2 sends this message back to Claude after the edit.
  process.stderr.write(`${path} has ${lines} lines. CLAUDE.md allows ${LIMIT}. Split it into smaller files (one job per file).\n`);
  process.exit(2);
});
