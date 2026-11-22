// Checks which sign-in result a Supabase error status gives: a wrong password, too many tries, or no connection.

import { describe, expect, it } from "vitest";
import { signInErrorResult } from "./signInError";

describe("signInErrorResult", () => {
  it("gives wrong for a bad password or account status", () => {
    expect(signInErrorResult(400)).toBe("wrong");
    expect(signInErrorResult(401)).toBe("wrong");
    expect(signInErrorResult(422)).toBe("wrong");
  });

  it("gives too_many for status 429 (too many tries)", () => {
    expect(signInErrorResult(429)).toBe("too_many");
  });

  it("gives no_connection for status 408 (time-out)", () => {
    expect(signInErrorResult(408)).toBe("no_connection");
  });

  it("gives no_connection for server errors", () => {
    expect(signInErrorResult(500)).toBe("no_connection");
    expect(signInErrorResult(503)).toBe("no_connection");
  });

  it("gives no_connection when there is no status", () => {
    expect(signInErrorResult(undefined)).toBe("no_connection");
  });
});
