import type { Address } from "viem";
import { celina } from "@/lib/celina";
import { formatGdAmount } from "./claimUbi";

export async function getRootGdBalance(rootAddress: Address): Promise<string> {
  const balance = await celina.token.getTokenBalance("GoodDollar", rootAddress);
  return formatGdAmount(balance.raw);
}
