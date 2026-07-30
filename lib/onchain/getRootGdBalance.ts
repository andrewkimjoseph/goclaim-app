import type { Address } from "viem";
import { celina } from "@/lib/celina";
import { formatGdAmountWhole } from "./claimUbi";

export type RootGdBalance = {
  formatted: string;
  wei: string;
};

export async function getRootGdBalance(rootAddress: Address): Promise<RootGdBalance> {
  const balance = await celina.token.getTokenBalance("GoodDollar", rootAddress);
  return {
    formatted: formatGdAmountWhole(balance.raw),
    wei: balance.raw,
  };
}
