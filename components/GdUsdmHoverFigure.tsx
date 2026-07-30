"use client";

import { useEffect, useRef, useState } from "react";

type GdUsdmHoverFigureProps = {
  gdAmount: string;
  usdmAmount: string;
  className?: string;
  currencyClassName?: string;
};

type PinnedState = "gd" | "usdm" | null;

const HOVER_LEAVE_DELAY_MS = 120;

const layerBase =
  "[grid-area:stack] inline-flex items-baseline whitespace-nowrap transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function layerVisibility(show: boolean) {
  return show
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-0.5 pointer-events-none";
}

function useFinePointerHover() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return enabled;
}

export function GdUsdmHoverFigure({
  gdAmount,
  usdmAmount,
  className,
  currencyClassName,
}: GdUsdmHoverFigureProps) {
  const finePointerHover = useFinePointerHover();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState<PinnedState>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUsdm = pinned !== null ? pinned === "usdm" : hovered;
  const showGd = !showUsdm;

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const clearLeaveTimeout = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (!finePointerHover) return;
    clearLeaveTimeout();
    setHovered(true);
  };

  const handleMouseLeave = () => {
    if (!finePointerHover) return;
    clearLeaveTimeout();
    leaveTimeoutRef.current = setTimeout(() => {
      setHovered(false);
      leaveTimeoutRef.current = null;
    }, HOVER_LEAVE_DELAY_MS);
  };

  const togglePinned = () => {
    setPinned((current) => {
      if (current === null) {
        return showUsdm ? "gd" : "usdm";
      }
      return current === "usdm" ? "gd" : "usdm";
    });
  };

  return (
    <span
      className={joinClasses(
        "inline-grid cursor-default [grid-template-areas:'stack']",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePinned}
      role="button"
      tabIndex={0}
      aria-label={`${gdAmount} GoodDollar, about ${usdmAmount} USDm`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          togglePinned();
        }
      }}
    >
      <span
        className={joinClasses(layerBase, layerVisibility(showGd))}
        aria-hidden={!showGd}
      >
        <span
          className={joinClasses(
            "underline decoration-dotted underline-offset-2",
            currencyClassName,
          )}
        >
          G$
        </span>
        <span className="ml-1 tabular-nums">{gdAmount}</span>
      </span>
      <span
        className={joinClasses(layerBase, layerVisibility(showUsdm))}
        aria-hidden={!showUsdm}
      >
        <span>USDm</span>
        <span className="ml-1 tabular-nums">{usdmAmount}</span>
      </span>
    </span>
  );
}
