"use client";

// A box around one screen of the patient page. When the box leaves the page with focus inside it
// (for example a new screen comes in its place), it calls onFocusLost, so a part that stays can
// move focus to the new heading.

import { useRef, type ReactNode } from "react";
import { useReportFocusOnLeave } from "./useFocusRescue";

type Props = {
  onFocusLost: () => void;
  className?: string;
  children: ReactNode;
};

export function FocusBox({ onFocusLost, className, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useReportFocusOnLeave(box, onFocusLost);
  return (
    <div ref={box} className={className}>
      {children}
    </div>
  );
}
