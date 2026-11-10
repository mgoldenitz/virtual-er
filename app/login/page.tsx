// The staff login screen. Patients never need it: they open their visit with the link or QR code.

import { Suspense } from "react";
import { LoginForm } from "@/components/staff/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Staff sign in</h1>
      <p>
        For emergency department staff using the demo. Patients do not need to sign in: open your visit with
        the link or QR code you were given.
      </p>
      {/* The form reads the web address (where to go next), so it loads just after the page. */}
      <Suspense fallback={<p>Loading the sign-in form…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
