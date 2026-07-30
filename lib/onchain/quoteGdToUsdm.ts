import { celina } from "@/lib/celina";
import { weiToHumanAmount } from "@/lib/onchain/formatUsdm";

/**
 * Quote G$ wei amounts to USDm via the GoodDollar reserve.
 * Returns one nullable USDm string per input; failures are non-fatal.
 */
export async function quoteGdWeiToUsdm(amountsWei: string[]): Promise<(string | null)[]> {
  const normalized = amountsWei.map((value) => String(value ?? "0"));
  const uniqueWei = [...new Set(normalized)];
  const quoteByWei = new Map<string, string | null>();

  await Promise.all(
    uniqueWei.map(async (wei) => {
      try {
        const amount = weiToHumanAmount(wei);
        if (amount === "0") {
          quoteByWei.set(wei, "0");
          return;
        }
        const quote = await celina.gooddollar.getReserveQuote("GoodDollar", "USDm", amount);
        quoteByWei.set(wei, quote.expectedOut);
      } catch (error) {
        console.error("G$→USDm reserve quote failed", error);
        quoteByWei.set(wei, null);
      }
    }),
  );

  return normalized.map((wei) => quoteByWei.get(wei) ?? null);
}
