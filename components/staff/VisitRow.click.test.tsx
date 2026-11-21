// @vitest-environment happy-dom
// Presses "Recall patient" on a staff row in a test browser (happy-dom): it saves only after "Yes",
// and focus then moves to the progress line, because the "Recall patient" button leaves the page.
// Also: when another staff screen changes the row, focus in a button that leaves is not lost.

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callBackVisit } from "@/data/staffActions";
import { callBack, checkInAtDesk, confirmOnMyWay } from "@/lib/visitActions";
import type { ChangeResult, Visit } from "@/lib/visit";
import { VisitRow } from "./VisitRow";

// The save is replaced, so the test controls what it returns.
vi.mock("@/data/staffActions", () => ({
  callBackVisit: vi.fn(),
  issueNewVisitLink: vi.fn(),
  markVisitArrived: vi.fn(),
  removeVisit: vi.fn(),
}));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const now = new Date("2026-11-18T20:00:00Z");
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const waiting = checkInAtDesk(input, "waiting", new Date(now.getTime() - 30 * 60_000));
const called = callBack(waiting, now);
if (!called) throw new Error("callBack refused the test visit");

let container: HTMLDivElement;
let root: Root;

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
const progressLine = () => container.querySelector('[data-testid="progress"]') as HTMLElement;

/** Draws the row for this visit, as the page does when the list changes. */
const draw = (visit: Visit) => act(() => root.render(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));

/** Lets the one-tick focus waits (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

/** A save that only finishes when the test calls `finish`, like a slow network. */
function slowSave() {
  let finish: (result: ChangeResult) => void = () => {};
  vi.mocked(callBackVisit).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  return (result: ChangeResult) => act(async () => finish(result));
}

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  target.focus();
  await act(async () => target.click());
}

