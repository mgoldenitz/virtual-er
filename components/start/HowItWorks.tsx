// "How it works" on the start page: the 6 steps of an off-site wait, numbered by the list.
// Step 2 is SPEC's triage sentence, taken from the patient text so it stays word for word.

import { textFor } from "@/lib/text";

export function HowItWorks({ language }: { language: string }) {
  const t = textFor(language);
  const [first, ...rest] = t.start.howSteps;
  const steps = [first, t.patient.fromHomeText[0], ...rest];
  return (
    <section aria-labelledby="how-heading" className="space-y-3">
      <h2 id="how-heading" className="text-2xl font-bold">
        {t.start.howHeading}
      </h2>
      <ol className="list-decimal space-y-2 ps-6">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
