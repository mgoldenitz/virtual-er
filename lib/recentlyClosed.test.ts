import { describe, expect, it } from "vitest";
import { closedLabel, recentlyClosed } from "./recentlyClosed";
import { callBack, checkInAtDesk, confirmUnableToReach, markArrived, markRemoved } from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const desk = (id: string, site: "A" | "B" = "A") =>
  checkInAtDesk({ id, code: id, access_token: id, site, ctas_level: 4, language: "en" }, "waiting", t0);

describe("recently closed list", () => {
  it("lists every arrived and removed visit at the site, newest first", () => {
    const visits = [
      markArrived(desk("a"), at(1))!,
      markRemoved(desk("b"), "left", at(3))!,
      markArrived(desk("c", "B"), at(4))!,
      desk("d"),
      checkInAtDesk({ id: "e", code: "e", access_token: "e", site: "A", ctas_level: 5, language: "en" }, "declined", at(5)),
      markRemoved(desk("f"), "no_show", at(2))!,
    ];
    expect(recentlyClosed(visits, "A").map((v) => v.id)).toEqual(["b", "f", "a"]);
  });

  it("describes how each visit was closed", () => {
    expect(closedLabel(markArrived(desk("a"), at(1))!)).toBe("marked arrived");
    expect(closedLabel(markRemoved(desk("a"), "left", at(1))!)).toBe("removed: left");
    expect(closedLabel(markRemoved(desk("a"), "no_show", at(1))!)).toBe("removed: no-show");
  });

  it("lists a visit confirmed unable to reach, so staff can reopen it", () => {
    const lost = confirmUnableToReach(callBack(desk("g"), at(1))!, at(31))!;
    expect(recentlyClosed([lost], "A").map((v) => v.id)).toEqual(["g"]);
    expect(closedLabel(lost)).toBe("confirmed unable to reach");
  });
});
