import { type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { publicClient } from "./config";

export type SmartAccountResult = {
  eoaAddress: Hex;
  smartAccountAddress: Hex;
};

export async function createSmartAccount(
  privateKeyHex: Hex
): Promise<SmartAccountResult> {
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
    smartAccountAddress: smartAccount.address,
  };
}
