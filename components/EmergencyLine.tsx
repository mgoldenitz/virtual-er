// The 911 safety line from SPEC rule 3, shown on every patient screen in every state and language.

import { textFor } from "@/lib/text";
import { SafetyCard } from "@/components/SafetyCard";

export function EmergencyLine({ language }: { language?: string }) {
  return <SafetyCard>{textFor(language).emergencyLine}</SafetyCard>;
}
