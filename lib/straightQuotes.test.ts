// Checks that code and English screen text use straight quotes only (CLAUDE.md rule):
// no curly quote marks and no HTML names for them (the "ldquo" family).

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The folders that hold the app's code and screen text.
const FOLDERS = ["app", "components", "data", "lib"];

// Chinese uses its own quote marks (for example in the "turn on sound" line), so it keeps them.
const SKIP = ["lib/text/zh.ts"];

// The four curly quote marks, made from their number codes so this file does not match itself.
const CURLY_MARKS = String.fromCharCode(0x2018, 0x2019, 0x201c, 0x201d);
const CURLY = new RegExp(`[${CURLY_MARKS}]|&[lr][sd]quo;`);

// The same four marks written as codes: JS escapes, CSS escapes and HTML numbers.
// Each pattern has a "[" or "(" after its first digits, so this line does not match itself.
const CODED = /\\u\{?201[89cd]\}?|\\201[89cd]|&#(8216|8217|8220|8221|x201[89cd]);/i;

/** Every code, style and text file in the folders above, as a path with forward slashes. */
function codeFiles(): string[] {
  return FOLDERS.flatMap((folder) =>
    readdirSync(folder, { recursive: true, encoding: "utf8" })
      .map((name) => `${folder}/${name.replaceAll("\\", "/")}`)
      .filter((path) => /\.(tsx?|jsx?|mjs|css|json|md)$/.test(path) && !SKIP.includes(path)),
  );
}

describe("straight quotes", () => {
  it("no code file has a curly quote", () => {
    const found = codeFiles().flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, i) => (CURLY.test(line) || CODED.test(line) ?[`${path}:${i + 1}`] : [])),
    );
    expect(found).toEqual([]);
  });
});
