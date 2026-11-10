// The start page, on the patient's own phone at home or in the waiting room (no login):
// the emergency check first, other care options, THP's wait-time link, then "Start a visit".

import Link from "next/link";
import { EmergencyLine } from "@/components/EmergencyLine";
import { CareOptions } from "@/components/start/CareOptions";
import { StartVisit } from "@/components/start/StartVisit";

const linkStyle =
  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";

export default function StartPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Virtual Waiting Room</h1>
      <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
        Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call
        911 now.
      </p>
      <CareOptions />
      <StartVisit />
      <EmergencyLine />
      <nav aria-label="Demo screens" className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
        <Link href="/staff" className={linkStyle}>
          Staff screen
        </Link>
        <Link href="/patient" className={linkStyle}>
          Patient screen
        </Link>
        <Link href="/dashboard" className={linkStyle}>
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
