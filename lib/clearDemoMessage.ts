// Staff wording after "Clear demo data": how many demo visits were deleted, or that nothing was saved.

/**
 * The words staff (and screen readers) get after "Clear demo data".
 * `result` is the number of demo visits deleted, or "failed" if the database could not be reached.
 */
export function clearDemoMessage(result: number | "failed"): string {
  if (result === "failed") {
    return "Not saved: the database could not be reached. Demo data was not cleared. Try again.";
  }
  if (result === 0) return "No demo visits to delete. The demo simulator is off.";
  const visits = result === 1 ? "visit" : "visits";
  return `${result} demo ${visits} deleted. The demo simulator is off.`;
}
