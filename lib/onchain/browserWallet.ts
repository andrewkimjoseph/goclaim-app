import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
  type EIP1193Provider,
} from "viem";
import { celo } from "viem/chains";
import {
  encodeTaggedConnectAccount,
  IDENTITY_CONNECT_TARGET,
} from "./connectAgent";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;

export const browserPublicClient = createPublicClient({
  chain: celo,
  transport: drpcKey ? http(`https://lb.drpc.live/celo/${drpcKey}`) : http(),
});

export async function sendTaggedConnectAccount({
  account,
  smartAccountAddress,
}: {
  account: Address;
  smartAccountAddress: Address;
}): Promise<Hash> {
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) {
    throw new Error("No wallet found. Open this in your wallet.");
  }

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: custom(provider),
  });

  return walletClient.sendTransaction({
    account,
    to: IDENTITY_CONNECT_TARGET,
    data: encodeTaggedConnectAccount(smartAccountAddress),
  });
}
