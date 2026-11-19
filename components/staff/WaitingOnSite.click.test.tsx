// @vitest-environment happy-dom
// Presses the buttons of the "Waiting on-site: offered, declined" list in a test browser
// (happy-dom): the checklist must be ticked, nothing is offered while paused, each save result
// shows the right words, focus never drops to the page, and a switch can be undone.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeResult, Visit } from "@/lib/visit";
import { checkInAtDesk } from "@/lib/visitActions";
import { WaitingOnSite } from "./WaitingOnSite";

// The screen's server clock, set by each test (the real one would ask the server for its time).
let clock = new Date("2026-11-19T20:25:00Z");
vi.mock("@/data/serverClock", () => ({ serverNow: () => clock }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t0 = new Date("2026-11-19T20:00:00Z");
const declined = checkInAtDesk(
  { id: "d1", code: "DEC234", access_token: "T", site: "A", ctas_level: 5, language: "en" },
  "declined",
  t0,
);
const now = new Date(t0.getTime() + 25 * 60_000);

let container: HTMLDivElement;
let root: Root;

function show(offsitePaused: boolean | null, result: ChangeResult = "saved", visits: Visit[] = [declined], undoResult: ChangeResult = "saved") {
  const save = vi.fn(async (_id: string, language: string, onSaved: (visit: Visit) => void) => {
    if (result === "saved") onSaved({ ...declined, status: "waiting", closed_at: null, language });
    return result;
  });
  const undo = vi.fn(async () => undoResult);
  const onSwitched = vi.fn();
  const onUndone = vi.fn();
  const draw = (paused: boolean | null, list: Visit[]) =>
    act(() =>
      root.render(
        <WaitingOnSite
          visits={list}
          site="A"
          now={now}
          offsitePaused={paused}
          save={save}
          undo={undo}
          onSwitched={onSwitched}
          onUndone={onUndone}
        />,
      ),
    );
  draw(offsitePaused, visits);
  return { save, undo, onSwitched, onUndone, draw };
}

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  target.focus();
  await act(async () => target.click());
}

async function tickAll() {
  for (const box of container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
    await act(async () => box.click());
  }
}

beforeEach(() => {
  clock = now;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("WaitingOnSite", () => {
  it("lists the declined visit with how long ago it declined", () => {
    show(false);
    expect(container.textContent).toContain("Waiting on-site: offered, declined (1)");
    expect(container.textContent).toContain("DEC234");
    expect(container.textContent).toContain("declined 25 min");
  });

  it("saves nothing until all three checklist items are ticked", async () => {
    const { save } = show(false);
    await press("Switch to off-site waiting");
    await press("Start off-site waiting");
    expect(save).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Tick all three checklist items");
  });

  it("switches after the checklist, shows the slip, and moves focus to the heading", async () => {
    const { save, onSwitched } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    await press("Start off-site waiting");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBe("d1");
    expect(save.mock.calls[0][1]).toBe("en");
    expect(onSwitched).toHaveBeenCalledWith(expect.objectContaining({ id: "d1", status: "waiting" }));
    expect(container.textContent).toContain("Visit DEC234 is now waiting off-site");
    expect(document.activeElement?.id).toBe("onsite-heading");
  });

  it("offers no switch while paused or while the pause is not read yet", () => {
    show(true);
    expect(button("Switch to off-site waiting")).toBeUndefined();
    expect(container.textContent).toContain("Off-site waiting is paused at this site, so no one can switch now.");
    show(null);
    expect(button("Switch to off-site waiting")).toBeUndefined();
  });

  it("says nothing was saved when the database refuses because the site was paused meanwhile", async () => {
    const { onSwitched } = show(false, "paused");
    await press("Switch to off-site waiting");
    await tickAll();
    await press("Start off-site waiting");
    expect(onSwitched).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Off-site waiting is paused at this site. Nothing was saved.");
  });

  it("Cancel closes the checklist without saving", async () => {
    const { save } = show(false);
    await press("Switch to off-site waiting");
    await press("Cancel");
    expect(save).not.toHaveBeenCalled();
    expect(container.querySelector("input[type=checkbox]")).toBeNull();
  });

  it("shows the triage time and the place the patient would get, and the note about patients seen inside", () => {
    const waiting = checkInAtDesk({ id: "w1", code: "WAI234", access_token: "W", site: "A", ctas_level: 4, language: "en" }, "waiting", new Date(t0.getTime() - 60_000));
    show(false, "saved", [waiting, declined]);
    expect(container.textContent).toContain("triaged 25 min");
    expect(container.textContent).toContain("Would be number 2 in line if switched now.");
    expect(container.textContent).toContain("Patients already seen inside stay on this list");
  });

  it("moves focus to the first checkbox on open, and back to the switch button on Cancel", async () => {
    show(false);
    await press("Switch to off-site waiting");
    expect(document.activeElement).toBe(container.querySelector("input[type=checkbox]"));
    await press("Cancel");
    expect(document.activeElement).toBe(button("Switch to off-site waiting"));
  });

  it("moves focus to the first unticked box when the checklist is not complete", async () => {
    show(false);
    await press("Switch to off-site waiting");
    const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
    await act(async () => boxes[0].click());
    await press("Start off-site waiting");
    expect(document.activeElement).toBe(boxes[1]);
  });

  it("saves the language chosen in the checklist", async () => {
    const { save } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    const menu = container.querySelector("select")!;
    await act(async () => {
      menu.value = "fr";
      menu.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await press("Start off-site waiting");
    expect(save.mock.calls[0][1]).toBe("fr");
  });

  it("says the 6 hours have passed, not that another screen changed the visit", async () => {
    const { save } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    clock = new Date(t0.getTime() + 6 * 60 * 60_000 + 15_000);
    await press("Start off-site waiting");
    expect(save).not.toHaveBeenCalled();
    expect(container.textContent).toContain("More than 6 hours have passed since this patient declined. Nothing was saved.");
  });

  it("closes the checklist and clears the ticks when the site is paused on another screen", async () => {
    const { draw } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    draw(true, [declined]);
    expect(container.querySelector("input[type=checkbox]")).toBeNull();
    expect(container.textContent).toContain("The checklist was closed. Nothing was saved.");
    expect(document.activeElement?.id).toBe("onsite-heading");
    draw(false, [declined]);
    expect(container.querySelector("input[type=checkbox]")).toBeNull();
  });

  it("offers Undo after a switch, until the patient is recalled", async () => {
    const { draw, undo, onUndone } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    await press("Start off-site waiting");
    const switchedVisit: Visit = {
      ...declined,
      status: "waiting",
      closed_at: null,
      offered_at: now.toISOString(),
      last_still_here_at: now.toISOString(),
    };
    draw(false, [switchedVisit]);
    await press("Undo switch");
    expect(undo).toHaveBeenCalledWith("d1");
    expect(onUndone).toHaveBeenCalled();
    expect(container.textContent).toContain('Visit DEC234 is back to "offered, declined".');
  });

  it("hides Undo once the switched patient is recalled", async () => {
    const { draw } = show(false);
    await press("Switch to off-site waiting");
    await tickAll();
    await press("Start off-site waiting");
    draw(false, [{ ...declined, status: "called", closed_at: null, offered_at: now.toISOString(), called_at: now.toISOString() }]);
    expect(button("Undo switch")).toBeUndefined();
  });
});
