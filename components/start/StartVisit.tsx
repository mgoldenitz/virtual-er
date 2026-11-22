"use client";

// The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
// this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
// has a visit, it shows that one first (open, ended or expired), and never offers a new one
// while the saved visit cannot be read. While staff have paused off-site waiting at a site,
// "Start a visit" for that site is replaced by the SPEC's paused message.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
import { loadSavedToken } from "@/data/savedToken";
import { useSitePauses } from "@/data/sitePauses";
import { startPageState } from "@/lib/startPage";
import { startProblemShows } from "@/lib/startProblem";
import { fill, textFor } from "@/lib/text";
import type { Site } from "@/lib/visit";
import { Button } from "@/components/Button";

const noSubscribe = () => () => {};

const openLinkStyle =
  "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong active:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink";
const boxStyle = "clean-card space-y-3";

export function StartVisit({ language }: { language: string }) {
  const router = useRouter();
  const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
  const saved = usePatientView(savedToken);
  const [site, setSite] = useState<Site>("A");
  const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
  const [starting, setStarting] = useState(false);
  const [wantsNew, setWantsNew] = useState(false);
  const startHeading = useRef<HTMLHeadingElement>(null);
  // Move focus to the form heading when "Start a new demo visit" opens the form, so keyboard and
  // screen-reader users keep their place instead of falling back to the top of the page.
  useEffect(() => {
    if (wantsNew) startHeading.current?.focus();
  }, [wantsNew]);
  const { pauses } = useSitePauses();
  const sitePaused = pauses?.[site] === true;
  // Screen readers hear the paused message once when the chosen site becomes paused (live, or
  // by choosing a paused site). The region below stays in place, so the words are read.
  const [announced, setAnnounced] = useState("");
  const [wasPaused, setWasPaused] = useState<boolean | null>(null);
  if (pauses && sitePaused !== wasPaused) {
    setWasPaused(sitePaused);
    setAnnounced(wasPaused === false && sitePaused ? `${fill(textFor(language).siteName, { site })}: ${textFor(language).start.paused}` : "");
  }
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
        <h2 id="start-heading" className="text-2xl font-bold">
          {s.unavailableHeading}
        </h2>
        <p>{s.unavailableText}</p>
      </section>
    );
  }

  if (saved && typeof saved === "object" && state === "open") {
    return (
      <section aria-labelledby="start-heading" className={boxStyle}>
        <h2 id="start-heading" className="text-2xl font-bold">
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
        <h2 id="saved-heading" className="text-2xl font-bold">
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

  const announcer = (
    <p role="status" className="sr-only">
      {announced}
    </p>
  );

  // Both sites paused: no start box at all, only the message (the start route refuses anyway).
  // The announcer comes first in both this and the start box, so it is the same element in both.
  if (pauses?.A && pauses?.B) {
    return (
      <>
        {announcer}
        <section aria-labelledby="start-heading" className={boxStyle} data-testid="start-paused">
          <h2 id="start-heading" ref={startHeading} tabIndex={-1} className="text-2xl font-bold">
            {t.pausedHeading}
          </h2>
          <p>{s.paused}</p>
        </section>
      </>
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
    <>
      {announcer}
      <section aria-labelledby="start-heading" className="clean-card space-y-4">
        <h2 id="start-heading" ref={startHeading} tabIndex={-1} className="text-2xl font-bold">
          {s.startHeading}
        </h2>
        <p>{s.startIntro}</p>
        {/* Locked while a start saves, so a failed start's alert never shows under the other site. */}
        <fieldset disabled={starting}>
          <legend className="font-semibold">{s.siteQuestion}</legend>
          {/* Each site is a card; the chosen one turns pale blue with a blue border. */}
          <div className="mt-2 flex flex-wrap gap-3">
            {(["A", "B"] as const).map((option) => (
              <label
                key={option}
                className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border-2 border-control bg-card px-4 font-semibold has-checked:border-brand has-checked:bg-band"
              >
                <input
                  type="radio"
                  name="site"
                  className="size-5 shrink-0"
                  checked={site === option}
                  onChange={() => {
                    setSite(option);
                    setProblem(null); // a problem with one site does not carry over to the other
                  }}
                />
                {fill(t.siteName, { site: option })}
              </label>
            ))}
          </div>
        </fieldset>
        {sitePaused ? (
          <p className="rounded-xl border-2 border-alert-edge bg-stop-tint p-3 font-semibold text-stop-ink" data-testid="site-paused">
            {s.paused}
          </p>
        ) : (
          <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
            {starting ? s.starting : s.startButton}
          </Button>
        )}
        {problem && startProblemShows(problem, sitePaused) && (
          <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
            {problemText[problem]}
          </p>
        )}
      </section>
    </>
  );
}
