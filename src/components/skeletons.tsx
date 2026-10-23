// Grey placeholders shown the moment a screen is tapped, while its data loads.

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

function Block({ className = "h-20" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface ring-1 ring-slate-200 ${className}`} />;
}

// Diário/Mensal: tabs, the day card, then one block per building.
export function DayViewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Block className="h-20" />
      <Block className="h-14" />
      {[0, 1, 2, 3].map((i) => (
        <Block key={i} className="h-16" />
      ))}
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Bar className="h-10 w-44" />
      <Bar className="h-10 w-36" />
    </div>
  );
}

// Generic admin page: title and a few cards.
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Bar className="mb-2 h-8 w-48" />
      <Bar className="h-9 w-72" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Block key={i} className="h-16" />
      ))}
    </div>
  );
}

// A single cleaning: header card, then the big action button.
export function CleaningSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4" aria-busy="true" aria-label="Carregando">
      <Bar className="h-5 w-16" />
      <Block className="h-44" />
      <Block className="h-14" />
      <Block className="h-28" />
    </div>
  );
}
