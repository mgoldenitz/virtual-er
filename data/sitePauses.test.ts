// @vitest-environment happy-dom
// Checks that a saved pause shows in the store at once, before the re-read from /api/site-status (which here still says "not paused").
// The store is read through the useSitePauses hook, as the screens read it.

import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setSitePaused, useSitePauses, type PauseState } from "./sitePauses";
import { supabaseBrowser } from "./supabaseBrowser";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Replace the real Supabase connection: the update answers "one row changed" (saved).
vi.mock("./supabaseBrowser", () => ({ supabaseBrowser: vi.fn() }));

function mockSavedUpdate() {
  vi.mocked(supabaseBrowser).mockReturnValue({
    from: () => ({
      update: () => ({
        eq: () => ({
          eq: () => ({ select: async () => ({ data: [{ site: "A" }], error: null }) }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof supabaseBrowser>);
}

// The latest store value that the probe component saw on its last render.
let latest: PauseState = { pauses: null, failed: false };

// A component that only reads the store through the hook, as a screen does.
function Probe() {
  const store = useSitePauses();
  // Recorded after each render, outside render itself, as the lint rule requires.
  useEffect(() => {
    latest = store;
  });
  return null;
}

let mounted: { container: HTMLDivElement; root: Root } | undefined;

function mountProbe() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(Probe)));
  mounted = { container, root };
}

/** Lets pending store updates and their re-renders finish, inside act(). */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (mounted) {
    const { container, root } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = undefined;
  }
});

describe("setSitePaused", () => {
  it("shows a saved pause at once, before the re-read that still says not paused", async () => {
    mockSavedUpdate();
    // The store only changes after it has had a first read. setSitePaused re-reads after every
    // save, so the first save here gives the store its first value (the first fetch answers at once).
    let reads = 0;
    let releaseLaterReads!: () => void;
    const laterReadsWait = new Promise<void>((resolve) => (releaseLaterReads = resolve));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        reads += 1;
        // Later reads wait, so the test can look at the store before the re-read lands.
        if (reads > 1) await laterReadsWait;
        return { ok: true, json: async () => ({ A: false, B: false }) };
      }),
    );

    await setSitePaused("A", true);
    // The hook is mounted only after that first save, so the save is what gives the store its first value.
    mountProbe();
    await settle();
    expect(latest.pauses).not.toBeNull();

    // The second save: the store shows A paused straight away, though the server still says not paused.
    await act(async () => {
      await setSitePaused("A", true);
    });
    expect(latest.pauses?.A).toBe(true);

    // When the held re-read lands, it says not paused, and the store follows the server again.
    releaseLaterReads();
    await settle();
    expect(latest.pauses?.A).toBe(false);
  });
});
