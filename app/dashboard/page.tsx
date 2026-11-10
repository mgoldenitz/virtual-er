// The dashboard screen: a placeholder, open only to signed-in staff (see proxy.ts).
// The numbers, their definitions and demo mode come in Phase 4.

import Link from "next/link";
import { SignOutButton } from "@/components/staff/SignOutButton";

const COMING = [
  "Patients waiting off-site now, and patients called but not yet arrived",
  "Eligible patients offered the option (percentage), and how many declined",
  "Average minutes from call-back to arrival",
  "No-shows and patients marked unable to reach",
  "Visits started from home, and how many of those arrived at triage",
  "Survey: number of responses, average score, and share scoring 9 or 10",
];

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <SignOutButton />
      </header>
      <p className="rounded-lg bg-amber-50 p-3 text-amber-950">
        Placeholder: no numbers are shown yet; they come in Phase 4.
      </p>
      <section aria-labelledby="coming-heading" className="space-y-2">
        <h2 id="coming-heading" className="text-xl font-bold">
          Numbers this page will show for the current day
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          {COMING.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <Link href="/staff" className="inline-block min-h-11 py-2 font-semibold text-blue-900 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950">
        Back to the staff screen
      </Link>
    </main>
  );
}
