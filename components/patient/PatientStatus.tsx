"use client";

// The main part of the patient screen, which changes with the visit's status:
// Waiting, Please head back now, Ready at the desk, and the states before and after those.

import type { PatientView } from "@/lib/patientView";
import { Button } from "@/components/Button";

type Props = { view: PatientView; onOnMyWay: () => void };

function Waiting({ view }: { view: PatientView }) {
  return (
    <section aria-labelledby="status-heading" className="space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        Status: Waiting
      </h2>
      <p className="text-lg">
        Your place in line: <strong className="text-3xl">{view.placeInLine}</strong>
      </p>
      <p className="text-base">
        Your place can change if more urgent patients arrive. The most urgent patients are always
        seen first.
      </p>
      <p className="text-lg">
        Estimated time until you&apos;re called back:{" "}
        <strong>
          {view.waitLow} to {view.waitHigh} minutes
        </strong>
      </p>
      <p className="text-sm text-slate-700">This estimate is simulated for the demo.</p>
    </section>
  );
}

function Called({ view, onOnMyWay }: Props) {
  const confirmed = view.status === "on_the_way";
  return (
    <section
      aria-labelledby="status-heading"
      className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
    >
      <h2 id="status-heading" className="text-2xl font-bold text-green-950">
        Please head back now
      </h2>
      <p className="text-lg">Please return to the emergency department and go to the desk.</p>
      {confirmed ? (
        <p className="text-lg font-semibold" data-testid="confirmed">
          Thank you. Staff know you are on your way.
        </p>
      ) : (
        <Button onClick={onOnMyWay} className="w-full text-lg">
          I&apos;m on my way
        </Button>
      )}
      <p className="text-sm text-slate-800">
        Demo limits: alerts on this page only work while it is open and your phone is unlocked.
      </p>
    </section>
  );
}

// Heading and message for every status that has no place-in-line or call-back screen.
// Placeholder wording until the Phase 3 wording review.
const OTHER: Record<string, { heading: string; text: string }> = {
  pre_arrival: {
    heading: "Status: Checked in from home, not yet triaged",
    text: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
  },
  needs_reassessment: {
    heading: "Please go to the triage desk",
    text: "A nurse will check you again before you rejoin the line.",
  },
  arrived: {
    heading: "Status: Ready at the desk",
    text: "Staff have marked you as back. Please stay in the waiting area until staff call you.",
  },
  declined: {
    heading: "Status: Waiting in the emergency department",
    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
  },
  not_eligible: {
    heading: "Status: Waiting in the emergency department",
    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
  },
};

const ENDED = {
  heading: "Your off-site wait has ended",
  text: "Please check with the emergency department desk.",
};

function OtherStatus({ view }: { view: PatientView }) {
  const { heading, text } = OTHER[view.status] ?? ENDED;
  return (
    <section aria-labelledby="status-heading" className="space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {heading}
      </h2>
      <p className="text-lg">{text}</p>
    </section>
  );
}

export function PatientStatus({ view, onOnMyWay }: Props) {
  if (view.status === "waiting") return <Waiting view={view} />;
  if (view.status === "called" || view.status === "on_the_way") {
    return <Called view={view} onOnMyWay={onOnMyWay} />;
  }
  return <OtherStatus view={view} />;
}
