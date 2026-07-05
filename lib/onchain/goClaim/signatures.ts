import { type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GOCLAIM_PROXY_ADDRESS } from "../constants";

function getAppPrivateKey(): Hex {
  const raw = process.env.APP_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("Missing APP_PRIVATE_KEY");
  }
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export function isGoClaimSigningConfigured(): boolean {
  return Boolean(process.env.APP_PRIVATE_KEY?.trim());
}

export function getGoClaimSignerAccount() {
  return privateKeyToAccount(getAppPrivateKey());
}

function createGoClaimDomain(contractAddress: Address) {
  return {
    name: "GoClaim" as const,
    version: "1" as const,
    chainId: BigInt(42220),
    verifyingContract: contractAddress,
  };
}

export function generateRandomNonce(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "0x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}

export async function signAccountCreatedRequest(
  smartAccountAddress: Address,
  nonce: bigint = generateRandomNonce()
) {
  const account = getGoClaimSignerAccount();
  const contractAddress = GOCLAIM_PROXY_ADDRESS;
  const signature = await account.signTypedData({
    domain: createGoClaimDomain(contractAddress),
    types: {
      AccountCreatedRequest: [
        { name: "smartAccountAddress", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "AccountCreatedRequest",
    message: { smartAccountAddress, nonce },
  });
  return { nonce, signature };
}

export async function signAccountConnectedRequest(
  smartAccountAddress: Address,
  whitelistedRoot: Address,
  nonce: bigint = generateRandomNonce()
) {
  const account = getGoClaimSignerAccount();
  const contractAddress = GOCLAIM_PROXY_ADDRESS;
  const signature = await account.signTypedData({
    domain: createGoClaimDomain(contractAddress),
    types: {
      AccountConnectedRequest: [
        { name: "smartAccountAddress", type: "address" },
        { name: "whitelistedRoot", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "AccountConnectedRequest",
    message: { smartAccountAddress, whitelistedRoot, nonce },
  });
  return { nonce, signature };
}

export async function signUbiClaimedRequest(
  smartAccountAddress: Address,
  whitelistedRoot: Address,
  token: Address,
  amount: bigint,
  nonce: bigint = generateRandomNonce()
) {
  const account = getGoClaimSignerAccount();
  const contractAddress = GOCLAIM_PROXY_ADDRESS;
  const signature = await account.signTypedData({
    domain: createGoClaimDomain(contractAddress),
    types: {
      UbiClaimedRequest: [
        { name: "smartAccountAddress", type: "address" },
        { name: "whitelistedRoot", type: "address" },
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "UbiClaimedRequest",
    message: {
      smartAccountAddress,
      whitelistedRoot,
      token,
      amount,
      nonce,
    },
  });
  return { nonce, signature };
}

export async function signTokenTransferredRequest(
  smartAccountAddress: Address,
  recipient: Address,
  token: Address,
  amount: bigint,
  nonce: bigint = generateRandomNonce()
) {
  const account = getGoClaimSignerAccount();
  const contractAddress = GOCLAIM_PROXY_ADDRESS;
  const signature = await account.signTypedData({
    domain: createGoClaimDomain(contractAddress),
    types: {
      TokenTransferredRequest: [
        { name: "smartAccountAddress", type: "address" },
        { name: "recipient", type: "address" },
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "TokenTransferredRequest",
    message: { smartAccountAddress, recipient, token, amount, nonce },
  });
  return { nonce, signature };
}
