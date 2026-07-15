import {
  decodeFunctionData,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { identityAbi } from "./abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "./constants";
import { publicClient } from "./config";
import { stripCelinaAttributionCalldata } from "./attribution";
import { getLinkStatus } from "./eligibility";

function isTransactionNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /could not be found/i.test(error.message);
}

export async function assertConnectAccountLinked(
  rootAddress: Address,
  goClaimAccountAddress: Address
): Promise<void> {
  const link = await getLinkStatus(goClaimAccountAddress, rootAddress);
  if (!link.linkComplete) {
    throw new Error("GoClaim account is not linked to user root on-chain");
  }
}

async function verifyConnectAccountTxDetails({
  txHash,
  rootAddress,
  goClaimAccountAddress,
}: {
  txHash: Hash;
  rootAddress: Address;
  goClaimAccountAddress: Address;
}): Promise<void> {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch (error) {
    if (isTransactionNotFoundError(error)) return;
    throw error;
  }

  if (receipt.status !== "success") {
    throw new Error("Transaction did not succeed");
  }

  let tx;
  try {
    tx = await publicClient.getTransaction({ hash: txHash });
  } catch (error) {
    if (isTransactionNotFoundError(error)) return;
    throw error;
  }

  if (tx.from.toLowerCase() !== rootAddress.toLowerCase()) {
    throw new Error("Transaction signer does not match user root wallet");
  }

  if (!tx.to || tx.to.toLowerCase() !== IDENTITY_PROXY_ADDRESS.toLowerCase()) {
    throw new Error("Transaction was not sent to GoodDollar identity contract");
  }

  const calldata = stripCelinaAttributionCalldata(tx.input as Hex);
  const decoded = decodeFunctionData({
    abi: identityAbi,
    data: calldata,
  });

  if (decoded.functionName !== "connectAccount") {
    throw new Error("Transaction is not a connectAccount call");
  }

  const [accountArg] = decoded.args as [Address];
  if (accountArg.toLowerCase() !== goClaimAccountAddress.toLowerCase()) {
    throw new Error("connectAccount target does not match GoClaim account");
  }
}

export async function verifyConnectAccountTx({
  txHash,
  rootAddress,
  goClaimAccountAddress,
}: {
  txHash: Hash;
  rootAddress: Address;
  goClaimAccountAddress: Address;
}): Promise<void> {
  await assertConnectAccountLinked(rootAddress, goClaimAccountAddress);
  await verifyConnectAccountTxDetails({
    txHash,
    rootAddress,
    goClaimAccountAddress,
  });
}
