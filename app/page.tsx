// The start page. For now it only holds the safety lines and demo links;
// the full start page (other care options, "Start a visit") comes after the core loop.

import Link from "next/link";
import { EmergencyLine } from "@/components/EmergencyLine";

const linkStyle =
  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-amber-500";

export default function StartPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Virtual Waiting Room</h1>
      <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
        Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call
        911 now.
      </p>
      <EmergencyLine />
      <nav aria-label="Demo screens" className="flex flex-wrap gap-3">
        <Link href="/staff" className={linkStyle}>
          Staff screen
        </Link>
        <Link href="/patient" className={linkStyle}>
          Patient screen
        </Link>
      </nav>
    </main>
  );
}
