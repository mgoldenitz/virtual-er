// The frame around every staff screen: the glass look's font, colours and soft background.

import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export function StaffShell({ children }: { children: ReactNode }) {
  return (
    <div className={`theme-staff staff-backdrop flex flex-1 flex-col text-ink ${jakarta.className}`}>
      {children}
    </div>
  );
}
