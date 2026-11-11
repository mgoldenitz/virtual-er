"use client";

// The main part of the patient screen, which changes with the visit's status:
// Waiting, Please head back now, Ready at the desk, and the states before and after those.

import Link from "next/link";
import type { PatientView } from "@/lib/patientView";
import { fill, textFor, type PatientText } from "@/lib/text";
import { Button } from "@/components/Button";

type Props = { view: PatientView; language: string; onOnMyWay: () => void; sending: boolean };

function Waiting({ view, t }: { view: PatientView; t: PatientText }) {
  const p = t.patient;
  return (
    <section aria-labelledby="status-heading" className="clean-card space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {p.waitingHeading}
      </h2>
      <p className="text-lg">
        {p.placeInLine} <strong className="text-3xl">{view.placeInLine}</strong>
      </p>
      <p className="text-base">{p.placeCanChange}</p>
      <p className="text-lg">
        {p.waitLabel}{" "}
        <strong>{view.waitLow !== null && view.waitHigh !== null && fill(p.waitRange, { low: view.waitLow, high: view.waitHigh })}</strong>
      </p>
      <p className="text-sm text-slate-700">{p.simulated}</p>
    </section>
  );
}

function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
  const p = t.patient;
  const confirmed = view.status === "on_the_way";
  return (
    <section
      aria-labelledby="status-heading"
      className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
    >
      <h2 id="status-heading" className="text-2xl font-bold text-green-950">
        {p.calledHeading}
      </h2>
      <p className="text-lg">{p.calledText}</p>
      {confirmed ? (
        <p className="text-lg font-semibold" data-testid="confirmed">
          {p.confirmed}
        </p>
      ) : (
        <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
          {sending ? p.sending : p.onMyWay}
        </Button>
      )}
      <p className="text-sm text-slate-800">{p.alertLimits}</p>
    </section>
  );
}

/** Heading and paragraphs for every status that has no place-in-line or call-back screen. */
function otherStatus(status: PatientView["status"], t: PatientText): { heading: string; text: string[] } {
  const p = t.patient;
  switch (status) {
    case "pre_arrival":
      return { heading: p.fromHomeHeading, text: p.fromHomeText };
    case "needs_reassessment":
      return { heading: p.reassessHeading, text: [p.reassessText] };
    case "arrived":
      return { heading: p.arrivedHeading, text: [p.arrivedText] };
    case "declined":
    case "not_eligible":
      return { heading: p.onsiteHeading, text: [p.onsiteText] };
    case "unable_to_reach":
      return { heading: p.endedHeading, text: [p.unableText] };
    case "removed":
      return { heading: p.endedHeading, text: [p.removedText] };
    default:
      return { heading: p.endedHeading, text: [p.endedText] };
  }
}

function OtherStatus({ view, t }: { view: PatientView; t: PatientText }) {
  const { heading, text } = otherStatus(view.status, t);
  return (
    <section aria-labelledby="status-heading" className="clean-card space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {heading}
      </h2>
      {text.map((paragraph) => (
        <p key={paragraph} className="text-lg">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

// A visit started from home that was never triaged within 6 hours: staff no longer expect it.
function Expired({ t }: { t: PatientText }) {
  const p = t.patient;
  return (
    <section aria-labelledby="status-heading" className="clean-card space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {p.expiredHeading}
      </h2>
      <p className="text-lg">{t.expiredText}</p>
      <p className="text-lg">{p.expiredHelp}</p>
      <p className="text-lg">
        <Link href="/" className="font-semibold text-blue-900 underline underline-offset-2">
          {p.expiredNewVisit}
        </Link>
      </p>
    </section>
  );
}

export function PatientStatus({ view, language, onOnMyWay, sending }: Props) {
  const t = textFor(language);
  if (view.expired) return <Expired t={t} />;
  if (view.status === "waiting") return <Waiting view={view} t={t} />;
  if (view.status === "called" || view.status === "on_the_way") {
    return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
  }
  return <OtherStatus view={view} t={t} />;
}
