// "Questions" on the start page: 8 questions, each opens to show its answer (no code needed for
// the keyboard or screen readers). Three answers are SPEC sentences, taken from the patient text.

import { fill, textFor } from "@/lib/text";

export function StartQuestions({ language }: { language: string }) {
  const t = textFor(language);
  const q = t.start.questions;
  const items = [
    q.holdPlace,
    { q: q.placeChanged.q, a: t.patient.placeCanChange },
    q.stillHere,
    q.noReply,
    { q: q.worse.q, a: t.emergencyLine },
    q.saves,
    q.reopen,
    { q: q.paused.q, a: fill(q.paused.a, { message: t.start.paused }) },
  ];
  return (
    <section aria-labelledby="questions-heading" className="clean-card space-y-3">
      <h2 id="questions-heading" className="text-2xl font-bold">
        {t.start.questionsHeading}
      </h2>
      {items.map((item) => (
        <details key={item.q} className="rounded-xl border-2 border-control bg-card">
          <summary className="min-h-11 cursor-pointer px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {item.q}
          </summary>
          <p className="px-4 pb-3">{item.a}</p>
        </details>
      ))}
    </section>
  );
}
