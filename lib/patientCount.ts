// Staff wording: a number of patients in plain words ("1 patient", "3 patients").

/** "1 patient", "2 patients", "0 patients". */
export function patientCount(n: number): string {
  return `${n} ${n === 1 ? "patient" : "patients"}`;
}
