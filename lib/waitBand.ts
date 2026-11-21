// Puts one off-site wait (offered_at to called_at) into one of the 4 bands on the dashboard.
// The seconds come in already rounded to whole seconds (secondsBetween in dashboardNumbers.ts).
// The database does the same in delete_old_visits() (20261120030000_wait_and_recall_stats.sql):
// round(seconds / 60), then < 30, 30 to 59, 60 to 119, 120 or more.

export type WaitBand = "under_30" | "30_to_59" | "60_to_119" | "120_plus";

export function waitBand(seconds: number): WaitBand {
  const minutes = Math.round(seconds / 60);
  if (minutes < 30) return "under_30";
  if (minutes < 60) return "30_to_59";
  if (minutes < 120) return "60_to_119";
  return "120_plus";
}
