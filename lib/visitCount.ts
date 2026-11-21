// Staff wording: a number of visits or survey responses in plain words ("1 visit", "3 responses").

/** "1 visit", "2 visits", "0 visits". */
export function visitCount(n: number): string {
  return `${n} ${n === 1 ? "visit" : "visits"}`;
}

/** "1 response", "2 responses", "0 responses". */
export function responseCount(n: number): string {
  return `${n} ${n === 1 ? "response" : "responses"}`;
}
