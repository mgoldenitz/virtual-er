import { describe, expect, it } from "vitest";
import { alertIdsFor, alertsToSend, MAX_ALERT_IDS, parseRecallAlertBody, recallAlertText, type RecallAlertRow } from "./recallAlert";

const now = new Date("2026-11-19T15:00:00Z");
const ID = "0b9f3c1e-2a4d-4f6b-8c7e-1d2a3b4c5d6e";

function row(extra: Partial<RecallAlertRow> = {}): RecallAlertRow {
  return {
    id: ID,
    code: "ABC234",
    site: "A",
    status: "called",
    called_at: "2026-11-19T14:59:30Z",
    is_demo: false,
    ...extra,
  };
}

describe("recall alert body", () => {
  it("accepts 1 to 50 visit ids and removes repeats", () => {
    expect(parseRecallAlertBody({ ids: [ID, ID] })).toEqual({ ids: [ID] });
    expect(parseRecallAlertBody({ ids: Array(50).fill(ID) })).toEqual({ ids: [ID] });
  });

  it("refuses no ids, more than 50 ids, an id that is not a uuid, and a body that is not an object", () => {
    expect(parseRecallAlertBody({ ids: [] })).toBeNull();
    expect(parseRecallAlertBody({})).toBeNull();
    expect(parseRecallAlertBody({ ids: Array(51).fill(ID) })).toBeNull();
    expect(parseRecallAlertBody({ ids: ["ABC234"] })).toBeNull();
    expect(parseRecallAlertBody({ ids: [42] })).toBeNull();
    expect(parseRecallAlertBody(null)).toBeNull();
    expect(parseRecallAlertBody("ids")).toBeNull();
  });
});

describe("which recalls send an alert", () => {
  it("sends for a real visit called in the last 2 minutes", () => {
    expect(alertsToSend([row()], now)).toHaveLength(1);
    expect(alertsToSend([row({ called_at: "2026-11-19T14:58:00Z" })], now)).toHaveLength(1);
  });

  it("never sends for a demo visit, because the simulator calls them back all day", () => {
    expect(alertsToSend([row({ is_demo: true })], now)).toEqual([]);
  });

  it("sends nothing for a visit that is not called, or was called more than 2 minutes ago", () => {
    expect(alertsToSend([row({ status: "waiting" })], now)).toEqual([]);
    expect(alertsToSend([row({ status: "on_the_way" })], now)).toEqual([]);
    expect(alertsToSend([row({ called_at: null })], now)).toEqual([]);
    expect(alertsToSend([row({ called_at: "2026-11-19T14:57:00Z" })], now)).toEqual([]);
  });
});

describe("recall alert text", () => {
  it("names the code and the site for one visit", () => {
    expect(recallAlertText([row()])).toBe("Visit ABC234 is called back to Demo Site A.");
  });

  it("gives the count and each code with its site for many visits", () => {
    const rows = [row(), row({ code: "DEF567" }), row({ code: "GHJ892", site: "B" })];
    expect(recallAlertText(rows)).toBe(
      "3 visits are called back: ABC234 (Demo Site A), DEF567 (Demo Site A), GHJ892 (Demo Site B).",
    );
  });

  it("is empty when there is nothing to send", () => {
    expect(recallAlertText([])).toBe("");
  });

  it("never carries the visit id (the same rule keeps the token out: the row has no token)", () => {
    expect(recallAlertText([row(), row({ code: "DEF567" })])).not.toContain(ID);
  });
});

describe("alertIdsFor", () => {
  it("leaves out demo visits", () => {
    const visits = [
      { id: "real-1", is_demo: false },
      { id: "demo-1", is_demo: true },
      { id: "real-2", is_demo: false },
    ];
    expect(alertIdsFor(visits)).toEqual(["real-1", "real-2"]);
  });

  it("gives an empty list when all visits are demo visits", () => {
    expect(alertIdsFor([{ id: "demo-1", is_demo: true }])).toEqual([]);
  });

  it("gives at most 50 ids, so the route does not refuse the request", () => {
    const visits = Array.from({ length: 60 }, (_, i) => ({ id: `real-${i}`, is_demo: false }));
    expect(alertIdsFor(visits)).toHaveLength(MAX_ALERT_IDS);
  });
});
