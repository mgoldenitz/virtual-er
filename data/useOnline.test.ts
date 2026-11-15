// Checks that the connection is asked again on "online", "offline" and when the page comes
// back on screen, and that all three listeners are removed again. Vitest has no browser, so
// window and document are stand-ins that only record what was added and removed.

import { afterEach, describe, expect, it, vi } from "vitest";
import { watchConnection } from "./useOnline";

function standIn() {
  return { added: [] as string[], removed: [] as string[] };
}

afterEach(() => vi.unstubAllGlobals());

describe("watchConnection", () => {
  it("listens to online, offline and visibilitychange, and stops all three", () => {
    const win = standIn();
    const doc = standIn();
    vi.stubGlobal("window", {
      addEventListener: (name: string) => win.added.push(name),
      removeEventListener: (name: string) => win.removed.push(name),
    });
    vi.stubGlobal("document", {
      addEventListener: (name: string) => doc.added.push(name),
      removeEventListener: (name: string) => doc.removed.push(name),
    });

    const stop = watchConnection(() => {});
    expect(win.added).toEqual(["online", "offline"]);
    expect(doc.added).toEqual(["visibilitychange"]);

    stop();
    expect(win.removed).toEqual(["online", "offline"]);
    expect(doc.removed).toEqual(["visibilitychange"]);
  });
});
