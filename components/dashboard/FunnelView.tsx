// Today's steps from home start to survey, for both sites, as numbered lists with counts only (no percent).
// One line under the lists says why a lower row can be larger than the row above it.

import type { SiteNumbers } from "@/lib/dashboardNumbers";
import { funnelSteps } from "@/lib/funnelSteps";

type Props = { numbers: Record<"A" | "B", SiteNumbers> };

function SiteSteps({ site, n }: { site: "A" | "B"; n: SiteNumbers }) {
  const name = `Demo Site ${site}, today`;
  return (
    <div>
      <h3 className="font-semibold">{name}</h3>
      <ol aria-label={name} className="text-sm">
        {funnelSteps(n).map((step) => (
          // "relative" keeps the absolute sr-only text inside the row, or the phone page scrolls sideways.
          <li key={step.label} className="relative flex justify-between gap-4 border-b border-slate-200 py-1">
            <span>{step.label}</span>
            <span className="sr-only">: </span>
            <span className="font-semibold">{step.count}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FunnelView({ numbers }: Props) {
  return (
    <section className="glass-panel space-y-3">
      <h2 className="text-lg font-bold">Steps today</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <SiteSteps site="A" n={numbers.A} />
        <SiteSteps site="B" n={numbers.B} />
      </div>
      <p className="text-sm">
        Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a
        recall, so a lower row can be larger.
      </p>
    </section>
  );
}
