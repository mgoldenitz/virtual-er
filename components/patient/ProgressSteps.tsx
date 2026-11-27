// The 4 progress steps above the status card: Triage, Waiting, Head back, At the desk.
// It shows nothing once the visit has left the line, ended or expired.

import { progressStep } from "@/lib/progressStep";
import type { VisitStatus } from "@/lib/visit";
import { textFor } from "@/lib/text";
import { languageInfo } from "@/lib/text/languages";

type Props = { status: VisitStatus; closed: boolean; expired: boolean; language: string };

export function ProgressSteps({ status, closed, expired, language }: Props) {
  const step = progressStep(status, closed, expired);
  if (step === null) return null;
  const p = textFor(language).progress;
  const labels = [p.triage, p.waiting, p.headBack, p.atDesk];
  return (
    <ol dir={languageInfo(language).dir} aria-label={p.label} className="grid grid-cols-4 gap-1 text-center text-sm">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "upcoming";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex flex-col items-center gap-1">
            <span
              aria-hidden="true"
              className={
                "h-2 w-full rounded-full " + (state === "upcoming" ? "bg-control" : "bg-brand")
              }
            />
            <span className={state === "current" ? "font-bold" : state === "done" ? "" : "text-muted"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
