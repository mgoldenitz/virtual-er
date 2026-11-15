// Checks that a saved pause shows in the store at once, before the re-read from /api/site-status (which here still says "not paused").

import { afterEach, describe, expect, it, vi } from "vitest";
import { pauseStateNow, setSitePaused } from "./sitePauses";
import { supabaseBrowser } from "./supabaseBrowser";

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

afterEach(() => vi.unstubAllGlobals());

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
    await vi.waitFor(() => expect(pauseStateNow().pauses).not.toBeNull());

    // The second save: the store shows A paused straight away, though the server still says not paused.
    await setSitePaused("A", true);
    expect(pauseStateNow().pauses?.A).toBe(true);

    // When the held re-read lands, it says not paused, and the store follows the server again.
    releaseLaterReads();
    await vi.waitFor(() => expect(pauseStateNow().pauses?.A).toBe(false));
  });
});
