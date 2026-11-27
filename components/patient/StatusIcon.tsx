// The small line icon on a patient status card. Screen readers skip it: the heading says the same thing.

import type { StatusIconName } from "@/lib/statusLook";

const PATHS: Record<StatusIconName, string[]> = {
  check: ["M20 6 9 17l-5-5"],
  home: ["M3 10.5 12 3l9 7.5", "M5 9v11h14V9", "M10 20v-6h4v6"],
  alert: ["M12 3 2 20h20L12 3z", "M12 10v4", "M12 17h.01"],
  building: ["M4 21V5l8-2v18", "M12 8h8v13", "M2 21h20", "M8 9h.01", "M8 13h.01", "M8 17h.01", "M16 12h.01", "M16 16h.01"],
  flag: ["M5 21V4", "M5 4h12l-2 4 2 4H5"],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v5l3 2"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  ],
};

export function StatusIcon({ name, tileClass }: { name: StatusIconName; tileClass: string }) {
  return (
    <span aria-hidden="true" className={tileClass} data-icon={name}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
