import { type Address, zeroAddress } from "viem";
import { identityAbi } from "./onchain/abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "./onchain/constants";
import { publicClient } from "./onchain/config";

/**
 * Ensures address is GoodDollar verified and is the identity root itself
 * (not a connected wallet under another root).
 */
export async function requireWhitelistedRoot(address: Address): Promise<void> {
  const root = await publicClient.readContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: [address],
  });

  if (root === zeroAddress) {
    throw new Error("Wallet not GoodDollar verified");
  }

  if (root.toLowerCase() !== address.toLowerCase()) {
    throw new Error(
      "Wallet must be the whitelisted identity root, not a linked wallet"
    );
  }
}
