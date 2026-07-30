"use client";

import { useState } from "react";

type GdUsdmHoverFigureProps = {
  gdAmount: string;
  usdmAmount: string;
  className?: string;
  currencyClassName?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function GdUsdmHoverFigure({
  gdAmount,
  usdmAmount,
  className,
  currencyClassName,
}: GdUsdmHoverFigureProps) {
  const [showUsdm, setShowUsdm] = useState(false);
  const toggle = () => setShowUsdm((value) => !value);

  return (
    <span
      className={joinClasses("inline-flex cursor-default items-baseline whitespace-nowrap", className)}
      onMouseEnter={() => setShowUsdm(true)}
      onMouseLeave={() => setShowUsdm(false)}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-label={`${gdAmount} GoodDollar, about ${usdmAmount} USDm`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      }}
    >
      <span
        className={joinClasses(
          "underline decoration-dotted underline-offset-2",
          currencyClassName,
        )}
      >
        {showUsdm ? "USDm" : "G$"}
      </span>
      <span className="ml-1 tabular-nums">{showUsdm ? usdmAmount : gdAmount}</span>
    </span>
  );
}
