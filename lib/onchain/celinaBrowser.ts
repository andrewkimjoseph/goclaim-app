import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import type { Address } from "viem";
import { identityAbi } from "./abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "./constants";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;

/** Browser Celina client — dual `goclaim` attribution on every prepare*. */
export const browserCelina = createCelinaClient({
  rpcUrl: drpcKey
    ? `https://lb.drpc.live/celo/${drpcKey}`
    : "https://forno.celo.org",
  attributionTags: ["goclaim"],
  analyticsEnabled: true,
});

/** Unsigned Identity.connectAccount step (Celina-tagged calldata). */
export function prepareConnectAccount(
  rootAddress: Address,
  goClaimAccountAddress: Address,
) {
  return browserCelina.contract.prepareFunction(rootAddress, {
    contractAddress: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "connectAccount",
    functionArgs: [goClaimAccountAddress],
  });
}
