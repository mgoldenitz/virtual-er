// The start page's "other options before travelling" and the link to THP's own wait times.
// Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
// so patients are sent to THP's page for them.

const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";

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
        Official information about care options
      </h2>
      <p>
        This demo cannot tell which service is right for you. Check eligibility, availability and hours on
        each linked site before you go.
      </p>
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
        <li>Urgent Care Centre at Queensway Health Centre in Etobicoke.</li>
        <li>
          A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so
          check that it is still running before you go.
        </li>
      </ul>
      <p>
        For hours and addresses, see <External href={THP_EMERGENCY_PAGE}>THP&apos;s emergency page</External>.
      </p>
      <p>
        <External href={THP_EMERGENCY_PAGE}>See current wait times on THP&apos;s website</External>
      </p>
    </section>
  );
}
