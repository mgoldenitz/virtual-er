// The frame around every patient screen: the clean look's light-grey page behind white boxes.

import type { ReactNode } from "react";

export function PatientShell({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col bg-canvas text-ink">{children}</div>;
}
