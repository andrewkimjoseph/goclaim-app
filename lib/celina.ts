import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import { rpcUrl } from "@/lib/onchain/config";

export const celina = createCelinaClient({
  rpcUrl,
  attributionTags: ["goclaim"],
  analyticsDeviceId: "goclaim_app",
});
