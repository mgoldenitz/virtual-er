// Checks every translation against the English text: the same {fill-in} words, 911 and 811
// kept wherever English has them, the same number of paragraphs, and no empty sentence.
// The type check already makes sure every language has exactly the same sentences.

import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { fr } from "./fr";
import { ur } from "./ur";
import { zh } from "./zh";

const LANGUAGES = { fr, ur, ar, zh };

/** Every sentence with its path, for example "patient.waitRange". */
function sentences(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => sentences(item, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    sentences(item, path ? `${path}.${key}` : key),
  );
}

const fillIns = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(" ");

describe.each(Object.entries(LANGUAGES))("%s", (_name, text) => {
  const english = new Map(sentences(en));
  const translated = sentences(text);

  it("has every sentence, none empty", () => {
    expect(translated.map(([path]) => path)).toEqual([...english.keys()]);
    for (const [path, s] of translated) expect(s.trim(), path).not.toBe("");
  });

  it("keeps the same {fill-in} words", () => {
    for (const [path, s] of translated) expect(fillIns(s), path).toBe(fillIns(english.get(path)!));
  });

  it("keeps 911 and 811 wherever English has them", () => {
    for (const [path, s] of translated) {
      const source = english.get(path)!;
      if (source.includes("911")) expect(s, path).toContain("911");
      if (source.includes("811")) expect(s, path).toContain("811");
    }
  });

  it("has the three paragraphs for a visit from home", () => {
    expect(text.patient.fromHomeText).toHaveLength(3);
  });
});

// The "Sound is off" line tells the patient which button to tap, so it must use the button's exact words.
describe.each(Object.entries({ en, ...LANGUAGES }))("%s sound lines", (_name, text) => {
  it("names the Turn on sound button exactly", () => {
    expect(text.sound.offWhileCalled).toContain(text.sound.turnOn);
  });
});
