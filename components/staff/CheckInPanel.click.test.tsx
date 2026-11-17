// @vitest-environment happy-dom
// Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
// waiting is still offered from the last good read, and a start at a site that was paused since
// then shows the paused message (the database refused it with VWR02). The fallback button stays
// enabled, no visit is reported as created, and the paused message stays after a re-render as paused.
// The paused message must name a button that is on the screen, before and after the new read.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeskVisit } from "@/data/staffActions";
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
    // CTAS 4 is the first radio button; then tick all three checklist items.
    const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
    if (!radio) throw new Error("No CTAS radio button");
    act(() => radio.click());
    for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      act(() => box.click());
    }

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
  });
});
