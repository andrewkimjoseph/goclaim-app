"use client";

import { GdUsdmHoverFigure } from "@/components/GdUsdmHoverFigure";
import { copy } from "@/lib/copy";

type DashboardOverviewCardProps = {
  lifetimeGdClaimed: string;
  lifetimeGdClaimedUsdm?: string | null;
  rootGdBalance: string | null;
  rootGdBalanceUsdm?: string | null;
  lastClaimedAt?: string | null;
  streak?: number;
  onStreakOpen?: () => void;
};

function GdFigure({
  gdAmount,
  usdmAmount,
  className,
}: {
  gdAmount: string;
  usdmAmount?: string | null;
  className?: string;
}) {
  if (usdmAmount != null) {
    return (
      <GdUsdmHoverFigure
        gdAmount={gdAmount}
        usdmAmount={usdmAmount}
        className={className}
        currencyClassName="decoration-primary/30"
      />
    );
  }

  return <span className={className}>{gdAmount}</span>;
}

const currencyFigureClass =
  "font-display font-extrabold text-xl sm:text-2xl text-primary tabular-nums";

export function DashboardOverviewCard({
  lifetimeGdClaimed,
  lifetimeGdClaimedUsdm,
  rootGdBalance,
  rootGdBalanceUsdm,
  lastClaimedAt,
  streak = 0,
  onStreakOpen,
}: DashboardOverviewCardProps) {
  return (
    <div className="card">
      <p className="text-xs font-display font-semibold text-shell">
        {copy.dashboard.rootGdBalance}
      </p>
      <p className={`mt-2 truncate ${currencyFigureClass}`}>
        {rootGdBalance != null ? (
          <GdFigure
            gdAmount={rootGdBalance}
            usdmAmount={rootGdBalanceUsdm}
            className={currencyFigureClass}
          />
        ) : (
          "—"
        )}
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
              className="font-display font-extrabold text-xl sm:text-2xl text-primary mt-2 flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="tabular-nums">{streak}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/flame.svg"
                alt=""
                width={24}
                height={24}
                className="shrink-0"
                aria-hidden
              />
            </button>
          ) : (
            <p className="font-display font-extrabold text-xl sm:text-2xl text-primary mt-2">
              {streak}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-display font-semibold text-shell">
            {copy.dashboard.totalGGoClaimed}
          </p>
          <p className={`mt-2 truncate ${currencyFigureClass}`}>
            <GdFigure
              gdAmount={lifetimeGdClaimed}
              usdmAmount={lifetimeGdClaimedUsdm}
              className={currencyFigureClass}
            />
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
