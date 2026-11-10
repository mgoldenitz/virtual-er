import { afterEach, describe, expect, it, vi } from "vitest";
import { checkInAtDesk, callBack } from "@/lib/visitActions";
import { addVisit, readStorageProblem, readVisits, resetUnreadableStorage, updateVisit } from "./visitStore";

const visit = checkInAtDesk(
  { id: "v1", code: "ABC234", access_token: "T", site: "A", ctas_level: 4, language: "en" },
  "waiting",
  new Date(Date.UTC(2026, 10, 9, 20, 0)),
);

let saved = new Map<string, string>();

function fakeBrowser(setItemWorks: () => boolean) {
  saved = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (!setItemWorks()) throw new Error("QuotaExceededError");
        saved.set(key, value);
      },
      removeItem: (key: string) => saved.delete(key),
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("saving visits", () => {
  it("reports saved, and refused for a step that is not allowed", () => {
    fakeBrowser(() => true);
    expect(addVisit(visit)).toBe("saved");
    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("saved");
    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("refused");
    expect(updateVisit("missing", (v) => v)).toBe("refused");
  });

  it("reports not_saved when the browser refuses to store, and keeps the old status", () => {
    let works = true;
    fakeBrowser(() => works);
    addVisit(visit);
    works = false;
    expect(updateVisit("v1", (v) => callBack(v, new Date()))).toBe("not_saved");
    expect(readVisits()[0].status).toBe("waiting");
    expect(addVisit({ ...visit, id: "v2" })).toBe("not_saved");
  });
});

describe("damaged saved data", () => {
  it("counts damaged entries and keeps them when saving", () => {
    fakeBrowser(() => true);
    window.localStorage.setItem("vwr.visits.v1", JSON.stringify([{ ...visit, ctas_level: { x: 1 } }]));
    expect(readVisits()).toEqual([]);
    expect(readStorageProblem()).toEqual({ damaged: 1, unreadable: false });
    expect(addVisit({ ...visit, id: "v2" })).toBe("saved");
    expect(readVisits().map((v) => v.id)).toEqual(["v2"]);
    expect(readStorageProblem()).toEqual({ damaged: 1, unreadable: false });
  });

  it("reports saved text that is not a list at all, and refuses to save over it", () => {
    fakeBrowser(() => true);
    window.localStorage.setItem("vwr.visits.v1", "{broken");
    expect(readStorageProblem()).toEqual({ damaged: 0, unreadable: true });
    expect(addVisit(visit)).toBe("not_saved");
    expect(saved.get("vwr.visits.v1")).toBe("{broken");
  });

  it("starts a new list only after keeping a backup of the unreadable text", () => {
    let works = true;
    fakeBrowser(() => works);
    window.localStorage.setItem("vwr.visits.v1", "{broken");
    works = false;
    expect(resetUnreadableStorage()).toBe("not_saved");
    expect(saved.get("vwr.visits.v1")).toBe("{broken");
    works = true;
    expect(resetUnreadableStorage()).toBe("saved");
    expect(saved.has("vwr.visits.v1")).toBe(false);
    const backups = [...saved.entries()].filter(([key]) => key.startsWith("vwr.visits.v1.unreadable-backup."));
    expect(backups.map(([, value]) => value)).toEqual(["{broken"]);
    expect(addVisit(visit)).toBe("saved");
    expect(resetUnreadableStorage()).toBe("refused");
  });
});
