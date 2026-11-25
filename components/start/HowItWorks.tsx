// "How it works" on the start page: the 6 steps of an off-site wait, numbered by the list.
// Step 2 is SPEC's triage sentence, taken from the patient text so it stays word for word.
// The picture of a wait at home is decorative (alt=""): the steps already say everything in it.

import Image from "next/image";
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
      <Image
        src="/start/waiting-at-home.png"
        width={1344}
        height={768}
        alt=""
        sizes="(min-width: 576px) 544px, 100vw"
        className="h-auto w-full rounded-lg"
      />
      <ol className="list-decimal space-y-2 ps-6">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
