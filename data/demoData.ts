// Clears all demo data (SPEC "Demo mode"): asks the database function clear_demo_data, then reads the visits again.
import { supabaseBrowser } from "./supabaseBrowser";
import { loadVisits } from "./visitCache";

/** The number of demo visits deleted, or "failed" if the database could not be reached or did not answer with a number. */
export async function clearDemoData(): Promise<number | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("clear_demo_data");
    if (error || typeof data !== "number") return "failed";
    void loadVisits();
    return data;
  } catch {
    return "failed";
  }
}
