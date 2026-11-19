// @vitest-environment happy-dom
// Presses the "Recall all off-site patients" buttons in a test browser (happy-dom): while a recall
// is being saved, Cancel must not close the confirmation box.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recallAll } from "@/data/staffActions";
import type { RecallAllResult } from "@/lib/recallAll";
import type { Visit } from "@/lib/visit";
import { RecallAllPanel } from "./RecallAllPanel";

vi.mock("@/data/staffActions", () => ({ recallAll: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/** A synthetic waiting visit at Demo Site A that has been triaged, so it is in the off-site line. */
function waitingVisit(id: string, code: string): Visit {
  return {
    id,
    code,
    access_token: "test-token-" + id,
    site: "A",
    source: "desk",
    ctas_level: 5,
    language: "en",
    status: "waiting",
    removed_reason: null,
    created_at: "2026-11-18T10:00:00.000Z",
    triaged_at: "2026-11-18T10:05:00.000Z",
    offered_at: null,
    last_still_here_at: null,
    called_at: null,
    seen_at: null,
    confirmed_at: null,
    review_flagged_at: null,
    arrived_at: null,
    closed_at: null,
    phone_attempts: 0,
    last_phone_result: null,
    followup_paused_until: null,
    survey_score: null,
    is_demo: true,
  };
}

function show(visits: Visit[]) {
  act(() => root.render(<RecallAllPanel visits={visits} site="A" onResult={vi.fn()} />));
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

const confirmBox = () => container.querySelector<HTMLElement>('[data-testid="recall-all-confirm"]');

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Lets the pending save and the panel's one-tick focus wait (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  vi.mocked(recallAll).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("RecallAllPanel taps", () => {
  it("while a recall is pending, Cancel does not close the confirmation; it closes after the save ends", async () => {
    let finish!: (v: RecallAllResult) => void;
    vi.mocked(recallAll).mockReturnValue(
      new Promise<RecallAllResult>((resolve) => {
        finish = resolve;
      }),
    );
    show([waitingVisit("v1", "A101"), waitingVisit("v2", "A102")]);
    await press("Recall all off-site patients");
    await press("Yes, recall all");
    await press("Cancel");
    expect(confirmBox()).not.toBeNull();
    await act(async () => finish({ recalled: 2, changed: 0, notSaved: false }));
    await nextTick();
    expect(confirmBox()).toBeNull();
  });
});
