// @vitest-environment happy-dom
// Presses the buttons of the "Waiting on-site: offered, declined" list in a test browser
// (happy-dom): the checklist must be ticked, nothing is offered while paused, and each save
// result shows the right words.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeResult, Visit } from "@/lib/visit";
import { checkInAtDesk } from "@/lib/visitActions";
import { WaitingOnSite } from "./WaitingOnSite";

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

function show(offsitePaused: boolean | null, result: ChangeResult = "saved") {
  const save = vi.fn(async (_id: string, onSaved: (visit: Visit) => void) => {
    if (result === "saved") onSaved({ ...declined, status: "waiting", closed_at: null });
    return result;
  });
  const onSwitched = vi.fn();
  act(() =>
    root.render(
      <WaitingOnSite visits={[declined]} site="A" now={now} offsitePaused={offsitePaused} save={save} onSwitched={onSwitched} />,
    ),
  );
  return { save, onSwitched };
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
});
