// The dashboard screen, open only to signed-in staff (see proxy.ts). The numbers and the
// Real or Demo switch come from DashboardView; this page holds the frame, the header and the link back.

import Link from "next/link";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { StaffShell } from "@/components/staff/StaffShell";

export default function DashboardPage() {
  return (
    <StaffShell>
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <header className="glass-panel flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <SignOutButton />
      </header>
      <DashboardView />
      <Link href="/staff" className="inline-block min-h-11 py-2 font-semibold text-brand underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950">
        Back to the staff screen
      </Link>
    </main>
    </StaffShell>
  );
}
