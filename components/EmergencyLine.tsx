// The 911 safety line from SPEC rule 3, shown on every patient screen in every state.

export function EmergencyLine() {
  return (
    <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-base font-semibold text-red-900">
      If your symptoms get worse, call 911 or come back to the emergency department now.
    </p>
  );
}
