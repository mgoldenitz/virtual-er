// React hook for the staff screen: whether any saved visits could not be read, kept up to date live.

import { useSyncExternalStore } from "react";
import { readStorageProblem, subscribeToVisits, type StorageProblem } from "./visitStore";

const NONE: StorageProblem = { damaged: 0, unreadable: false };

export function useStorageProblem(): StorageProblem {
  return useSyncExternalStore(subscribeToVisits, readStorageProblem, () => NONE);
}
