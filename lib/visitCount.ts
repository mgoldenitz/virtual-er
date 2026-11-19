// Staff wording: a number of visits in plain words ("1 visit", "3 visits").

/** "1 visit", "2 visits", "0 visits". */
export function visitCount(n: number): string {
  return `${n} ${n === 1 ? "visit" : "visits"}`;
}
