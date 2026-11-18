// A small "Demo" tag next to a visit code on the staff screen. It shows only for demo (synthetic) visits.

export function DemoTag({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) return null;
  return (
    <span data-testid="demo-tag" className="ml-2 rounded border-2 border-slate-700 bg-slate-100 px-1.5 py-0.5 align-middle font-sans text-sm font-bold tracking-normal text-slate-900">
      Demo<span className="sr-only"> visit, synthetic data</span>
    </span>
  );
}
