"use client";

// The "Show" switch on the dashboard: "Real" visits (the default) or "Demo" visits. The choice
// is not saved, so a new visit to the page starts on "Real" again.

import { Button } from "@/components/Button";

type Props = {
  isDemo: boolean;
  onChange: (isDemo: boolean) => void;
};

export function ModeSwitch({ isDemo, onChange }: Props) {
  return (
    <div role="group" aria-labelledby="show-mode-label" className="flex flex-wrap items-center gap-2">
      <span id="show-mode-label" className="font-semibold">
        Show
      </span>
      <Button variant={isDemo ? "secondary" : "primary"} aria-pressed={!isDemo} onClick={() => onChange(false)}>
        Real
      </Button>
      <Button variant={isDemo ? "primary" : "secondary"} aria-pressed={isDemo} onClick={() => onChange(true)}>
        Demo
      </Button>
    </div>
  );
}
