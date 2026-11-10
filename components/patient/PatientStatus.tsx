"use client";

// The main part of the patient screen, which changes with the visit's status:
// Waiting, Please head back now, or Ready at the desk.

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
        Estimated time to see a doctor after triage:{" "}
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

function Closed({ view }: { view: PatientView }) {
  const arrived = view.status === "arrived";
  return (
    <section aria-labelledby="status-heading" className="space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {arrived ? "Status: Ready at the desk" : "Your off-site wait has ended"}
      </h2>
      <p className="text-lg">
        {arrived
          ? "Staff have marked you as back. Please stay in the waiting area until staff call you."
          : "Please check with the emergency department desk."}
      </p>
    </section>
  );
}

export function PatientStatus({ view, onOnMyWay }: Props) {
  if (view.status === "waiting") return <Waiting view={view} />;
  if (view.status === "called" || view.status === "on_the_way") {
    return <Called view={view} onOnMyWay={onOnMyWay} />;
  }
  return <Closed view={view} />;
}
