import { describe, expect, it } from "vitest";
import { callerCheck } from "./callerCheck";

const staff = { app_metadata: { role: "staff" } };
const patient = { app_metadata: {} };

describe("caller check", () => {
  it("lets a staff account in", () => {
    expect(callerCheck(staff, null)).toBe("staff");
  });

  it("says not_staff for a good account without the staff role", () => {
    expect(callerCheck(patient, null)).toBe("not_staff");
  });

  it("says not_signed_in for a token Supabase refuses (expired or made up)", () => {
    expect(callerCheck(null, { status: 401 })).toBe("not_signed_in");
    expect(callerCheck(null, { status: 403 })).toBe("not_signed_in");
  });

  it("says not_signed_in when Supabase finds no user and gives no error", () => {
    expect(callerCheck(null, null)).toBe("not_signed_in");
  });

  it("says error for a fault in Supabase or the network, not a sign-in problem", () => {
    expect(callerCheck(null, { status: 500 })).toBe("error");
    expect(callerCheck(null, { status: 503 })).toBe("error");
    expect(callerCheck(null, {})).toBe("error");
  });
});
