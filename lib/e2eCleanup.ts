// Makes the SQL lines that delete the visits the end-to-end tests made (npm run e2e:cleanup).
// The codes come from a text file, so only real display codes may reach the SQL.

import { CODE_ALPHABET } from "./codes";

/** The codes that are exactly 6 characters from CODE_ALPHABET, each once, in first order. */
export function cleanCodes(codes: string[]): string[] {
  const good: string[] = [];
  for (const code of codes) {
    if (code.length === 6 && [...code].every((c) => CODE_ALPHABET.includes(c)) && !good.includes(code)) {
      good.push(code);
    }
  }
  return good;
}

/** "('ABC234', 'XYZ789')", or null when no good code is left. */
function codeList(codes: string[]): string | null {
  const good = cleanCodes(codes);
  if (good.length === 0) return null;
  return `(${good.map((code) => `'${code}'`).join(", ")})`;
}

/** The delete line for the owner to run in the SQL Editor, or null when there is nothing to delete. */
export function cleanupSql(codes: string[]): string | null {
  const list = codeList(codes);
  return list === null ? null : `delete from public.visits where code in ${list};`;
}

/** The count line that must give 0 after the delete, or null when there is nothing to count. */
export function countSql(codes: string[]): string | null {
  const list = codeList(codes);
  return list === null ? null : `select count(*) from public.visits where code in ${list};`;
}
