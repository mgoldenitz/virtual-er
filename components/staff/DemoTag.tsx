// A small "Demo" tag next to a visit code on the staff screen. It shows only for demo visits.

export function DemoTag({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) return null;
  return (
    <>
      {" "}
      <span data-testid="demo-tag" className="ml-1 inline-block whitespace-nowrap rounded border-2 border-muted bg-canvas px-1.5 py-0.5 font-sans text-sm font-bold tracking-normal text-ink">
        <span className="sr-only">, </span>Demo<span className="sr-only"> visit</span>
      </span>
    </>
  );
}
