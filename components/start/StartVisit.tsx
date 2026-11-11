"use client";

// The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
// this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
// has a visit, it shows that one first (open, ended or expired), and never offers a new one
// while the saved visit cannot be read.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
import { loadSavedToken } from "@/data/savedToken";
import { startPageState } from "@/lib/startPage";
import { fill, textFor } from "@/lib/text";
import type { Site } from "@/lib/visit";
import { Button } from "@/components/Button";

const noSubscribe = () => () => {};

const openLinkStyle =
  "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
const boxStyle = "clean-card space-y-3";

export function StartVisit({ language }: { language: string }) {
  const router = useRouter();
  const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
  const saved = usePatientView(savedToken);
  const [site, setSite] = useState<Site>("A");
  const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
  const [starting, setStarting] = useState(false);
  const [wantsNew, setWantsNew] = useState(false);
  const state = startPageState(saved);
  const t = textFor(language);
  const s = t.start;

  // What the patient is told when a visit could not be started.
  const problemText = { paused: s.paused, busy: s.busy, not_saved: s.notSaved };
  // What the start page says about a visit already saved on this phone, before any new one.
  const savedNote = {
    closed: { heading: s.closedHeading, text: s.closedText },
    expired: { heading: s.expiredHeading, text: t.expiredText },
  };

  if (state === "loading") {
    return <p>{s.checkingSaved}</p>;
  }

  if (state === "unavailable") {
    return (
      <section aria-labelledby="start-heading" className={boxStyle}>
        <h2 id="start-heading" className="text-xl font-bold">
          {s.unavailableHeading}
        </h2>
        <p>{s.unavailableText}</p>
      </section>
    );
  }

  if (saved && typeof saved === "object" && state === "open") {
    return (
      <section aria-labelledby="start-heading" className={boxStyle}>
        <h2 id="start-heading" className="text-xl font-bold">
          {s.openHeading}
        </h2>
        <p>
          {t.visitCode}{" "}
          <bdi>
            <strong className="font-mono tracking-widest">{saved.code}</strong>
          </bdi>{" "}
          · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
        </p>
        <Link href="/patient" className={openLinkStyle}>
          {s.openVisit}
        </Link>
      </section>
    );
  }

  // An ended or expired visit is shown first; starting another demo visit is a separate choice.
  const savedBox =
    saved && typeof saved === "object" && (state === "closed" || state === "expired") ? (
      <section aria-labelledby="saved-heading" className={boxStyle}>
        <h2 id="saved-heading" className="text-xl font-bold">
          {savedNote[state].heading}
        </h2>
        <p>
          {t.visitCode}{" "}
          <bdi>
            <strong className="font-mono tracking-widest">{saved.code}</strong>
          </bdi>{" "}
          · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
        </p>
        <p>{savedNote[state].text}</p>
        <Link href="/patient" className={openLinkStyle}>
          {s.openVisit}
        </Link>
      </section>
    ) : null;

  if (savedBox && !wantsNew) {
    return (
      <div className="space-y-4">
        {savedBox}
        <Button variant="secondary" onClick={() => setWantsNew(true)}>
          {s.startNew}
        </Button>
      </div>
    );
  }

  const start = async () => {
    if (starting) return; // a second tap while the first is on its way must not start two visits
    setStarting(true);
    setProblem(null);
    const result = await startVisitFromHome(site, language);
    if (result === "saved") {
      router.push("/patient");
      return; // stays "Starting…" until the patient screen opens
    }
    setStarting(false);
    setProblem(result);
  };

  return (
    <section aria-labelledby="start-heading" className="clean-card space-y-4">
      <h2 id="start-heading" className="text-xl font-bold">
        {s.startHeading}
      </h2>
      <p>{s.startIntro}</p>
      <fieldset>
        <legend className="font-semibold">{s.siteQuestion}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {(["A", "B"] as const).map((option) => (
            <label
              key={option}
              className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
            >
              <input
                type="radio"
                name="site"
                className="size-5"
                checked={site === option}
                onChange={() => setSite(option)}
              />
              {fill(t.siteName, { site: option })}
            </label>
          ))}
        </div>
      </fieldset>
      <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
        {starting ? s.starting : s.startButton}
      </Button>
      {problem && (
        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {problemText[problem]}
        </p>
      )}
    </section>
  );
}
