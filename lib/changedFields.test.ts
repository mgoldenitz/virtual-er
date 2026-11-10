import { describe, expect, it } from "vitest";
import { changedFields } from "./changedFields";
import type { Visit } from "./visit";
import { callBack, checkInAtDesk, markArrived, markRemoved, undoClose } from "./visitActions";

const now = new Date("2026-11-10T20:00:00Z");
const later = new Date("2026-11-10T20:30:00Z");
const waiting = checkInAtDesk(
  { id: "1", code: "ABC234", access_token: "TOKEN", site: "A", ctas_level: 5, language: "en" },
  "waiting",
  now,
);

describe("changed fields", () => {
  it("is empty when nothing changed", () => {
    expect(changedFields(waiting, { ...waiting })).toEqual({});
  });

  it("holds only the status and time for a call-back", () => {
    expect(changedFields(waiting, callBack(waiting, later)!)).toEqual({
      status: "called",
      called_at: later.toISOString(),
    });
  });

  it("holds the reason and closing time for a removal", () => {
    expect(changedFields(waiting, markRemoved(waiting, "no_show", later)!)).toEqual({
      status: "removed",
      removed_reason: "no_show",
      closed_at: later.toISOString(),
    });
  });

  it("sends a cleared field as null, so Undo empties it in the database", () => {
    const arrived = markArrived(waiting, later)!;
    expect(changedFields(arrived, undoClose(arrived, arrived)!)).toEqual({
      status: "waiting",
      arrived_at: null,
      closed_at: null,
    });
  });

  it("never sends the id, the creation time or the version", () => {
    const after = { ...waiting, id: "2", created_at: later.toISOString(), version: 9, status: "called" } as Visit;
    expect(changedFields(waiting, after)).toEqual({ status: "called" });
  });
});
