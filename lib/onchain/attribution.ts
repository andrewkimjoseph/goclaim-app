import { stripErc8021SuffixIfPresent } from "@andrewkimjoseph/celina-sdk";
import type { Hex } from "viem";

/**
 * Strip a Celina ERC-8021 attribution suffix from calldata for ABI decode.
 * New Celina writes use ERC-8021 only; this is a thin wrapper around the SDK helper.
 */
export function stripCelinaAttributionCalldata(data: Hex): Hex {
  return stripErc8021SuffixIfPresent(data);
}
