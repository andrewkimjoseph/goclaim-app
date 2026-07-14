import { encodeFunctionData, type Address, type Hash, type Hex } from "viem";
import { celo } from "viem/chains";
import { goClaimAbi } from "../abis/goClaim";
import { GOCLAIM_PROXY_ADDRESS } from "../constants";
import {
  isGoClaimSigningConfigured,
  signAccountConnectedRequest,
  signAccountCreatedRequest,
} from "./signatures";
import { createGoClaimAccountClientFromPrivateKey } from "../goClaimAccountClient";

export type GoClaimLogResult = {
  transactionHash: Hash;
  userOpHash: Hash;
};

async function sendGoClaimUserOp(
  privateKeyHex: Hex,
  data: Hex,
  summary: string
): Promise<GoClaimLogResult> {
  const { aa } = await createGoClaimAccountClientFromPrivateKey(privateKeyHex);

  const result = await aa.sendPreparedFlow({
    preparedFlow: true,
    chainId: celo.id,
    from: aa.smartAccountAddress,
    summary,
    steps: [
      {
        kind: "contract",
        to: GOCLAIM_PROXY_ADDRESS,
        data,
        description: summary,
      },
    ],
  });

  if (!result.success) {
    throw new Error("GoClaim log UserOp failed");
  }

  return {
    userOpHash: result.userOpHashes[0]!,
    transactionHash: result.transactionHashes[0]!,
  };
}

export async function submitLogAccountCreated(
  privateKeyHex: Hex,
  goClaimAccountAddress: Address
): Promise<GoClaimLogResult | null> {
  if (!isGoClaimSigningConfigured()) {
    return null;
  }

  const { nonce, signature } = await signAccountCreatedRequest(
    goClaimAccountAddress
  );

  const data = encodeFunctionData({
    abi: goClaimAbi,
    functionName: "logAccountCreated",
    args: [goClaimAccountAddress, nonce, signature],
  });

  return sendGoClaimUserOp(privateKeyHex, data, "GoClaim logAccountCreated");
}

export async function submitLogAccountConnected(
  privateKeyHex: Hex,
  goClaimAccountAddress: Address,
  whitelistedRoot: Address
): Promise<GoClaimLogResult | null> {
  if (!isGoClaimSigningConfigured()) {
    return null;
  }

  const { nonce, signature } = await signAccountConnectedRequest(
    goClaimAccountAddress,
    whitelistedRoot
  );

  const data = encodeFunctionData({
    abi: goClaimAbi,
    functionName: "logAccountConnected",
    args: [goClaimAccountAddress, whitelistedRoot, nonce, signature],
  });

  return sendGoClaimUserOp(privateKeyHex, data, "GoClaim logAccountConnected");
}

export {
  isGoClaimSigningConfigured,
  signUbiClaimedRequest,
  signTokenTransferredRequest,
} from "./signatures";
