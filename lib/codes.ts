// Makes the two visit identifiers from SPEC rule 1:
// a short display code people can read aloud, and a long secret access token.

/** Letters and digits with no look-alikes (no O/0, I/1, L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Crockford base32: case-insensitive, no I, L, O or U. */
const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

type RandomBytes = (length: number) => Uint8Array;

const browserRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length));

/** 6-character display code. Not a secret; it never opens a visit for a patient. */
export function makeDisplayCode(randomBytes: RandomBytes = browserRandomBytes): string {
  let code = "";
  while (code.length < 6) {
    // Reject bytes that would bias the result (256 is not a multiple of 31).
    const limit = 256 - (256 % CODE_ALPHABET.length);
    for (const byte of randomBytes(12)) {
      if (byte < limit && code.length < 6) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

/** Display code that is not already used by an existing visit. */
export function makeUniqueDisplayCode(
  taken: Set<string>,
  randomBytes: RandomBytes = browserRandomBytes,
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = makeDisplayCode(randomBytes);
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free display code");
}

/** Access token: 16 random bytes (128 bits) as 26 Crockford base32 characters. */
export function makeAccessToken(randomBytes: RandomBytes = browserRandomBytes): string {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += TOKEN_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += TOKEN_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Token split into groups of 4, so a typed link is easier to copy from paper. */
export function groupToken(token: string): string {
  return token.match(/.{1,4}/g)?.join("-") ?? token;
}

/** Undo grouping and typing slips: drop spaces/hyphens, upper-case, and map look-alikes. */
export function normalizeToken(typed: string): string {
  return typed
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** True only for something shaped like a token from makeAccessToken (26 Crockford characters). */
export function isAccessToken(token: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(token);
}

/** A display code as staff typed it: spaces and hyphens dropped, upper-case. */
export function normalizeDisplayCode(typed: string): string {
  return typed.replace(/[\s-]/g, "").toUpperCase();
}
