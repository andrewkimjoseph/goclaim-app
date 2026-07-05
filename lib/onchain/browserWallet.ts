import {
  createPublicClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { celo } from "viem/chains";
import { getWalletClient } from "wagmi/actions";
import { config } from "@/lib/wagmi";
import {
  encodeTaggedConnectAccount,
  IDENTITY_CONNECT_TARGET,
} from "./identityConnect";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;

export const browserPublicClient = createPublicClient({
  chain: celo,
  transport: drpcKey ? http(`https://lb.drpc.live/celo/${drpcKey}`) : http(),
});

export async function sendTaggedConnectAccount({
  account,
  goClaimAccountAddress,
}: {
  account: Address;
  goClaimAccountAddress: Address;
}): Promise<Hash> {
  const walletClient = await getWalletClient(config, { chainId: celo.id });
  if (!walletClient) {
    throw new Error("Connect your wallet first.");
  }

  return walletClient.sendTransaction({
    account,
    to: IDENTITY_CONNECT_TARGET,
    data: encodeTaggedConnectAccount(goClaimAccountAddress),
  });
}
