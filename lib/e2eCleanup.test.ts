import { describe, expect, it } from "vitest";
import { cleanCodes, cleanupSql, countSql } from "./e2eCleanup";

describe("cleanCodes", () => {
  it("keeps 6-character codes from the code alphabet", () => {
    expect(cleanCodes(["ABC234", "XYZ789"])).toEqual(["ABC234", "XYZ789"]);
  });

  it("removes repeats and keeps the first order", () => {
    expect(cleanCodes(["XYZ789", "ABC234", "XYZ789"])).toEqual(["XYZ789", "ABC234"]);
  });

  it("drops codes with the wrong length", () => {
    expect(cleanCodes(["ABC23", "ABC2345", ""])).toEqual([]);
  });

  it("drops characters that are not in the code alphabet", () => {
    // O, 0, I, 1 and L are left out of CODE_ALPHABET; lower case is not in it either.
    expect(cleanCodes(["ABCDE0", "ABCDEO", "ABCDE1", "ABCDEI", "ABCDEL", "abc234"])).toEqual([]);
  });

  it("drops anything that could change the SQL", () => {
    expect(cleanCodes(["AB'C23", "ABC 23", "ABC;23", " ABC234", "ABC234\n"])).toEqual([]);
  });
});

describe("cleanupSql", () => {
  it("makes one delete line for the good codes", () => {
    expect(cleanupSql(["ABC234", "bad", "XYZ789", "ABC234"])).toBe(
      "delete from public.visits where code in ('ABC234', 'XYZ789');",
    );
  });

  it("gives no line when no code is left", () => {
    expect(cleanupSql([])).toBeNull();
    expect(cleanupSql(["x'); drop table visits; --"])).toBeNull();
  });
});

describe("countSql", () => {
  it("makes the count line for the same codes", () => {
    expect(countSql(["ABC234", "XYZ789"])).toBe(
      "select count(*) from public.visits where code in ('ABC234', 'XYZ789');",
    );
  });

  it("gives no line when no code is left", () => {
    expect(countSql(["", "nope"])).toBeNull();
  });
});
