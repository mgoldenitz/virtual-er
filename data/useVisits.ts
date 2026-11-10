// React hook for staff screens: the list of visits from the database, kept up to date.
// `visits` is null until the first read works; `outOfDate` is true when the last read failed.

import { useSyncExternalStore } from "react";
import { EMPTY_LIST, readVisitList, watchVisits, type VisitList } from "./visitCache";

export function useVisits(): VisitList {
  return useSyncExternalStore(watchVisits, readVisitList, () => EMPTY_LIST);
}
