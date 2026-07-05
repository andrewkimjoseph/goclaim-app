"use client";

import { useId, useState } from "react";
import { CopyAddress } from "@/components/CopyAddress";
import { copy } from "@/lib/copy";

type AddressesCardProps = {
  rootAddress?: string;
  goClaimAccountAddress?: string;
};

export function AddressesCard({
  rootAddress,
  goClaimAccountAddress,
}: AddressesCardProps) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const panelId = useId();

  if (!rootAddress && !goClaimAccountAddress) return null;

  return (
    <div className="card">
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-xs font-display font-semibold text-shell cursor-pointer flex items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <span className="min-w-0">{copy.dashboard.addressesLabel}</span>
        <span
          aria-hidden
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black rounded-brutal font-display font-bold text-lg leading-none shadow-[2px_2px_0_0_#000000] transition-colors duration-200 ${
            open ? "bg-primary text-white" : "bg-white text-foreground"
          }`}
        >
          <span className={open ? "hidden" : "block"}>+</span>
          <span className={open ? "block -mt-0.5" : "hidden"}>−</span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-3 pt-3 border-t-2 border-black space-y-4 pb-1">
            {rootAddress && (
              <div>
                <p className="text-xs font-display font-semibold text-shell mb-3">
                  {copy.dashboard.walletLabel}
                </p>
                <CopyAddress address={rootAddress} nested />
              </div>
            )}

            {rootAddress && goClaimAccountAddress && (
              <div className="border-t-2 border-black" />
            )}

            {goClaimAccountAddress && (
              <div>
                <p className="text-xs font-display font-semibold text-shell mb-3">
                  {copy.dashboard.goClaimAccountLabel}
                </p>
                <CopyAddress address={goClaimAccountAddress} nested />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
