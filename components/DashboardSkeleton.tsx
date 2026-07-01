function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`card animate-pulse ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="h-3 w-24 bg-black/10 rounded-brutal" />
      <div className="h-9 w-40 bg-black/10 rounded-brutal mt-3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <SkeletonCard />
      <div className="card animate-pulse">
        <div className="h-3 w-28 bg-black/10 rounded-brutal" />
        <div className="h-9 w-32 bg-black/10 rounded-brutal mt-3" />
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t-2 border-black">
          <div>
            <div className="h-3 w-20 bg-black/10 rounded-brutal" />
            <div className="h-9 w-16 bg-black/10 rounded-brutal mt-2" />
          </div>
          <div>
            <div className="h-3 w-20 bg-black/10 rounded-brutal" />
            <div className="h-9 w-16 bg-black/10 rounded-brutal mt-2" />
          </div>
        </div>
      </div>
      <SkeletonCard />
    </div>
  );
}

function SetupStepSkeleton() {
  return (
    <li className="flex gap-4 min-w-0 items-start">
      <div className="h-8 w-8 shrink-0 rounded-brutal border-2 border-black bg-black/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 bg-black/10 rounded-brutal" />
        <div className="h-3 w-full max-w-xs bg-black/10 rounded-brutal" />
      </div>
    </li>
  );
}

export function SetupDashboardSkeleton() {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center py-10 px-1 min-h-0 overflow-y-auto overscroll-contain">
        <div
          className="flex flex-col items-center justify-center text-center gap-5 w-full animate-pulse"
          role="status"
          aria-label="Loading"
        >
          <div className="h-20 w-20 bg-white/20 rounded-brutal" />
          <div className="h-10 w-56 max-w-full bg-white/20 rounded-brutal" />
          <div className="h-5 w-72 max-w-full bg-white/15 rounded-brutal" />
          <div className="w-full mt-6">
            <div className="card w-full text-left p-5">
              <div className="h-4 w-28 bg-black/10 rounded-brutal mb-4" />
              <ul className="space-y-4">
                <SetupStepSkeleton />
                <SetupStepSkeleton />
                <SetupStepSkeleton />
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 pb-2">
        <div className="h-12 w-full bg-white/20 rounded-brutal animate-pulse" />
      </div>
    </>
  );
}

export function HistorySkeleton() {
  return (
    <div className="card animate-pulse" role="status" aria-label="Loading" aria-hidden>
      <div className="h-4 w-32 bg-black/10 rounded-brutal" />
      <div className="space-y-3 mt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-full bg-black/10 rounded-brutal" />
        ))}
      </div>
    </div>
  );
}
