// Clears all demo data (SPEC "Demo mode"): asks the database function clear_demo_data, then reads the visits again.
import { supabaseBrowser } from "./supabaseBrowser";
import { loadVisits } from "./visitCache";

/** The number of demo visits deleted, or "failed" if the database could not be reached or did not answer with a number. */
export async function clearDemoData(): Promise<number | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("clear_demo_data");
    if (error || typeof data !== "number") return "failed";
    // Wait for the new list, so the result words come after the old demo rows are gone.
    // A failed re-read does not make the clear "failed": the rows are already deleted.
    await loadVisits().catch(() => {});
    return data;
  } catch {
    return "failed";
  }
}
