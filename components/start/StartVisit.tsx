"use client";

// The start page's "Start a visit": choose a demo site and a language. The visit is saved on
// this phone, so the patient never types a code. If this phone already has an open visit,
// it offers to open that one instead of starting a second.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { startVisitFromHome, usePatientView } from "@/data/patientVisit";
import { loadSavedToken } from "@/data/savedToken";
import type { Site } from "@/lib/visit";
import { Button } from "@/components/Button";

const noSubscribe = () => () => {};

export function StartVisit() {
  const router = useRouter();
  const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
  const saved = usePatientView(savedToken);
  const [site, setSite] = useState<Site>("A");
  const [language, setLanguage] = useState("en");
  const [problem, setProblem] = useState("");

  if (saved && saved !== "unavailable" && !saved.closed) {
    return (
      <section aria-labelledby="start-heading" className="space-y-3 rounded-xl border-2 border-slate-400 p-4">
        <h2 id="start-heading" className="text-xl font-bold">
          You have a visit on this phone
        </h2>
        <p>
          Visit code <strong className="font-mono tracking-widest">{saved.code}</strong> · Demo Site {saved.site}
        </p>
        <Link
          href="/patient"
          className="inline-block min-h-11 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          Open your visit
        </Link>
      </section>
    );
  }

  const start = () => {
    const token = startVisitFromHome(site, language);
    if (!token) {
      setProblem("Your visit was not saved. Please try again, or go to the emergency department desk.");
      return;
    }
    router.push("/patient");
  };

  return (
    <section aria-labelledby="start-heading" className="space-y-4 rounded-xl border-2 border-slate-400 p-4">
      <h2 id="start-heading" className="text-xl font-bold">
        Start a visit
      </h2>
      <p>
        Starting a visit here does not hold a place in line. Your place in line starts when a nurse sees
        you at triage. The most urgent patients are always seen first.
      </p>
      <fieldset>
        <legend className="font-semibold">Which emergency department are you going to?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {(["A", "B"] as const).map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-slate-400 px-4">
              <input type="radio" name="site" className="size-5" checked={site === s} onChange={() => setSite(s)} />
              Demo Site {s}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Language</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-2 block min-h-11 rounded-lg border-2 border-slate-400 px-3"
        >
          <option value="en">English</option>
        </select>
        <span className="mt-1 block text-sm text-slate-700">Two more languages come in Phase 3.</span>
      </label>
      <Button onClick={start} className="w-full text-lg">
        Start a visit
      </Button>
      {problem && (
        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {problem}
        </p>
      )}
    </section>
  );
}
