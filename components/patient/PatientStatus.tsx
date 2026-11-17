"use client";

// The main part of the patient screen, which changes with the visit's status:
// Waiting, Please head back now, Ready at the desk, and the states before and after those.

import Link from "next/link";
import { useRef, type RefObject } from "react";
import type { PatientView } from "@/lib/patientView";
import { textFor, type PatientText } from "@/lib/text";
import { formatWaitRange } from "@/lib/waitText";
import { Button } from "@/components/Button";
import { CallReminder } from "./CallReminder";
import { FocusBox } from "./FocusBox";
import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";

type Props = {
  view: PatientView;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  /** Set to true by a part below (the sound box) that left the page with focus inside it. */
  lostFocus?: RefObject<boolean>;
};

/** "I'm on my way". When it leaves the page with focus on it, it tells the status screen. */
function OnMyWayButton({ onOnMyWay, sending, label, onFocusLost }: {
  onOnMyWay: () => void;
  sending: boolean;
  label: string;
  onFocusLost: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  useReportFocusOnLeave(area, onFocusLost);
  return (
    <div ref={area}>
      <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
        {label}
      </Button>
    </div>
  );
}

function Waiting({ view, language, t }: { view: PatientView; language: string; t: PatientText }) {
  const p = t.patient;
  return (
    <section aria-labelledby="status-heading" className="clean-card space-y-3">
      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
        {p.waitingHeading}
      </h2>
      <p className="text-lg">
        {p.placeInLine} <strong className="text-3xl">{view.placeInLine}</strong>
      </p>
      <p className="text-base">{p.placeCanChange}</p>
      <p className="text-lg">
        {p.waitLabel}{" "}
        <strong>{view.waitLow !== null && view.waitHigh !== null && formatWaitRange(view.waitLow, view.waitHigh, language)}</strong>
      </p>
      <p className="text-sm text-slate-700">{p.simulated}</p>
    </section>
  );
}

function Called({ view, onOnMyWay, sending, t, onFocusLost }: Props & { t: PatientText; onFocusLost: () => void }) {
  const p = t.patient;
  const confirmed = view.status === "on_the_way";
  return (
    <section
      aria-labelledby="status-heading"
      className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
    >
      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold text-green-950">
        {p.calledHeading}
      </h2>
      <p className="text-lg">{p.calledText}</p>
      {!confirmed && <CallReminder view={view} t={t} />}
      {confirmed ? (
        <p className="text-lg font-semibold" data-testid="confirmed">
          {p.confirmed}
        </p>
      ) : (
        <OnMyWayButton
          onOnMyWay={onOnMyWay}
          sending={sending}
          label={sending ? p.sending : p.onMyWay}
          onFocusLost={onFocusLost}
        />
      )}
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
      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
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
      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
        {p.expiredHeading}
      </h2>
      <p className="text-lg">{t.expiredText}</p>
      <p className="text-lg">{p.expiredHelp}</p>
      <p className="text-lg">
        <Link href="/" className="font-semibold text-brand underline underline-offset-2">
          {p.expiredNewVisit}
        </Link>
      </p>
    </section>
  );
}

export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }: Props) {
  const t = textFor(language);
  // The page's flag when it gives one (the sound box sets it too), otherwise this screen's own.
  const ownFlag = useRef(false);
  // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
  const kind = viewKind(view);
  // A new screen gets a new box (the key), so the old box leaves and tells this screen if it held focus.
  return (
    <FocusBox key={kind} onFocusLost={markLost}>
      {kind === "expired" && <Expired t={t} />}
      {kind === "waiting" && <Waiting view={view} language={language} t={t} />}
      {kind === "called" && (
        <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />
      )}
      {kind === "other" && <OtherStatus view={view} t={t} />}
    </FocusBox>
  );
}

/** Which screen the view shows. Called and on the way share one screen. */
function viewKind(view: PatientView): "expired" | "waiting" | "called" | "other" {
  if (view.expired) return "expired";
  if (view.status === "waiting") return "waiting";
  if (view.status === "called" || view.status === "on_the_way") return "called";
  return "other";
}
