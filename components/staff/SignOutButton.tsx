"use client";

// "Sign out" for the staff screens: ends the staff sign-in on this device and returns to login.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/data/supabaseBrowser";
import { Button } from "@/components/Button";

export function SignOutButton() {
  const router = useRouter();
  const [problem, setProblem] = useState("");

  async function signOut() {
    setProblem("");
    const { error } = await supabaseBrowser().auth.signOut();
    if (error) {
      setProblem("Could not sign out. Check your connection and try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={signOut}>
        Sign out
      </Button>
      {problem && (
        <p role="alert" className="text-sm font-semibold text-red-900">
          {problem}
        </p>
      )}
    </div>
  );
}
