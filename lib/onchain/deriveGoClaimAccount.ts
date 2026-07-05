import { type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { publicClient } from "./config";

export type DerivedGoClaimAccount = {
  eoaAddress: Hex;
  goClaimAccountAddress: Hex;
};

export async function deriveGoClaimAccount(
  privateKeyHex: Hex
): Promise<DerivedGoClaimAccount> {
  const eoaAccount = privateKeyToAccount(privateKeyHex);

  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: eoaAccount,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  return {
    eoaAddress: eoaAccount.address,
    goClaimAccountAddress: smartAccount.address,
  };
}
