// @vitest-environment happy-dom
// Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
// waiting is still offered from the last good read, and a start at a site that was paused since
// then shows the paused message (the database refused it with VWR02). The fallback button stays
// enabled, no visit is reported as created, and the paused message stays after a re-render as paused.
// The paused message must name a button that is on the screen, before and after the new read.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
import { startFromHome } from "@/lib/visitActions";
import { CheckInPanel } from "./CheckInPanel";
import { PAUSED_NOT_SAVED } from "./checkInText";

vi.mock("@/data/staffActions", () => ({ createDeskVisit: vi.fn(), checkInVisitFromHome: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(createDeskVisit).mockReset().mockResolvedValue("paused");
  vi.mocked(checkInVisitFromHome).mockReset().mockResolvedValue("paused");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

/** true when one of the button names in "quotes" in `text` is the start of a button on the screen. */
function namesAButtonOnScreen(text: string): boolean {
  const names = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return names.some((name) => button(name) !== undefined);
}

/** Choose CTAS 4 (the first radio button) and tick all three checklist items. */
function fillForm() {
  const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
  if (!radio) throw new Error("No CTAS radio button");
  act(() => radio.click());
  for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    act(() => box.click());
  }
}

describe("CheckInPanel taps after a failed pause read", () => {
  it("a start at a site paused since the last good read shows the paused message", async () => {
    const onCreated = vi.fn();
    act(() =>
      root.render(
        <CheckInPanel
          site="A"
          onAttempt={() => {}}
          onCreated={onCreated}
          homeVisit={null}
          homeProblem={null}
          onHomeDone={() => {}}
          offsitePaused={false}
          pauseReadFailed={true}
        />,
      ),
    );
    fillForm();

    const start = button("Start off-site waiting");
    if (!start) throw new Error('No button "Start off-site waiting"');
    await act(async () => start.click());

    expect(createDeskVisit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createDeskVisit).mock.calls[0][1]).toBe("waiting");
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
    // Nothing was saved, so no visit was created, and the fallback button is enabled again.
    expect(onCreated).not.toHaveBeenCalled();
    // At offsitePaused={false} the fallback button is labelled "Not eligible".
    expect(button("Not eligible")?.getAttribute("aria-disabled")).toBe("false");

    // Re-render the same panel as paused (as after reloadSitePauses): the paused message stays.
    act(() =>
      root.render(
        <CheckInPanel
          site="A"
          onAttempt={() => {}}
          onCreated={onCreated}
          homeVisit={null}
          homeProblem={null}
          onHomeDone={() => {}}
          offsitePaused={true}
          pauseReadFailed={true}
        />,
      ),
    );
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);

    // The paused fallback button works: it saves the patient as waiting on-site (not_eligible).
    const fallback = button("Waits on-site (off-site waiting paused)");
    if (!fallback) throw new Error('No button "Waits on-site (off-site waiting paused)"');
    expect(fallback.getAttribute("aria-disabled")).toBe("false");
    await act(async () => fallback.click());
    expect(createDeskVisit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createDeskVisit).mock.calls[1][1]).toBe("not_eligible");
  });

  it("a home visit refused as paused shows the paused message and creates nothing", async () => {
    const home = startFromHome({ id: "h", code: "HOME23", access_token: "tok", site: "A", language: "en" }, new Date());
    const onHomeDone = vi.fn();
    act(() =>
      root.render(
        <CheckInPanel
          site="A"
          onAttempt={() => {}}
          onCreated={() => {}}
          homeVisit={home}
          homeProblem={null}
          onHomeDone={onHomeDone}
          offsitePaused={false}
          pauseReadFailed={true}
        />,
      ),
    );
    fillForm();
    const start = button("Start off-site waiting");
    if (!start) throw new Error('No button "Start off-site waiting"');
    await act(async () => start.click());

    expect(checkInVisitFromHome).toHaveBeenCalledTimes(1);
    expect(vi.mocked(checkInVisitFromHome).mock.calls[0][2]).toBe("waiting");
    expect(createDeskVisit).not.toHaveBeenCalled();
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
    expect(onHomeDone).not.toHaveBeenCalled();
  });

  it("Enter while the pause switch could not be read saves nothing and says so", async () => {
    act(() =>
      root.render(
        <CheckInPanel
          site="A"
          onAttempt={() => {}}
          onCreated={() => {}}
          homeVisit={null}
          homeProblem={null}
          onHomeDone={() => {}}
          offsitePaused={null}
          pauseReadFailed={true}
        />,
      ),
    );
    fillForm();
    const form = container.querySelector("form");
    if (!form) throw new Error("No form");
    // Enter in a form field submits the form, which asks for off-site waiting.
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(createDeskVisit).not.toHaveBeenCalled();
    const line = [...container.querySelectorAll('p[role="status"]')].map((p) => p.textContent).join(" ");
    expect(line).toContain("Nothing was saved.");
    expect(line).toContain("If the network is still down, no button can save.");
    expect(namesAButtonOnScreen(line)).toBe(true);
  });
});
