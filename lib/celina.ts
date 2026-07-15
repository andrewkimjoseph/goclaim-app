import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import { rpcUrl } from "@/lib/onchain/config";

export const celina = createCelinaClient({
  rpcUrl: rpcUrl ?? "https://forno.celo.org",
  attributionTags: ["goclaim"],
  analyticsEnabled: true,
});
