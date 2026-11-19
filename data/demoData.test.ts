// Checks that clearDemoData() returns "failed" when the database call fails or answers with NaN, returns the number of deleted visits when it works, waits for the visit re-read (up to 3 seconds), and still returns the count when the re-read fails.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDemoData } from "./demoData";
import { supabaseBrowser } from "./supabaseBrowser";
import { loadVisits } from "./visitCache";

// Replace the real Supabase connection and the visit re-read.
vi.mock("./supabaseBrowser", () => ({ supabaseBrowser: vi.fn() }));
vi.mock("./visitCache", () => ({ loadVisits: vi.fn() }));

function mockRpc(rpc: (name: string) => unknown) {
  vi.mocked(supabaseBrowser).mockReturnValue({ rpc } as unknown as ReturnType<typeof supabaseBrowser>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadVisits).mockResolvedValue(undefined);
});

describe("clearDemoData", () => {
  it("returns failed and does not re-read when the database answers with an error", async () => {
    mockRpc(async () => ({ data: null, error: { message: "x" } }));
    await expect(clearDemoData()).resolves.toBe("failed");
    expect(loadVisits).not.toHaveBeenCalled();
  });

  it("returns failed and does not re-read when the database answers with something that is not a number", async () => {
    mockRpc(async () => ({ data: "3", error: null }));
    await expect(clearDemoData()).resolves.toBe("failed");
    expect(loadVisits).not.toHaveBeenCalled();
  });

  it("returns failed and does not re-read when the database answers with NaN", async () => {
    mockRpc(async () => ({ data: Number.NaN, error: null }));
    await expect(clearDemoData()).resolves.toBe("failed");
    expect(loadVisits).not.toHaveBeenCalled();
  });

  it("returns failed and does not re-read when the database call throws", async () => {
    mockRpc(() => {
      throw new Error("offline");
    });
    await expect(clearDemoData()).resolves.toBe("failed");
    expect(loadVisits).not.toHaveBeenCalled();
  });

  it("returns the number of deleted visits, re-reads once, and calls clear_demo_data", async () => {
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    mockRpc(rpc);
    await expect(clearDemoData()).resolves.toBe(2);
    expect(loadVisits).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("clear_demo_data");
  });

  it("waits for the visit re-read before it returns the count", async () => {
    mockRpc(async () => ({ data: 2, error: null }));
    let releaseRead!: () => void;
    vi.mocked(loadVisits).mockReturnValue(new Promise<void>((resolve) => (releaseRead = resolve)));
    let done = false;
    const pending = clearDemoData().then((count) => {
      done = true;
      return count;
    });
    // Let every pending step run; the re-read is still held, so clearDemoData must not be done.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(false);
    releaseRead();
    await expect(pending).resolves.toBe(2);
  });

  it("returns the count even when the re-read fails, because the rows are already deleted", async () => {
    mockRpc(async () => ({ data: 2, error: null }));
    vi.mocked(loadVisits).mockRejectedValue(new Error("read failed"));
    await expect(clearDemoData()).resolves.toBe(2);
  });

  it("returns the count after 3 seconds when the re-read never ends", async () => {
    vi.useFakeTimers();
    try {
      mockRpc(async () => ({ data: 2, error: null }));
      vi.mocked(loadVisits).mockReturnValue(new Promise<void>(() => {}));
      let done = false;
      const pending = clearDemoData().then((count) => {
        done = true;
        return count;
      });
      // The rows are already deleted, so staff must not be left on "Saving…" forever.
      await vi.advanceTimersByTimeAsync(2999);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
