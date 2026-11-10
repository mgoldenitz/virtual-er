// React hook for staff screens: the full list of visits, kept up to date live.
// Returns null during the first server render, before the browser's storage can be read.

import { useSyncExternalStore } from "react";
import type { Visit } from "@/lib/visit";
import { readVisits, subscribeToVisits } from "./visitStore";

export function useVisits(): Visit[] | null {
  return useSyncExternalStore(subscribeToVisits, readVisits, () => null);
}
