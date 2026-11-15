// Checks the "Turn on sound" box: the words in the chosen language, the button, no extra
// live region, and that "Sound is on" is not shown before the patient taps the button.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import { SoundSwitch } from "./SoundSwitch";

// Replace the real sound player, so the tests never touch the browser's audio.
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// React writes quote marks as &quot; in the HTML, so the expected words are escaped the same way.
function htmlText(words: string): string {
  return words
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

  // "Sound is on" gets focus after the tap (a screen reader reads it then), so it stays out of the
  // live region: there it would be read twice. The one live region holds only the failed and
  // offWhileCalled lines, and it is always on the page, so screen readers read a line when it appears.
  it("has one empty status box while waiting, and never puts Sound is on in a live region", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="en" />);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).not.toContain("aria-live");
    expect(html).toMatch(/<div role="status"[^>]*><\/div>/);
  });

  it("does not show Sound is on before the patient taps the button", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
    expect(html).not.toContain("Sound is on");
  });

  it("shows the offWhileCalled line when the visit is called and the sound is off", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
    expect(html).toContain(htmlText(textFor("en").sound.offWhileCalled));
  });

  it("does not show the offWhileCalled line while waiting", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="en" />);
    expect(html).not.toContain(htmlText(textFor("en").sound.offWhileCalled));
  });

  it("does not show the failed line on first render", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
    expect(html).not.toContain('data-testid="sound-failed"');
  });

  it("shows the Arabic offWhileCalled line for ar when called", () => {
    const html = renderToStaticMarkup(<SoundSwitch status="called" language="ar" />);
    expect(html).toContain(htmlText(textFor("ar").sound.offWhileCalled));
  });
});
