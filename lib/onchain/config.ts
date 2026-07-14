import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const DRPC_API_KEY = process.env.DRPC_API_KEY;

export const rpcUrl = DRPC_API_KEY
  ? `https://lb.drpc.live/celo/${DRPC_API_KEY}`
  : undefined;

export function getPimlicoApiKey(): string {
  const key = process.env.PIMLICO_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing PIMLICO_API_KEY");
  }
  return key;
}

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(rpcUrl),
});
