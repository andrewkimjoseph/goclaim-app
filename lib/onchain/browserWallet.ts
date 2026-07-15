import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { celo } from "viem/chains";
import { getWalletClient } from "wagmi/actions";
import { config } from "@/lib/wagmi";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;

export const browserPublicClient = createPublicClient({
  chain: celo,
  transport: drpcKey ? http(`https://lb.drpc.live/celo/${drpcKey}`) : http(),
});

/**
 * Broadcast Identity.connectAccount via wagmi, using a server-side
 * Celina prepareFunction call (avoiding celina-sdk in the client bundle).
 */
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

  const res = await fetch("/api/goclaim/prepare-connect", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rootAddress: account, goClaimAccountAddress }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to prepare connectAccount transaction");
  }

  const { to, data, value } = await res.json();

  return walletClient.sendTransaction({
    account,
    to: to as Address,
    data: data as Hex,
    value: BigInt(value ?? "0"),
  });
}