// "Before you leave" on the patient screen while the visit waits off-site (lib/beforeYouLeave.ts
// decides when): 4 tips so the alert can reach the patient and they can come back in time.

import { textFor } from "@/lib/text";

export function BeforeYouLeave({ language }: { language: string }) {
  const p = textFor(language).patient;
  return (
    <section aria-labelledby="before-heading" className="clean-card space-y-3">
      <h2 id="before-heading" className="text-2xl font-bold">
        {p.beforeHeading}
      </h2>
      <ul className="list-disc space-y-2 ps-6">
        {p.beforeItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
