// @vitest-environment happy-dom
// Presses the check-in buttons in a test browser (happy-dom): after a failed pause read, off-site
// waiting is still offered from the last good read, and a start at a site that was paused since
// then shows the paused message (the database refused it with VWR02). The fallback button stays
// enabled and saves the patient as waiting on-site, no visit is reported as created before that,
// and the paused message names a button that is on the screen. Enter (form submit) while only
// on-site waiting is offered saves nothing and says so first.

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
import { checkInAtDesk, startFromHome } from "@/lib/visitActions";
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

/** Show the panel: a desk visit after a failed read whose last good read said "not paused", unless `props` say otherwise. */
function showPanel(props: Partial<ComponentProps<typeof CheckInPanel>> = {}) {
  act(() =>
    root.render(
      <CheckInPanel
        site="A"
        onAttempt={() => {}}
        onCreated={() => {}}
        homeVisit={null}
        homeProblem={null}
        onHomeDone={() => {}}
        offsitePaused={false}
        pauseReadFailed={true}
        {...props}
      />,
    ),
  );
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

/** Press the button whose words start with `words`, and wait for its save. */
async function press(words: string) {
  const found = button(words);
  if (!found) throw new Error(`No button "${words}"`);
  await act(async () => found.click());
}

/** true when one of the button names in "quotes" in `text` is the start of a button on the screen. */
function namesAButtonOnScreen(text: string): boolean {
  const names = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return names.some((name) => button(name) !== undefined);
}

/** The save-result line (the second status line, below the stale-read warning). */
const resultLine = () => container.querySelectorAll('p[role="status"]')[1]?.textContent ?? "";

/** Choose CTAS 4 (the first radio button) and tick all three checklist items. */
function fillForm() {
  const radio = container.querySelector<HTMLInputElement>('input[type="radio"]');
  if (!radio) throw new Error("No CTAS radio button");
  act(() => radio.click());
  for (const box of container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    act(() => box.click());
  }
}

/** Submit the form, as Enter in a form field can. This test does not show whether a real browser submits it. */
async function submitForm() {
  const form = container.querySelector("form");
  if (!form) throw new Error("No form");
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

const deskVisit = checkInAtDesk(
  { id: "d", code: "DESK01", access_token: "tok", site: "A", ctas_level: 4, language: "en" },
  "not_eligible",
  new Date(),
);
const homeVisit = startFromHome({ id: "h", code: "HOME23", access_token: "tok", site: "A", language: "en" }, new Date());

describe("CheckInPanel taps after a failed pause read", () => {
  it("a start at a site paused since the last good read shows the paused message", async () => {
    const onCreated = vi.fn();
    showPanel({ onCreated });
    fillForm();
    await press("Start off-site waiting");

    expect(createDeskVisit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createDeskVisit).mock.calls[0][1]).toBe("waiting");
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
    // Nothing was saved, so no visit was created, and the fallback button is enabled again.
    expect(onCreated).not.toHaveBeenCalled();
    // At offsitePaused={false} the fallback button is labelled "Not eligible".
    expect(button("Not eligible")?.getAttribute("aria-disabled")).toBe("false");

    // Show the same panel as paused (as after reloadSitePauses): the paused message stays.
    showPanel({ onCreated, offsitePaused: true });
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);

    // The paused fallback button works: this time the database saves the visit as not_eligible.
    expect(button("Waits on-site")?.getAttribute("aria-disabled")).toBe("false");
    vi.mocked(createDeskVisit).mockResolvedValueOnce(deskVisit);
    await press("Waits on-site");
    expect(createDeskVisit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createDeskVisit).mock.calls[1][1]).toBe("not_eligible");
    expect(onCreated).toHaveBeenCalledWith(deskVisit);
    expect(container.textContent).not.toContain(PAUSED_NOT_SAVED);
    expect(resultLine()).toContain("Visit DESK01 recorded as waiting on-site (off-site waiting paused)");
  });

  it("a home visit refused as paused shows the paused message, then its fallback button saves it", async () => {
    const onHomeDone = vi.fn();
    showPanel({ homeVisit, onHomeDone });
    fillForm();
    await press("Start off-site waiting");

    expect(checkInVisitFromHome).toHaveBeenCalledTimes(1);
    expect(vi.mocked(checkInVisitFromHome).mock.calls[0][2]).toBe("waiting");
    expect(container.textContent).toContain(PAUSED_NOT_SAVED);
    expect(namesAButtonOnScreen(PAUSED_NOT_SAVED)).toBe(true);
    expect(onHomeDone).not.toHaveBeenCalled();

    vi.mocked(checkInVisitFromHome).mockResolvedValueOnce("saved");
    await press("Not eligible");
    expect(checkInVisitFromHome).toHaveBeenCalledTimes(2);
    expect(vi.mocked(checkInVisitFromHome).mock.calls[1][2]).toBe("not_eligible");
    expect(onHomeDone).toHaveBeenCalledTimes(1);
    expect(createDeskVisit).not.toHaveBeenCalled();
  });
});

