import { copy } from "@/lib/copy";

type DashboardOverviewCardProps = {
  lifetimeGdClaimed: string;
  rootGdBalance: string | null;
  lastClaimedAt?: string | null;
  streak?: number;
  onStreakOpen?: () => void;
};

export function DashboardOverviewCard({
  lifetimeGdClaimed,
  rootGdBalance,
  lastClaimedAt,
  streak = 0,
  onStreakOpen,
}: DashboardOverviewCardProps) {
  return (
    <div className="card">
      <p className="text-xs font-display font-semibold text-shell">
        {copy.dashboard.rootGdBalance}
      </p>
      <p
        className="font-display font-extrabold text-4xl text-primary mt-2 truncate"
        title={rootGdBalance ?? undefined}
      >
        {rootGdBalance ?? "—"}
      </p>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t-2 border-black">
        <div>
          <p className="text-xs font-display font-semibold text-shell">
            {copy.dashboard.streakLabel}
          </p>
          {onStreakOpen ? (
            <button
              type="button"
              onClick={onStreakOpen}
              aria-label={`${copy.dashboard.streakLabel}: ${streak}`}
              className="font-display font-extrabold text-4xl text-primary mt-2 flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="tabular-nums">{streak}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/flame.svg"
                alt=""
                width={36}
                height={36}
                className="shrink-0"
                aria-hidden
              />
            </button>
          ) : (
            <p className="font-display font-extrabold text-4xl text-primary mt-2">
              {streak}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-display font-semibold text-shell">
            {copy.dashboard.totalGGoClaimed}
          </p>
          <p
            className="font-display font-extrabold text-4xl text-primary mt-2 truncate"
            title={lifetimeGdClaimed}
          >
            {lifetimeGdClaimed}
          </p>
        </div>
      </div>
      {lastClaimedAt && (
        <p className="text-xs text-foreground/60 mt-3 whitespace-nowrap">
          {copy.dashboard.lastGoClaimed}:{" "}
          {new Date(lastClaimedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
