import { concat, stringToHex, type Hex } from "viem";

/** Calldata suffix appended to prepared transactions for on-chain attribution. */
export const THECLAIMER_DATA_SUFFIX = stringToHex("THECLAIMER");

export function appendDataSuffix(
  data: Hex,
  suffix: Hex = THECLAIMER_DATA_SUFFIX
): Hex {
  return concat([data, suffix]);
}
