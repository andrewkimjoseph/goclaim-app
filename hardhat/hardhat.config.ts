import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import { type Address } from "viem";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env.local" });
dotenv.config({ path: "../.env" });

const rawPk = process.env.APP_PRIVATE_KEY ?? process.env.DEPLOYER_PK;
const infuraApiKey = process.env.INFURA_API_KEY;
const etherscanApiKey =
  process.env.ETHERSCAN_API_KEY ?? process.env.CELOSCAN_API_KEY;

const normalizedPk = rawPk
  ? ((rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`) as Address)
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
      {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
        },
      },
    ],
    overrides: {
      "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol": {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
        },
      },
      "contracts/ProxyImport.sol": {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
        },
      },
    },
  },
  networks: {
    hardhat: {},
    celoAlfajores: {
      url: infuraApiKey
        ? `https://celo-alfajores.infura.io/v3/${infuraApiKey}`
        : "https://alfajores-forno.celo-testnet.org",
      accounts: normalizedPk ? [normalizedPk] : [],
      chainId: 44787,
    },
    celo: {
      url: infuraApiKey
        ? `https://celo-mainnet.infura.io/v3/${infuraApiKey}`
        : "https://forno.celo.org",
      accounts: normalizedPk ? [normalizedPk] : [],
      chainId: 42220,
    },
  },
  sourcify: {
    enabled: true,
  },
  etherscan: etherscanApiKey
    ? {
        apiKey: etherscanApiKey,
        customChains: [
          {
            network: "celoAlfajores",
            chainId: 44787,
            urls: {
              apiURL: "https://api.etherscan.io/v2/api",
              browserURL: "https://alfajores.celoscan.io",
            },
          },
          {
            network: "celo",
            chainId: 42220,
            urls: {
              apiURL: "https://api.etherscan.io/v2/api",
              browserURL: "https://celoscan.io",
            },
          },
        ],
      }
    : undefined,
};

export default config;
