import { concat, stringToHex, type Hex } from "viem";

/** Calldata suffix appended to prepared transactions for on-chain attribution. */
export const GOCLAIM_DATA_SUFFIX = stringToHex("GOCLAIM");

export function appendDataSuffix(
  data: Hex,
  suffix: Hex = GOCLAIM_DATA_SUFFIX
): Hex {
  return concat([data, suffix]);
}
