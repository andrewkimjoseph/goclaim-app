import {
  createPublicClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { celo } from "viem/chains";
import { getWalletClient } from "wagmi/actions";
import { config } from "@/lib/wagmi";
import { prepareConnectAccount } from "./celinaBrowser";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;

export const browserPublicClient = createPublicClient({
  chain: celo,
  transport: drpcKey ? http(`https://lb.drpc.live/celo/${drpcKey}`) : http(),
});

/**
 * Broadcast Identity.connectAccount via wagmi, using Celina prepareFunction
 * (same encode+tag path as MCP execute_contract_function).
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

  const prepared = await prepareConnectAccount(account, goClaimAccountAddress);
  const step = prepared.steps[0];
  if (!step?.to || !step.data) {
    throw new Error("Celina prepareFunction returned no connectAccount step.");
  }

  return walletClient.sendTransaction({
    account,
    to: step.to,
    data: step.data,
    value: BigInt(step.value ?? "0"),
  });
}
