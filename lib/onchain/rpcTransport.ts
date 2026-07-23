import { fallback, http, type Transport } from "viem";

export const FORNO_CELO_RPC_URL = "https://forno.celo.org";

function drpcUrl(apiKey: string): string {
  return `https://lb.drpc.live/celo/${apiKey}`;
}

/**
 * Server RPC: CELO_RPC_URL → DRPC_API_KEY → Forno.
 */
export function resolveServerRpcUrl(): string {
  const override = process.env.CELO_RPC_URL?.trim();
  if (override) return override;

  const drpcKey = process.env.DRPC_API_KEY?.trim();
  if (drpcKey) return drpcUrl(drpcKey);

  return FORNO_CELO_RPC_URL;
}

/**
 * Browser RPC: NEXT_PUBLIC_CELO_RPC_URL → NEXT_PUBLIC_DRPC_API_KEY → Forno.
 */
export function resolveBrowserRpcUrl(): string {
  const override = process.env.NEXT_PUBLIC_CELO_RPC_URL?.trim();
  if (override) return override;

  const drpcKey = process.env.NEXT_PUBLIC_DRPC_API_KEY?.trim();
  if (drpcKey) return drpcUrl(drpcKey);

  return FORNO_CELO_RPC_URL;
}

/**
 * Prefer primary RPC; fall back to Forno on transport errors
 * (including method-not-available / -32601 from flaky upstreams).
 */
export function createCeloRpcTransport(primaryUrl: string): Transport {
  if (primaryUrl === FORNO_CELO_RPC_URL) {
    return http(FORNO_CELO_RPC_URL);
  }
  return fallback([http(primaryUrl), http(FORNO_CELO_RPC_URL)]);
}
