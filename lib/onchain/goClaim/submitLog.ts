import { encodeFunctionData, type Address, type Hash, type Hex } from "viem";
import { goClaimAbi } from "../abis/goClaim";
import { GOCLAIM_PROXY_ADDRESS } from "../constants";
import { appendDataSuffix } from "../attribution";
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
  data: Hex
): Promise<GoClaimLogResult> {
  const { goClaimAccountClient } =
    await createGoClaimAccountClientFromPrivateKey(privateKeyHex);

  const userOpHash = await goClaimAccountClient.sendUserOperation({
    calls: [
      {
        to: GOCLAIM_PROXY_ADDRESS,
        data: appendDataSuffix(data),
      },
    ],
  });

  const receipt = await goClaimAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  if (!receipt.success) {
    throw new Error("GoClaim log UserOp failed");
  }

  return {
    userOpHash,
    transactionHash: receipt.receipt.transactionHash,
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

  return sendGoClaimUserOp(privateKeyHex, data);
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

  return sendGoClaimUserOp(privateKeyHex, data);
}

export {
  isGoClaimSigningConfigured,
  signUbiClaimedRequest,
  signTokenTransferredRequest,
} from "./signatures";
