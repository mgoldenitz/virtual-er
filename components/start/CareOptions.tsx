// The start page's "other options before travelling" and the link to THP's own wait times.
// Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
// so patients are sent to THP's page for them.

const THP_EMERGENCY_PAGE = "https://trilliumhealthpartners.ca/emergency/a/visit.html";

const linkStyle = "font-semibold text-blue-900 underline underline-offset-2";

function External({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function CareOptions() {
  return (
    <section aria-labelledby="options-heading" className="space-y-3">
      <h2 id="options-heading" className="text-xl font-bold">
        Other options before you travel
      </h2>
      <ul className="list-disc space-y-2 pl-6 text-base">
        <li>
          Health811: call{" "}
          <a href="tel:811" className={linkStyle}>
            811
          </a>{" "}
          for a free nurse line.
        </li>
        <li>
          <External href="https://www.regional-virtual-urgent-care.ca/">Regional virtual urgent care</External>
        </li>
        <li>
          The Urgent Care Centre at Queensway Health Centre, and the pharmacist assessment pilot at three
          Mississauga Shoppers Drug Mart locations. For hours and details, see{" "}
          <External href={THP_EMERGENCY_PAGE}>THP&apos;s emergency page</External>.
        </li>
      </ul>
      <p>
        <External href={THP_EMERGENCY_PAGE}>See current wait times on THP&apos;s website</External>
      </p>
    </section>
  );
}
