import { createPublicClient } from "viem";
import { celo } from "viem/chains";
import {
  createCeloRpcTransport,
  resolveServerRpcUrl,
} from "./rpcTransport";

export const rpcUrl = resolveServerRpcUrl();

export function getPimlicoApiKey(): string {
  const key = process.env.PIMLICO_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing PIMLICO_API_KEY");
  }
  return key;
}

export const publicClient = createPublicClient({
  chain: celo,
  transport: createCeloRpcTransport(rpcUrl),
});
