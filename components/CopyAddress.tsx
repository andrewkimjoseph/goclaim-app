"use client";

import { useState } from "react";
import { truncateAddress } from "@/lib/formatAddress";

type CopyAddressProps = {
  address: string;
  label?: string;
  hint?: string;
  /** Compact row for use inside another card (no outer card chrome). */
  nested?: boolean;
};

export function CopyAddress({ address, label, hint, nested }: CopyAddressProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const row = (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <code
        className="text-xs font-mono text-foreground/90 truncate min-w-0 flex-1 leading-none"
        title={address}
      >
        {truncateAddress(address)}
      </code>
      <button
        onClick={copy}
        className="shrink-0 text-xs font-display font-semibold text-primary hover:brightness-110 border-2 border-black px-2 py-1 rounded-brutal shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );

  if (nested) {
    return (
      <div>
        {row}
        {hint && <p className="text-xs text-foreground/60 mt-2">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      {label && (
        <p className="text-xs font-display font-semibold text-foreground/60 mb-1">
          {label}
        </p>
      )}
      {row}
      {hint && <p className="text-xs text-foreground/60 mt-2">{hint}</p>}
    </div>
  );
}
