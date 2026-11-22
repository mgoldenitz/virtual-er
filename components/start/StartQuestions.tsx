// "Questions" on the start page: 8 questions, each opens to show its answer (no code needed for
// the keyboard or screen readers). Four answers use SPEC sentences, taken from the patient text.

import { fill, textFor } from "@/lib/text";

export function StartQuestions({ language }: { language: string }) {
  const t = textFor(language);
  const q = t.start.questions;
  // Each id stays the same in every language, so an open answer stays open when the language changes.
  const items = [
    { id: "holdPlace", q: q.holdPlace.q, a: fill(q.holdPlace.a, { triage: t.patient.fromHomeText[0] }) },
    { id: "placeChanged", q: q.placeChanged.q, a: t.patient.placeCanChange },
    { id: "stillHere", ...q.stillHere },
    { id: "noReply", ...q.noReply },
    { id: "worse", q: q.worse.q, a: t.emergencyLine },
    { id: "saves", ...q.saves },
    { id: "reopen", ...q.reopen },
    { id: "paused", q: q.paused.q, a: fill(q.paused.a, { message: t.start.paused }) },
  ];
  return (
    <section aria-labelledby="questions-heading" className="clean-card space-y-3">
      <h2 id="questions-heading" className="text-2xl font-bold">
        {t.start.questionsHeading}
      </h2>
      {items.map((item) => (
        <details key={item.id} className="rounded-xl border-2 border-control bg-card">
          <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-2 font-semibold hover:bg-band focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {item.q}
          </summary>
          <p className="px-4 pb-3">{item.a}</p>
        </details>
      ))}
    </section>
  );
}
