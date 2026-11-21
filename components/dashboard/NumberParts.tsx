// The small pieces the dashboard uses to show a number: the "no data yet" dash, a percent, and a label and value row.

import type { ReactNode } from "react";

/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
export function NoData() {
  return (
    <>
      <span aria-hidden="true">-</span>
      <span className="sr-only">no data yet</span>
    </>
  );
}

/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
export function Percent({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}%</>;
}

/** A number, or the NoData dash when it is null. */
export function NumberOrDash({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}</>;
}

/** One label and value pair in a list (inside a <dl>). */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 py-2">
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
