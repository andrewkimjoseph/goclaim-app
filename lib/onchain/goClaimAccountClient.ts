import { type Hex } from "viem";
import { createAAClient, type AAClient } from "@andrewkimjoseph/celina-sdk";
import { getPimlicoApiKey, publicClient } from "./config";

export type GoClaimAccountClientBundle = {
  eoaAddress: Hex;
  goClaimAccountAddress: Hex;
  aa: AAClient;
};

export async function createGoClaimAccountClientFromPrivateKey(
  privateKeyHex: Hex
): Promise<GoClaimAccountClientBundle> {
  const aa = await createAAClient({
    owner: privateKeyHex,
    gasSponsorship: {
      provider: "pimlico",
      pimlico: { apiKey: getPimlicoApiKey() },
    },
    attributionTags: ["goclaim"],
    // Cast: app viem vs celina-sdk's nested viem PublicClient types can diverge.
    publicClient: publicClient as never,
  });

  return {
    eoaAddress: aa.eoaAddress,
    goClaimAccountAddress: aa.smartAccountAddress,
    aa,
  };
}
