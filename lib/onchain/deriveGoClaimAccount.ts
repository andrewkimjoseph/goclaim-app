import { type Hex } from "viem";
import { deriveSmartAccountAddress } from "@andrewkimjoseph/celina-sdk";
import { publicClient } from "./config";

export type DerivedGoClaimAccount = {
  eoaAddress: Hex;
  goClaimAccountAddress: Hex;
};

export async function deriveGoClaimAccount(
  privateKeyHex: Hex
): Promise<DerivedGoClaimAccount> {
  const { eoaAddress, smartAccountAddress } = await deriveSmartAccountAddress(
    privateKeyHex,
    // Cast: app viem vs celina-sdk's nested viem PublicClient types can diverge.
    publicClient as never
  );

  return {
    eoaAddress,
    goClaimAccountAddress: smartAccountAddress,
  };
}
