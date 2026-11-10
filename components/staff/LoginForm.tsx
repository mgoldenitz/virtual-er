"use client";

// The email and password form on the staff login screen. After signing in it checks the
// account is marked staff; an account that is not is signed straight out again.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/data/supabaseBrowser";
import { isStaffAccount, pageAfterSignIn, type StaffClaims } from "@/lib/staffAccess";
import { Button } from "@/components/Button";

const WRONG = "Email or password not recognised. Check them and try again.";
const NOT_STAFF = "This account is not a staff account, so it cannot open the staff screens.";
const NO_CONNECTION = "Could not reach the sign-in service. Check your internet connection and try again.";

const fieldStyle = "mt-2 block min-h-11 w-full rounded-lg border-2 border-slate-400 px-3";

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
    const supabase = supabaseBrowser();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setProblem(error.status && error.status < 500 ? WRONG : NO_CONNECTION);
        return;
      }
      const { data } = await supabase.auth.getClaims();
      if (!isStaffAccount((data?.claims ?? null) as StaffClaims)) {
        await supabase.auth.signOut();
        setProblem(NOT_STAFF);
        return;
      }
      setPassword("");
      router.replace(pageAfterSignIn(next));
      router.refresh();
    } catch {
      setProblem(NO_CONNECTION);
    } finally {
      setBusy(false);
    }
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
