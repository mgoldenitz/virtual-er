// Checks the "Turn on sound" box: the words in the chosen language, the button, no extra
// live region, and that "Sound is on" is not shown before the patient taps the button.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import { SoundSwitch } from "./SoundSwitch";

// Replace the real sound player, so the tests never touch the browser's audio.
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn() }));

describe("SoundSwitch", () => {
  it("shows the English notice and a Turn on sound button", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
    expect(html).toContain(textFor("en").sound.notice);
    expect(html).toMatch(/<button[^>]*>Turn on sound<\/button>/);
  });

  it("shows the French notice and button words in French", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="fr" />);
    expect(html).toContain(textFor("fr").sound.notice);
    expect(html).toContain(textFor("fr").sound.turnOn);
  });

  // "Sound is on" gets focus after the tap (a screen reader reads it then), so the box has no live
  // region of its own: one would read the words twice, next to the page's other announcements.
  it("has no live region of its own", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="en" />);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("aria-live");
  });

  it("does not show Sound is on before the patient taps the button", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
    expect(html).not.toContain("Sound is on");
  });
});
