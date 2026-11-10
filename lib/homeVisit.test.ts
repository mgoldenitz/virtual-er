import { describe, expect, it } from "vitest";
import { normalizeDisplayCode } from "./codes";
import { expectedArrivals, isExpected } from "./expectedArrivals";
import { placeInLine } from "./queue";
import { checkInAtDesk, checkInHomeVisit, startFromHome } from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const home = (id: string, min = 0, site: "A" | "B" = "A") =>
  startFromHome({ id, code: id.toUpperCase(), access_token: id, site, language: "en" }, at(min));

describe("starting a visit from home", () => {
  it("is pre_arrival from home, with no triage, CTAS or place in line", () => {
    const v = home("h1");
    expect(v.source).toBe("home");
    expect(v.status).toBe("pre_arrival");
    expect(v.triaged_at).toBeNull();
    expect(v.ctas_level).toBeNull();
    expect(v.closed_at).toBeNull();
    expect(placeInLine([v], v)).toBeNull();
  });

  it("joins the line at triage time, behind a desk patient triaged earlier", () => {
    const desk = checkInAtDesk(
      { id: "d1", code: "D1", access_token: "d1", site: "A", ctas_level: 5, language: "en" },
      "waiting",
      at(30),
    );
    const v = checkInHomeVisit(home("h1", 0), { ctas_level: 4, language: "en" }, "waiting", at(40))!;
    expect(v.status).toBe("waiting");
    expect(v.source).toBe("home");
    expect(v.triaged_at).toBe(at(40).toISOString());
    expect(v.offered_at).toBe(at(40).toISOString());
    expect(v.ctas_level).toBe(4);
    expect(placeInLine([desk, v], v)).toBe(2);
  });

  it("records declined and not eligible as closed, and refuses a second check-in", () => {
    const declined = checkInHomeVisit(home("h1"), { ctas_level: 5, language: "en" }, "declined", at(5))!;
    expect(declined.status).toBe("declined");
    expect(declined.closed_at).toBe(at(5).toISOString());
    const notEligible = checkInHomeVisit(home("h2"), { ctas_level: 5, language: "en" }, "not_eligible", at(5))!;
    expect(notEligible.status).toBe("not_eligible");
    expect(notEligible.offered_at).toBeNull();
    expect(checkInHomeVisit(declined, { ctas_level: 5, language: "en" }, "waiting", at(6))).toBeNull();
  });

  it("refuses to check in a home visit that expired after 6 hours", () => {
    expect(checkInHomeVisit(home("h1", 0), { ctas_level: 5, language: "en" }, "waiting", at(360))).toBeNull();
    expect(checkInHomeVisit(home("h1", 0), { ctas_level: 5, language: "en" }, "waiting", at(359))).not.toBeNull();
  });
});

describe("expected arrivals", () => {
  it("lists untriaged home visits at the site, oldest first, for 6 hours", () => {
    const triaged = checkInHomeVisit(home("t", 1), { ctas_level: 4, language: "en" }, "waiting", at(2))!;
    const visits = [home("b", 20), home("a", 10), home("other", 5, "B"), triaged, home("old", -400)];
    expect(expectedArrivals(visits, "A", at(30)).map((v) => v.id)).toEqual(["a", "b"]);
    expect(isExpected(home("x", 0), at(359))).toBe(true);
    expect(isExpected(home("x", 0), at(360))).toBe(false);
  });
});

describe("typed display codes", () => {
  it("ignores spaces, hyphens and case", () => {
    expect(normalizeDisplayCode(" abc-234 ")).toBe("ABC234");
  });
});
