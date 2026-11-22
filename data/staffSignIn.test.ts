// Checks the staff sign-in and sign-out results against fake Supabase answers.
// The Supabase connection is replaced, so no real account or network is used.

import { describe, expect, it, vi } from "vitest";
import { signInStaff, signOutStaff } from "./staffSignIn";
import { supabaseBrowser } from "./supabaseBrowser";

// Replace the real Supabase connection. Each test sets what its auth calls give back.
vi.mock("./supabaseBrowser", () => ({ supabaseBrowser: vi.fn() }));

type AuthAnswers = {
  signInWithPassword?: () => Promise<unknown>;
  getClaims?: () => Promise<unknown>;
  signOut?: () => Promise<unknown>;
};

// Sets the fake auth for this test. Calls that are not given an answer succeed.
function mockAuth(answers: AuthAnswers) {
  const auth = {
    signInWithPassword: vi.fn(answers.signInWithPassword ?? (async () => ({ data: { user: {} }, error: null }))),
    getClaims: vi.fn(
      answers.getClaims ??
        (async () => ({ data: { claims: { sub: "user-1", app_metadata: { role: "patient" } } }, error: null })),
    ),
    signOut: vi.fn(answers.signOut ?? (async () => ({ error: null }))),
  };
  vi.mocked(supabaseBrowser).mockReturnValue({ auth } as unknown as ReturnType<typeof supabaseBrowser>);
  return auth;
}

// A sign-in answer that Supabase gives for a failed sign-in, with the HTTP status.
function signInFailure(status: number) {
  return async () => ({ data: { user: null }, error: { message: "failed", status } });
}

describe("signInStaff", () => {
  it("gives too_many when the sign-in error status is 429", async () => {
    mockAuth({ signInWithPassword: signInFailure(429) });
    await expect(signInStaff("staff@example.test", "pw")).resolves.toBe("too_many");
  });

  it("gives wrong when the sign-in error status is 400", async () => {
    mockAuth({ signInWithPassword: signInFailure(400) });
    await expect(signInStaff("staff@example.test", "pw")).resolves.toBe("wrong");
  });

  it("gives no_connection and signs out when the claims check returns an error", async () => {
    const auth = mockAuth({
      getClaims: async () => ({ data: null, error: new Error("claims check failed") }),
    });
    await expect(signInStaff("staff@example.test", "pw")).resolves.toBe("no_connection");
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("gives not_staff when the account is not marked staff", async () => {
    mockAuth({
      getClaims: async () => ({ data: { claims: { sub: "user-2", app_metadata: { role: "patient" } } }, error: null }),
    });
    await expect(signInStaff("patient@example.test", "pw")).resolves.toBe("not_staff");
  });

  it("gives no_connection and clears this device when the claims check throws", async () => {
    const auth = mockAuth({
      getClaims: async () => {
        throw new Error("network down");
      },
    });
    await expect(signInStaff("staff@example.test", "pw")).resolves.toBe("no_connection");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears this device only when the claims check returns an error", async () => {
    const auth = mockAuth({
      getClaims: async () => ({ data: null, error: new Error("claims check failed") }),
    });
    await signInStaff("staff@example.test", "pw");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("still gives not_staff when the sign-out after it throws", async () => {
    mockAuth({
      getClaims: async () => ({ data: { claims: { sub: "user-2", app_metadata: { role: "patient" } } }, error: null }),
      signOut: async () => {
        throw new Error("network down");
      },
    });
    await expect(signInStaff("patient@example.test", "pw")).resolves.toBe("not_staff");
  });
});

describe("signOutStaff", () => {
  it("resolves to false when signOut throws", async () => {
    mockAuth({
      signOut: async () => {
        throw new Error("network down");
      },
    });
    await expect(signOutStaff()).resolves.toBe(false);
  });

  it("resolves to true when signOut gives no error", async () => {
    mockAuth({ signOut: async () => ({ error: null }) });
    await expect(signOutStaff()).resolves.toBe(true);
  });
});
