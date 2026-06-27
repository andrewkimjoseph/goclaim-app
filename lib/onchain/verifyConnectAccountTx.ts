import {
  decodeFunctionData,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { identityAbi } from "./abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "./constants";
import { publicClient } from "./config";
import { getLinkStatus } from "./eligibility";

export async function verifyConnectAccountTx({
  txHash,
  rootAddress,
  smartAccountAddress,
}: {
  txHash: Hash;
  rootAddress: Address;
  smartAccountAddress: Address;
}): Promise<void> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  if (receipt.status !== "success") {
    throw new Error("Transaction did not succeed");
  }

  const tx = await publicClient.getTransaction({ hash: txHash });

  if (tx.from.toLowerCase() !== rootAddress.toLowerCase()) {
    throw new Error("Transaction signer does not match user root wallet");
  }

  if (!tx.to || tx.to.toLowerCase() !== IDENTITY_PROXY_ADDRESS.toLowerCase()) {
    throw new Error("Transaction was not sent to GoodDollar identity contract");
  }

  const decoded = decodeFunctionData({
    abi: identityAbi,
    data: tx.input as Hex,
  });

  if (decoded.functionName !== "connectAccount") {
    throw new Error("Transaction is not a connectAccount call");
  }

  const [accountArg] = decoded.args as [Address];
  if (accountArg.toLowerCase() !== smartAccountAddress.toLowerCase()) {
    throw new Error("connectAccount target does not match agent smart account");
  }

  const link = await getLinkStatus(smartAccountAddress, rootAddress);
  if (!link.linkComplete) {
    throw new Error("Smart account is not linked to user root on-chain");
  }
}
