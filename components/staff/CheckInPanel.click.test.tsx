// @vitest-environment happy-dom
// Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
// waiting is still offered from the last good read, and a start at a site that was paused since
// then shows the paused message (the database refused it with VWR02). The fallback button stays
// enabled, no visit is reported as created, and the paused message stays after a re-render as paused.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeskVisit } from "@/data/staffActions";
import { CheckInPanel } from "./CheckInPanel";

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
    expect(container.textContent).toContain(
      'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.',
    );
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
    expect(container.textContent).toContain(
      'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.',
    );
  });
});
