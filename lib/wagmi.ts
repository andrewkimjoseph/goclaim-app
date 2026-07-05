import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  valoraWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";

const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY;
const celoTransport = drpcKey
  ? http(`https://lb.drpc.live/celo/${drpcKey}`)
  : http();

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (typeof window !== "undefined" && !walletConnectProjectId) {
  console.warn(
    "[GoClaim] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is unset — mobile browser wallet connect will not work."
  );
}

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        walletConnectWallet,
        injectedWallet,
        rabbyWallet,
        metaMaskWallet,
        valoraWallet,
      ],
    },
  ],
  {
    appName: "GoClaim",
    projectId: walletConnectProjectId,
  }
);

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((window as any).ethereum?.isMiniPay);
}

export const config = createConfig({
  chains: [celo],
  connectors,
  transports: {
    [celo.id]: celoTransport,
  },
  ssr: true,
});
