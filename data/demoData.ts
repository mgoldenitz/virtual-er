// Clears all demo data (SPEC "Demo mode"): asks the database function clear_demo_data, then reads the visits again.
import { supabaseBrowser } from "./supabaseBrowser";
import { loadVisits } from "./visitCache";

// The longest wait for the new list. The rows are already deleted, so staff must not wait forever.
const READ_WAIT_MS = 3000;

/** The number of demo visits deleted, or "failed" if the database could not be reached or did not answer with a whole number. */
export async function clearDemoData(): Promise<number | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("clear_demo_data");
    // A count is a whole number. NaN is a "number" in JavaScript, so typeof alone lets it through.
    if (error || typeof data !== "number" || !Number.isInteger(data)) return "failed";
    // Wait for the new list, so the result words come after the old demo rows are gone.
    // A failed re-read does not make the clear "failed": the rows are already deleted.
    await Promise.race([
      loadVisits().catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, READ_WAIT_MS)),
    ]);
    return data;
  } catch {
    return "failed";
  }
}