describe("CheckInPanel language after a check-in", () => {
  it("sets the language back to English after a check-in saves, for the next patient", async () => {
    vi.mocked(createDeskVisit).mockResolvedValueOnce(deskVisit);
    showPanel({ offsitePaused: false, pauseReadFailed: false });
    fillForm();
    const menu = () => container.querySelector<HTMLSelectElement>("select");
    act(() => {
      const select = menu();
      if (!select) throw new Error("No language menu");
      select.value = "fr";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(menu()?.value).toBe("fr");
    await press("Not eligible");
    expect(createDeskVisit).toHaveBeenCalledTimes(1);
    expect(resultLine()).toContain("Visit DESK01 recorded as not eligible");
    expect(menu()?.value).toBe("en");
  });
});

describe("CheckInPanel on Enter while only on-site waiting is offered", () => {
  it("saves nothing and says so first while the pause switch could not be read", async () => {
    showPanel({ offsitePaused: null });
    fillForm();
    await submitForm();

    expect(createDeskVisit).not.toHaveBeenCalled();
    expect(resultLine().startsWith('Nothing was saved. Press "Waits on-site" instead.')).toBe(true);
    expect(resultLine()).toContain("If the network is still down, no button can save.");
    expect(namesAButtonOnScreen(resultLine())).toBe(true);
  });

  it("saves nothing and says so first while off-site waiting is paused", async () => {
    showPanel({ offsitePaused: true });
    fillForm();
    await submitForm();

    expect(createDeskVisit).not.toHaveBeenCalled();
    expect(resultLine().startsWith('Nothing was saved. Press "Waits on-site" instead.')).toBe(true);
    expect(resultLine()).toContain("Off-site waiting is paused at this site");
    // The last read failed too, so the network may be down.
    expect(resultLine()).toContain("If the network is still down, no button can save.");
    expect(namesAButtonOnScreen(resultLine())).toBe(true);
  });
});

describe("CheckInPanel focus after Cancel", () => {
  it("moves focus to the panel heading after Cancel gives up the home visit", () => {
    // Like the real page: giving up the home visit re-renders the panel without it, so the heading
    // shows its new title before focus should land on it. The re-render runs inside the click's act.
    const onHomeDone = vi.fn(() =>
      showPanel({ homeVisit: null, offsitePaused: false, pauseReadFailed: false }),
    );
    showPanel({ homeVisit, onHomeDone, offsitePaused: false, pauseReadFailed: false });
    const heading = container.querySelector<HTMLHeadingElement>("#checkin-heading");
    if (!heading) throw new Error("No heading #checkin-heading");
    // The heading text at the moment it gets focus.
    let textWhenFocused = "";
    heading.addEventListener("focus", () => {
      textWhenFocused = heading.textContent ?? "";
    });
    const cancel = button("Cancel:");
    if (!cancel) throw new Error('No button "Cancel:"');
    act(() => cancel.focus());
    act(() => cancel.click());
    expect(onHomeDone).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
    expect(textWhenFocused).toBe("Check in a patient after triage");
  });
});
