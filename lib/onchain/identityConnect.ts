import { encodeFunctionData, type Address, type Hex } from "viem";
import { taggedCalldata } from "./attribution";
import { identityAbi } from "./abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "./constants";
import { publicClient } from "./config";

export const IDENTITY_CONNECT_TARGET = IDENTITY_PROXY_ADDRESS;

export function encodeConnectAccount(goClaimAccountAddress: Address): Hex {
  return encodeFunctionData({
    abi: identityAbi,
    functionName: "connectAccount",
    args: [goClaimAccountAddress],
  });
}

export function encodeTaggedConnectAccount(goClaimAccountAddress: Address): Hex {
  return taggedCalldata(encodeConnectAccount(goClaimAccountAddress));
}

export async function readConnectedRoot(
  goClaimAccountAddress: Address
): Promise<Address> {
  return publicClient.readContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "getWhitelistedRoot",
    args: [goClaimAccountAddress],
  });
}

export async function readConnectedAccountsMapping(
  goClaimAccountAddress: Address
): Promise<Address> {
  return publicClient.readContract({
    address: IDENTITY_PROXY_ADDRESS,
    abi: identityAbi,
    functionName: "connectedAccounts",
    args: [goClaimAccountAddress],
  });
}
