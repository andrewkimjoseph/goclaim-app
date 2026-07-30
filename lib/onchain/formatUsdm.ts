const usdmDisplayFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Convert token wei to a decimal string suitable for Celina `getReserveQuote`. */
export function weiToHumanAmount(wei: string, decimals = 18): string {
  let value: bigint;
  try {
    value = BigInt(wei || "0");
  } catch {
    return "0";
  }
  if (value === 0n) return "0";

  const negative = value < 0n;
  if (negative) value = -value;

  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) {
    return `${negative ? "-" : ""}${whole}`;
  }

  const fracStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}.${fracStr}`;
}

/** Format a USDm quote string for display (2 decimal places). */
export function formatUsdmDisplay(amount: string | null | undefined): string | null {
  if (amount == null || amount === "") return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return usdmDisplayFormatter.format(value);
}