beforeEach(() => {
  vi.mocked(callBackVisit).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  draw(waiting);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("VisitRow recall", () => {
  it("saves nothing on the first tap", async () => {
    await press("Recall patient");
    expect(callBackVisit).not.toHaveBeenCalled();
  });

  it("after Yes and a save, moves focus to the progress line", async () => {
    vi.mocked(callBackVisit).mockResolvedValue("saved");
    await press("Recall patient");
    await press("Yes, recall patient");
    draw(called); // the list gets the called visit, so the row shows it
    await nextTick();
    expect(callBackVisit).toHaveBeenCalledWith("v1");
    expect(document.activeElement).toBe(progressLine());
  });

  it("after Yes and a failed save, shows the not-saved note and keeps the progress line out of focus", async () => {
    vi.mocked(callBackVisit).mockResolvedValue("not_saved");
    await press("Recall patient");
    await press("Yes, recall patient");
    expect(container.textContent).toContain("Not saved");
    expect(document.activeElement).not.toBe(progressLine());
  });

  it("when the row shows the called visit before the save says saved, focus lands on the called text", async () => {
    const finish = slowSave();
    let textAtFocus = "";
    progressLine().addEventListener("focus", () => (textAtFocus = progressLine().textContent ?? ""));
    await press("Recall patient");
    await press("Yes, recall patient");
    await nextTick(); // the panel's one-tick focus wait runs while the save is still on its way
    draw(called); // the real save puts the called visit in the list before it returns
    await finish("saved");
    await nextTick();
    expect(document.activeElement).toBe(progressLine());
    expect(textAtFocus).toContain("Called");
    expect(textAtFocus).not.toContain("Waiting off-site");
  });

  it("when the next drawn status skips called (the patient tapped I'm on my way), focus still lands on the progress line", async () => {
    const onTheWay = confirmOnMyWay(called, now);
    if (!onTheWay) throw new Error("confirmOnMyWay refused the test visit");
    const finish = slowSave();
    await press("Recall patient");
    await press("Yes, recall patient");
    await finish("saved");
    await nextTick();
    draw(onTheWay);
    await nextTick();
    expect(document.activeElement).toBe(progressLine());
    expect(progressLine().textContent).toContain("On the way");
  });

  it("when the row shows the called visit after the save says saved, focus waits for the called text", async () => {
    const finish = slowSave();
    let textAtFocus = "";
    progressLine().addEventListener("focus", () => (textAtFocus = progressLine().textContent ?? ""));
    await press("Recall patient");
    await press("Yes, recall patient");
    await finish("saved");
    await nextTick();
    draw(called); // the browser draws the list change later
    await nextTick();
    expect(document.activeElement).toBe(progressLine());
    expect(textAtFocus).toContain("Called");
    expect(textAtFocus).not.toContain("Waiting off-site");
  });

  it("after a failed save, focus goes back to Recall patient on the next tick", async () => {
    vi.mocked(callBackVisit).mockResolvedValue("not_saved");
    await press("Recall patient");
    await press("Yes, recall patient");
    await nextTick();
    expect(document.activeElement).toBe(button("Recall patient"));
  });

  it.each(["not_saved", "refused"] as const)("after a slow save that ends %s, focus is on Recall patient", async (result) => {
    const finish = slowSave();
    await press("Recall patient");
    await press("Yes, recall patient");
    await nextTick();
    await finish(result);
    await nextTick();
    expect(document.activeElement).toBe(button("Recall patient"));
    expect(container.textContent).toContain(result === "not_saved" ? "Not saved" : "The list just changed");
  });
});

describe("VisitRow focus when another screen changes the row", () => {
  /** Draws the row in StrictMode, which runs each effect twice, as the dev server does. */
  const drawStrict = (visit: Visit | null, onFocusLost = vi.fn()) =>
    act(() =>
      root.render(
        <StrictMode>
          {visit && <VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} onFocusLost={onFocusLost} />}
        </StrictMode>,
      ),
    );

  beforeEach(() => drawStrict(waiting));

  it("when another screen recalls the patient, focus moves from Recall patient to the progress line", () => {
    button("Recall patient")?.focus();
    drawStrict(called);
    expect(document.activeElement).toBe(progressLine());
  });

  it("when another screen recalls the patient during the question, focus moves from Yes to the progress line", async () => {
    await press("Recall patient");
    expect(document.activeElement).toBe(button("Yes, recall patient"));
    drawStrict(called);
    expect(document.activeElement).toBe(progressLine());
  });

  it("a focused button that stays keeps focus", () => {
    button("Mark arrived")?.focus();
    drawStrict(called);
    expect(document.activeElement).toBe(button("Mark arrived"));
  });

  it("after a phone tap (focus on the page body), focus does not move", async () => {
    await act(async () => button("Show QR again")?.click());
    drawStrict(called);
    expect(document.activeElement).toBe(document.body);
  });

  /** A button on the page outside the row, such as another patient's row. */
  function outsideButton() {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    return outside;
  }

  it("focus that staff moved out of the row stays there when the part that had focus leaves", () => {
    const outside = outsideButton();
    button("Recall patient")?.focus();
    outside.focus();
    drawStrict(called);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("after earlier focus in the row and then a phone tap, focus does not move", () => {
    const recall = button("Recall patient");
    recall?.focus();
    // A tap on a phone: the pointer goes down, and focus falls to the page body without a focus event.
    act(() => button("Show QR again")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    recall?.blur();
    drawStrict(called);
    expect(document.activeElement).toBe(document.body);
  });

  it("a part that left while focus was outside the row does not take focus at a later change", () => {
    const onTheWay = confirmOnMyWay(called, now);
    if (!onTheWay) throw new Error("confirmOnMyWay refused the test visit");
    const outside = outsideButton();
    button("Recall patient")?.focus();
    outside.focus();
    drawStrict(called); // "Recall patient" leaves while focus is outside the row
    outside.blur();
    drawStrict(onTheWay);
    expect(document.activeElement).toBe(document.body);
    outside.remove();
  });

  it("when the row leaves the list with focus inside it, it reports the lost focus once", () => {
    const onFocusLost = vi.fn();
    drawStrict(waiting, onFocusLost);
    button("Mark arrived")?.focus();
    drawStrict(null, onFocusLost);
    expect(onFocusLost).toHaveBeenCalledTimes(1);
  });
});
