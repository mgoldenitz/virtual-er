"use client";

// The start page's "Start a visit": choose a demo site and a language. The visit is saved on
// this phone, so the patient never types a code. If this phone already has a visit, it shows
// that one first (open, ended or expired), and never offers a new one when storage cannot be read.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { startVisitFromHome, usePatientView } from "@/data/patientVisit";
import { loadSavedToken } from "@/data/savedToken";
import { startPageState } from "@/lib/startPage";
import type { Site } from "@/lib/visit";
import { Button } from "@/components/Button";

const noSubscribe = () => () => {};

const openLinkStyle =
  "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
const boxStyle = "clean-card space-y-3";

// What the start page says about a visit already saved on this phone, before any new one.
const SAVED_NOTE = {
  closed: {
    heading: "Your last visit on this phone",
    text: "Off-site waiting has ended for this visit. You may still be waiting in the emergency department: open your visit to see its status.",
  },
  expired: {
    heading: "Your visit request on this phone has expired",
    text: "It was started more than 6 hours ago and was never checked in at triage, so staff no longer expect it.",
  },
};

export function StartVisit() {
  const router = useRouter();
  const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
  const saved = usePatientView(savedToken);
  const [site, setSite] = useState<Site>("A");
  const [language, setLanguage] = useState("en");
  const [problem, setProblem] = useState("");
  const [wantsNew, setWantsNew] = useState(false);
  const state = startPageState(saved);

  if (state === "loading") {
    return <p>Checking this phone for a saved visit…</p>;
  }

  if (state === "unavailable") {
    return (
      <section aria-labelledby="start-heading" className={boxStyle}>
        <h2 id="start-heading" className="text-xl font-bold">
          We cannot read the visit saved on this phone
        </h2>
        <p>
          This browser cannot load or save visits right now, so a new visit could not be saved either. If you
          need care, go to the emergency department and follow its normal arrival and triage steps.
        </p>
      </section>
    );
  }

  if (saved && typeof saved === "object" && state === "open") {
    return (
      <section aria-labelledby="start-heading" className={boxStyle}>
        <h2 id="start-heading" className="text-xl font-bold">
          You have a visit on this phone
        </h2>
        <p>
          Visit code <strong className="font-mono tracking-widest">{saved.code}</strong> · Demo Site{" "}
          {saved.site}
        </p>
        <Link href="/patient" className={openLinkStyle}>
          Open your visit
        </Link>
      </section>
    );
  }

  // An ended or expired visit is shown first; starting another demo visit is a separate choice.
  const savedNote =
    saved && typeof saved === "object" && (state === "closed" || state === "expired") ? (
      <section aria-labelledby="saved-heading" className={boxStyle}>
        <h2 id="saved-heading" className="text-xl font-bold">
          {SAVED_NOTE[state].heading}
        </h2>
        <p>
          Visit code <strong className="font-mono tracking-widest">{saved.code}</strong> · Demo Site{" "}
          {saved.site}
        </p>
        <p>{SAVED_NOTE[state].text}</p>
        <Link href="/patient" className={openLinkStyle}>
          Open your visit
        </Link>
      </section>
    ) : null;

  if (savedNote && !wantsNew) {
    return (
      <div className="space-y-4">
        {savedNote}
        <Button variant="secondary" onClick={() => setWantsNew(true)}>
          Start a new demo visit instead
        </Button>
      </div>
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
    <section aria-labelledby="start-heading" className="clean-card space-y-4">
      <h2 id="start-heading" className="text-xl font-bold">
        Start a visit
      </h2>
      <p>
        Starting a visit here does not hold a place in line. Your place in line starts when a nurse sees you
        at triage. The most urgent patients are always seen first.
      </p>
      <fieldset>
        <legend className="font-semibold">Which emergency department are you going to?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {(["A", "B"] as const).map((s) => (
            <label
              key={s}
              className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
            >
              <input
                type="radio"
                name="site"
                className="size-5"
                checked={site === s}
                onChange={() => setSite(s)}
              />
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
          className="mt-2 block min-h-11 rounded-lg border-2 border-control px-3"
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
