import { http, type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { pimlicoUrl, publicClient } from "./config";

export async function createGoClaimAccountClientFromPrivateKey(
  privateKeyHex: Hex
) {
  const eoaAccount = privateKeyToAccount(privateKeyHex);

  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: eoaAccount,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl()),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const goClaimAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: celo,
    bundlerTransport: http(pimlicoUrl()),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  return {
    eoaAddress: eoaAccount.address,
    goClaimAccountAddress: smartAccount.address,
    goClaimAccountClient,
  };
}
