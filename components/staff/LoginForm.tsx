"use client";

// The email and password form on the staff login screen. The sign-in itself, and the check
// that the account is marked staff, are in data/staffSignIn.ts.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signInStaff, type SignInResult } from "@/data/staffSignIn";
import { pageAfterSignIn } from "@/lib/staffAccess";
import { Button } from "@/components/Button";

const WRONG = "Email or password not recognised. Check them and try again.";
const NOT_STAFF = "This account is not a staff account, so it cannot open the staff screens.";
const NO_CONNECTION = "Could not reach the sign-in service. Check your internet connection and try again.";
const TOO_MANY = "Too many sign-in tries. Wait a few minutes, then try again.";

// The text staff see for each way a sign-in can fail.
const PROBLEM_TEXT: Record<Exclude<SignInResult, "signed_in">, string> = {
  wrong: WRONG,
  not_staff: NOT_STAFF,
  too_many: TOO_MANY,
  no_connection: NO_CONNECTION,
};

const fieldStyle = "mt-2 block min-h-11 w-full rounded-lg border-2 border-control px-3";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const notStaff = params.get("reason") === "not_staff";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(notStaff ? NOT_STAFF : "");

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    const result = await signInStaff(email, password);
    if (result === "signed_in") {
      setPassword("");
      router.replace(pageAfterSignIn(next));
      router.refresh();
    } else {
      setProblem(PROBLEM_TEXT[result]);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={signIn} className="space-y-4" aria-describedby={problem ? "login-problem" : undefined}>
      <label className="block">
        <span className="font-semibold">Email</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldStyle}
        />
      </label>
      <label className="block">
        <span className="font-semibold">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldStyle}
        />
      </label>
      <Button type="submit" disabled={busy} className="w-full text-lg">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      {problem && (
        <p id="login-problem" role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {problem}
        </p>
      )}
    </form>
  );
}
