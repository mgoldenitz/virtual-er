// The red card for safety messages (SPEC rule 3). It has no close button and can never be hidden.

export function SafetyCard({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-s-8 border-alert-edge bg-alert-tint p-3 text-alert-ink">
      <span aria-hidden="true" className="icon-tile text-alert-edge" style={{ background: "#ffffff" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
      <p className={strong ? "text-lg font-bold" : "text-base font-semibold"}>{children}</p>
    </div>
  );
}
