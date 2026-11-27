// "How it works" on the start page: the 6 steps of an off-site wait, one picture tile per step.
// Step 2 is SPEC's triage sentence, taken from the patient text so it stays word for word.
// The pictures are decorative (alt=""): the step text already says everything in them.
import Image from "next/image";
import { textFor } from "@/lib/text";

// One picture per step, in step order (Kenney CC0 stills).
const PICTURES = [
  "/start/steps/1-home.png",
  "/start/steps/2-triage.png",
  "/start/steps/3-coffee.png",
  "/start/steps/4-phone.png",
  "/start/steps/5-walk-back.png",
  "/start/steps/6-desk.png",
];

export function HowItWorks({ language }: { language: string }) {
  const t = textFor(language);
  const [first, ...rest] = t.start.howSteps;
  const steps = [first, t.patient.fromHomeText[0], ...rest];

  return (
    <section aria-labelledby="how-heading" className="space-y-3">
      <h2 id="how-heading" className="text-2xl font-bold">{t.start.howHeading}</h2>
      {/* role="list" keeps the list for Safari screen readers, which drop it with list-none. */}
      <ol role="list" className="grid list-none gap-6 min-[576px]:grid-cols-2">
        {steps.map((step, i) => (
          <li key={step}>
            <Image
              src={PICTURES[i]}
              width={1200}
              height={800}
              alt=""
              sizes="(min-width: 576px) 260px, 100vw"
              className="h-auto w-full rounded-lg"
            />
            {/* The step number comes from the list counter, so it stays right in RTL. */}
            <p className="mt-2 before:me-1 before:font-bold before:content-[counter(list-item)'.']">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
