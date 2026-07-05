import { expect } from "chai";
import hre from "hardhat";
import {
  type Address,
  type Hex,
  encodeFunctionData,
  createWalletClient,
  createPublicClient,
  custom,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const PROXY_ARTIFACT =
  "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";

const PK = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
] as const;

const TOKEN = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as Address;

async function deployGoClaimFixture() {
  const provider = hre.network.provider;
  const transport = custom({
    async request({ method, params }) {
      return provider.send(method, params as unknown[]);
    },
  });
  const publicClient = createPublicClient({ chain: hardhat, transport });
  const ownerClient = createWalletClient({
    chain: hardhat,
    transport,
    account: privateKeyToAccount(PK[0]),
  });
  const smartAccountClient = createWalletClient({
    chain: hardhat,
    transport,
    account: privateKeyToAccount(PK[1]),
  });
  const otherClient = createWalletClient({
    chain: hardhat,
    transport,
    account: privateKeyToAccount(PK[2]),
  });

  const owner = ownerClient.account.address;
  const smartAccount = smartAccountClient.account.address;
  const other = otherClient.account.address;
  const signerAccount = privateKeyToAccount(PK[0]);

  const goClaimArtifact = await hre.artifacts.readArtifact("GoClaim");
  const proxyArtifact = await hre.artifacts.readArtifact(PROXY_ARTIFACT);
  const mockIdentityArtifact = await hre.artifacts.readArtifact("MockIdentity");

  const mockIdentityHash = await ownerClient.deployContract({
    abi: mockIdentityArtifact.abi,
    bytecode: mockIdentityArtifact.bytecode as Hex,
  });
  const mockIdentityRcpt = await publicClient.waitForTransactionReceipt({
    hash: mockIdentityHash,
  });
  const mockIdentity = mockIdentityRcpt.contractAddress!;

  const initData = encodeFunctionData({
    abi: goClaimArtifact.abi,
    functionName: "initialize",
    args: [owner, signerAccount.address, mockIdentity],
  });

  const implHash = await ownerClient.deployContract({
    abi: goClaimArtifact.abi,
    bytecode: goClaimArtifact.bytecode as Hex,
  });
  const implRcpt = await publicClient.waitForTransactionReceipt({ hash: implHash });
  const implAddress = implRcpt.contractAddress!;

  const proxyHash = await ownerClient.deployContract({
    abi: proxyArtifact.abi,
    bytecode: proxyArtifact.bytecode as Hex,
    args: [implAddress, initData],
  });
  const proxyRcpt = await publicClient.waitForTransactionReceipt({ hash: proxyHash });
  const goClaim = proxyRcpt.contractAddress!;

  async function signAccountCreated(
    smartAccountAddress: Address,
    nonce: bigint
  ) {
    return signerAccount.signTypedData({
      domain: {
        name: "GoClaim",
        version: "1",
        chainId: BigInt(hardhat.id),
        verifyingContract: goClaim,
      },
      types: {
        AccountCreatedRequest: [
          { name: "smartAccountAddress", type: "address" },
          { name: "nonce", type: "uint256" },
        ],
      },
      primaryType: "AccountCreatedRequest",
      message: { smartAccountAddress, nonce },
    });
  }

  async function signAccountConnected(
    smartAccountAddress: Address,
    whitelistedRoot: Address,
    nonce: bigint
  ) {
    return signerAccount.signTypedData({
      domain: {
        name: "GoClaim",
        version: "1",
        chainId: BigInt(hardhat.id),
        verifyingContract: goClaim,
      },
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
  }

  async function signUbiClaimed(
    smartAccountAddress: Address,
    whitelistedRoot: Address,
    token: Address,
    amount: bigint,
    nonce: bigint
  ) {
    return signerAccount.signTypedData({
      domain: {
        name: "GoClaim",
        version: "1",
        chainId: BigInt(hardhat.id),
        verifyingContract: goClaim,
      },
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
  }

  async function signTokenTransferred(
    smartAccountAddress: Address,
    recipient: Address,
    token: Address,
    amount: bigint,
    nonce: bigint
  ) {
    return signerAccount.signTypedData({
      domain: {
        name: "GoClaim",
        version: "1",
        chainId: BigInt(hardhat.id),
        verifyingContract: goClaim,
      },
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
  }

  return {
    publicClient,
    ownerClient,
    smartAccountClient,
    otherClient,
    goClaimArtifact,
    mockIdentityArtifact,
    owner,
    smartAccount,
    other,
    signerAccount,
    goClaim,
    mockIdentity,
    signAccountCreated,
    signAccountConnected,
    signUbiClaimed,
    signTokenTransferred,
  };
}

describe("GoClaim", function () {
  it("logs account created with valid signature", async function () {
    const fx = await deployGoClaimFixture();
    const nonce = 1n;
    const signature = await fx.signAccountCreated(fx.smartAccount, nonce);

    const hash = await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logAccountCreated",
      args: [fx.smartAccount, nonce, signature],
    });
    await fx.publicClient.waitForTransactionReceipt({ hash });

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "isAccountCreated",
        args: [fx.smartAccount],
      })
    ).to.equal(true);
  });

  it("logs account connected when identity root matches", async function () {
    const fx = await deployGoClaimFixture();
    const root = fx.other;

    await fx.ownerClient.writeContract({
      address: fx.mockIdentity,
      abi: fx.mockIdentityArtifact.abi,
      functionName: "setWhitelistedRoot",
      args: [fx.smartAccount, root],
    });

    const nonce = 2n;
    const signature = await fx.signAccountConnected(
      fx.smartAccount,
      root,
      nonce
    );

    const hash = await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logAccountConnected",
      args: [fx.smartAccount, root, nonce, signature],
    });
    await fx.publicClient.waitForTransactionReceipt({ hash });

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "isAccountConnected",
        args: [fx.smartAccount],
      })
    ).to.equal(true);
  });

  it("logs UBI claimed and token transferred", async function () {
    const fx = await deployGoClaimFixture();
    const amount = parseEther("10");
    const root = fx.other;

    const ubiNonce = 3n;
    const ubiSig = await fx.signUbiClaimed(
      fx.smartAccount,
      root,
      TOKEN,
      amount,
      ubiNonce
    );

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logUbiClaimed",
      args: [fx.smartAccount, root, TOKEN, amount, ubiNonce, ubiSig],
    });

    const transferNonce = 4n;
    const transferSig = await fx.signTokenTransferred(
      fx.smartAccount,
      root,
      TOKEN,
      amount,
      transferNonce
    );

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logTokenTransferred",
      args: [fx.smartAccount, root, TOKEN, amount, transferNonce, transferSig],
    });

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "isSignatureUsed",
        args: [transferSig],
      })
    ).to.equal(true);
  });

  it("reverts when sender is not smart account", async function () {
    const fx = await deployGoClaimFixture();
    const nonce = 5n;
    const signature = await fx.signAccountCreated(fx.smartAccount, nonce);

    await expect(
      fx.otherClient.writeContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "logAccountCreated",
        args: [fx.smartAccount, nonce, signature],
      })
    ).to.be.rejectedWith(/sender must be smartAccountAddress/);
  });

  it("reverts on duplicate account created", async function () {
    const fx = await deployGoClaimFixture();
    const nonce = 6n;
    const signature = await fx.signAccountCreated(fx.smartAccount, nonce);

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logAccountCreated",
      args: [fx.smartAccount, nonce, signature],
    });

    const nonce2 = 7n;
    const signature2 = await fx.signAccountCreated(fx.smartAccount, nonce2);

    await expect(
      fx.smartAccountClient.writeContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "logAccountCreated",
        args: [fx.smartAccount, nonce2, signature2],
      })
    ).to.be.rejectedWith(/account already created/);
  });

  it("reverts on signature replay", async function () {
    const fx = await deployGoClaimFixture();
    const amount = parseEther("1");
    const root = fx.other;
    const nonce = 8n;
    const signature = await fx.signUbiClaimed(
      fx.smartAccount,
      root,
      TOKEN,
      amount,
      nonce
    );

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logUbiClaimed",
      args: [fx.smartAccount, root, TOKEN, amount, nonce, signature],
    });

    await expect(
      fx.smartAccountClient.writeContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "logUbiClaimed",
        args: [fx.smartAccount, root, TOKEN, amount, nonce, signature],
      })
    ).to.be.rejectedWith(/signature already used/);
  });

  it("reverts connect when whitelisted root mismatch", async function () {
    const fx = await deployGoClaimFixture();
    const root = fx.other;
    const wrongRoot = fx.owner;

    await fx.ownerClient.writeContract({
      address: fx.mockIdentity,
      abi: fx.mockIdentityArtifact.abi,
      functionName: "setWhitelistedRoot",
      args: [fx.smartAccount, root],
    });

    const nonce = 9n;
    const signature = await fx.signAccountConnected(
      fx.smartAccount,
      wrongRoot,
      nonce
    );

    await expect(
      fx.smartAccountClient.writeContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "logAccountConnected",
        args: [fx.smartAccount, wrongRoot, nonce, signature],
      })
    ).to.be.rejectedWith(/whitelistedRoot mismatch/);
  });

  it("accepts signatures from updated signer", async function () {
    const fx = await deployGoClaimFixture();
    const newSigner = privateKeyToAccount(PK[2]);

    await fx.ownerClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "setGoClaimSigner",
      args: [newSigner.address],
    });

    const nonce = 10n;
    const signature = await newSigner.signTypedData({
      domain: {
        name: "GoClaim",
        version: "1",
        chainId: BigInt(hardhat.id),
        verifyingContract: fx.goClaim,
      },
      types: {
        AccountCreatedRequest: [
          { name: "smartAccountAddress", type: "address" },
          { name: "nonce", type: "uint256" },
        ],
      },
      primaryType: "AccountCreatedRequest",
      message: { smartAccountAddress: fx.smartAccount, nonce },
    });

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logAccountCreated",
      args: [fx.smartAccount, nonce, signature],
    });

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "goClaimSigner",
        args: [],
      })
    ).to.equal(newSigner.address);
  });

  it("upgrades and preserves state", async function () {
    const fx = await deployGoClaimFixture();
    const nonce = 11n;
    const signature = await fx.signAccountCreated(fx.smartAccount, nonce);

    await fx.smartAccountClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "logAccountCreated",
      args: [fx.smartAccount, nonce, signature],
    });

    const newImplHash = await fx.ownerClient.deployContract({
      abi: fx.goClaimArtifact.abi,
      bytecode: fx.goClaimArtifact.bytecode as Hex,
    });
    const newImplRcpt = await fx.publicClient.waitForTransactionReceipt({
      hash: newImplHash,
    });
    const newImpl = newImplRcpt.contractAddress!;

    await fx.ownerClient.writeContract({
      address: fx.goClaim,
      abi: fx.goClaimArtifact.abi,
      functionName: "upgradeToAndBumpVersion",
      args: [newImpl, 2n],
    });

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "version",
        args: [],
      })
    ).to.equal(2n);

    expect(
      await fx.publicClient.readContract({
        address: fx.goClaim,
        abi: fx.goClaimArtifact.abi,
        functionName: "isAccountCreated",
        args: [fx.smartAccount],
      })
    ).to.equal(true);
  });
});
