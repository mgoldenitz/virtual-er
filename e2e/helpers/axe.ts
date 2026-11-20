// Runs the axe accessibility checks (WCAG 2.2 AA) on the open page and gives back the faults.

import type { Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Each fault as "rule-id: help text (N places)". An empty list means no fault. */
export async function axeFaults(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  return page.evaluate(async (tags) => {
    // axe is put on window by the script above.
    const axe = (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; help: string; nodes: unknown[] }[] }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} places)`);
  }, WCAG_TAGS);
}
