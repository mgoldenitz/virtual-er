// The start page's "other options before travelling" and the link to THP's own wait times.
// Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
// so patients are sent to THP's page for them.

import { textFor } from "@/lib/text";

const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";

const linkStyle = "font-semibold text-blue-900 underline underline-offset-2";

function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
      {children}
      <span className="sr-only"> {newTab}</span>
    </a>
  );
}

export function CareOptions({ language }: { language?: string }) {
  const t = textFor(language);
  const s = t.start;
  return (
    <section aria-labelledby="options-heading" className="space-y-3">
      <h2 id="options-heading" className="text-xl font-bold">
        {s.careHeading}
      </h2>
      <p>{s.careIntro}</p>
      <ul className="list-disc space-y-2 ps-6 text-base">
        <li>
          {s.health811Before}{" "}
          <a href="tel:811" className={linkStyle}>
            811
          </a>{" "}
          {s.health811After}
        </li>
        <li>
          <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab}>
            {s.virtualCare}
          </External>
        </li>
        <li>{s.urgentCare}</li>
        <li>{s.pharmacist}</li>
      </ul>
      <p>
        {s.hoursBefore}{" "}
        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
          {s.hoursLink}
        </External>
        .
      </p>
      <p>
        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
          {s.waitTimesLink}
        </External>
      </p>
    </section>
  );
}
