// The frame around every staff screen: the light-grey page background. The font is the device's own.

import type { ReactNode } from "react";

export function StaffShell({ children }: { children: ReactNode }) {
  return <div className="bg-canvas flex flex-1 flex-col text-ink">{children}</div>;
}
