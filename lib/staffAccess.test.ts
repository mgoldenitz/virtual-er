// Tests for who may open the staff screens, and where staff go after signing in.

import { describe, expect, it } from "vitest";
import { isStaffPath, pageAfterSignIn, staffAccess } from "./staffAccess";

const staff = { app_metadata: { role: "staff" } };
const notStaff = { app_metadata: { provider: "email" } };

describe("staffAccess", () => {
  it("lets anyone open patient pages and the login page", () => {
    for (const path of ["/", "/patient", "/login"]) {
      expect(staffAccess(path, null)).toBe("allow");
    }
  });

  it("sends a visitor who is not signed in to sign in", () => {
    expect(staffAccess("/staff", null)).toBe("sign_in");
    expect(staffAccess("/dashboard", undefined)).toBe("sign_in");
  });

  it("refuses a signed-in account that is not marked staff", () => {
    expect(staffAccess("/staff", notStaff)).toBe("not_staff");
    expect(staffAccess("/staff", {})).toBe("not_staff");
    expect(staffAccess("/staff", { app_metadata: { role: "Staff" } })).toBe("not_staff");
  });

  it("lets a staff account in", () => {
    expect(staffAccess("/staff", staff)).toBe("allow");
    expect(staffAccess("/dashboard", staff)).toBe("allow");
  });

  it("covers pages under the staff screens but not look-alike names", () => {
    expect(isStaffPath("/staff/settings")).toBe(true);
    expect(isStaffPath("/staffroom")).toBe(false);
    expect(isStaffPath("/dashboards")).toBe(false);
  });
});

describe("pageAfterSignIn", () => {
  it("returns to the staff page that was asked for", () => {
    expect(pageAfterSignIn("/dashboard")).toBe("/dashboard");
    expect(pageAfterSignIn("/staff")).toBe("/staff");
  });

  it("goes to /staff for anything else, including other sites", () => {
    for (const next of [null, undefined, "", "/patient", "https://elsewhere.example", "//elsewhere.example", "/staffroom"]) {
      expect(pageAfterSignIn(next)).toBe("/staff");
    }
  });
});
