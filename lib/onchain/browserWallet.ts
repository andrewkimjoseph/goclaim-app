import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
} from "viem";
import { celo } from "viem/chains";
import {
  encodeTaggedConnectAccount,
  IDENTITY_CONNECT_TARGET,
} from "./connectAgent";

const CELO_CHAIN_ID_HEX = "0xa4ec";

const CELO_CHAIN_PARAMS = {
  chainId: CELO_CHAIN_ID_HEX,
  chainName: "Celo Mainnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
  blockExplorerUrls: ["https://celoscan.io"],
} as const;

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;
const celoTransport = drpcKey
  ? http(`https://lb.drpc.live/celo/${drpcKey}`)
  : http();

export const browserPublicClient = createPublicClient({
  chain: celo,
  transport: celoTransport,
});

type EthereumProvider = Parameters<typeof custom>[0];

export function getInjectedProvider(): EthereumProvider {
  if (typeof window === "undefined") {
    throw new Error("Wallet provider is only available in the browser.");
  }

  const provider = (
    window as Window & { ethereum?: EthereumProvider }
  ).ethereum;

  if (!provider) {
    throw new Error("No wallet found. Install or open a Celo-compatible wallet.");
  }

  return provider;
}

export async function ensureCeloChain(provider: EthereumProvider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CELO_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const switchError = error as { code?: number };
    if (switchError.code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addChain",
      params: [CELO_CHAIN_PARAMS],
    });
  }
}

export function createBrowserWalletClient(account: Address) {
  const provider = getInjectedProvider();
  return createWalletClient({
    account,
    chain: celo,
    transport: custom(provider),
  });
}

export async function sendTaggedConnectAccount({
  account,
  smartAccountAddress,
}: {
  account: Address;
  smartAccountAddress: Address;
}): Promise<Hash> {
  const provider = getInjectedProvider();
  await ensureCeloChain(provider);

  const walletClient = createBrowserWalletClient(account);
  const data = encodeTaggedConnectAccount(smartAccountAddress);

  return walletClient.sendTransaction({
    account,
    chain: celo,
    to: IDENTITY_CONNECT_TARGET,
    data,
  });
}
