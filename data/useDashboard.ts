// React hook for the staff dashboard: the day's numbers from the database, kept up to date.
// `visits` is null until the first read works; `outOfDate` is true when the last read failed.

import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_DASHBOARD, readDashboard, watchDashboard, type DashboardData } from "./dashboardRead";

export function useDashboard(isDemo: boolean): DashboardData {
  const subscribe = useCallback((onChange: () => void) => watchDashboard(isDemo, onChange), [isDemo]);
  const getSnapshot = useCallback(() => readDashboard(isDemo), [isDemo]);
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_DASHBOARD);
}
