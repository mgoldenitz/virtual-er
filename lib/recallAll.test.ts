// Checks who "Recall all off-site patients" reaches, and what staff are told afterwards.

import { describe, expect, it } from "vitest";
import { recallAllMessage, recallAllTargets } from "./recallAll";
import { callBack, checkInAtDesk, startFromHome } from "./visitActions";

const t0 = new Date("2026-11-11T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const desk = (id: string, min: number, site: "A" | "B" = "A") =>
  checkInAtDesk({ id, code: id, access_token: id, site, ctas_level: 4, language: "en" }, "waiting", at(min));

describe("recallAllTargets", () => {
  it("includes only patients still waiting off-site at the site, in line order", () => {
    const visits = [
      desk("late", 5),
      desk("early", 1),
      callBack(desk("called", 2), at(10))!,
      desk("otherSite", 3, "B"),
      checkInAtDesk({ id: "d", code: "d", access_token: "d", site: "A", ctas_level: 5, language: "en" }, "declined", at(4)),
      startFromHome({ id: "h", code: "h", access_token: "h", site: "A", language: "en" }, at(0)),
    ];
    expect(recallAllTargets(visits, "A").map((v) => v.id)).toEqual(["early", "late"]);
  });
});

describe("recallAllMessage", () => {
  it("says how many were recalled, and how many had changed elsewhere", () => {
    expect(recallAllMessage({ recalled: 1, changed: 0, notSaved: false }, "A")).toBe("Recalled 1 patient at Demo Site A.");
    expect(recallAllMessage({ recalled: 3, changed: 1, notSaved: false }, "B")).toBe(
      "Recalled 3 patients at Demo Site B. 1 patient had already changed on another screen; check the list.",
    );
  });

  it("says plainly when nothing was saved", () => {
    expect(recallAllMessage({ recalled: 0, changed: 0, notSaved: true }, "A")).toContain("No one was recalled");
  });
});
