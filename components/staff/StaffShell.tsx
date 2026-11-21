// The frame around every staff screen: the glass look's soft blue background. The font is the device's own.

import type { ReactNode } from "react";

export function StaffShell({ children }: { children: ReactNode }) {
  return <div className="staff-backdrop flex flex-1 flex-col text-ink">{children}</div>;
}
