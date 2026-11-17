// Turns the error code the database gives for a refused save into what the staff screen shows.
// The codes come from the trigger visits_check_step (supabase/migrations/).

import type { ChangeResult } from "./visit";

/** The step would start off-site waiting while the site is paused. */
export const PAUSE_REFUSED = "VWR02";
/** The step is not an allowed move, or it changes the site of a visit. */
export const STEP_REFUSED = "VWR01";

/** The result for a save that came back with an error. Any code that is not a refusal means not saved. */
export function resultForError(code: string | undefined): ChangeResult {
  if (code === PAUSE_REFUSED) return "paused";
  if (code === STEP_REFUSED) return "refused";
  return "not_saved";
}
