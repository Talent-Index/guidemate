export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-brand-border ${className}`} aria-hidden />;
}

export function ExperienceGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden border border-brand-border bg-white">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="flex flex-col gap-2 p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border border-brand-border p-3">
          <Skeleton className="h-14 w-20 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-5 w-16" />
      <div className="rounded-card border border-brand-border bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="col-span-2 h-16 rounded-2xl sm:col-span-1" />
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-28" />
        <ExperienceGridSkeleton count={2} />
      </div>
      <div>
        <Skeleton className="h-4 w-24" />
        <ListRowSkeleton count={2} />
      </div>
    </div>
  );
}
