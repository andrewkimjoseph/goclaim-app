import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const emptyModuleAbs = path.join(projectRoot, "lib/empty-module.ts");
const emptyModuleRel = "./lib/empty-module.ts";

/** Package roots + known @x402 subpaths resolved by @coinbase/cdp-sdk. */
const optionalPeerIds = [
  "@base-org/account",
  "@x402/core",
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/extensions",
  "@x402/svm",
  "@x402/svm/exact/client",
  "@react-native-async-storage/async-storage",
];

const turbopackAliases = Object.fromEntries(
  optionalPeerIds.map((id) => [id, emptyModuleRel]),
);

const webpackAliases = Object.fromEntries(
  optionalPeerIds.map((id) => [id, emptyModuleAbs]),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
  // porto (wagmi connector) .d.ts re-exports ../src/*.ts with invalid types for Next's tsc pass
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  compiler: {
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
    },
  },
  turbopack: {
    root: projectRoot,
    resolveAlias: turbopackAliases,
  },
  webpack: (config, { webpack }) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      ...webpackAliases,
    };
    // Catch any additional @x402 subpaths.
    config.plugins ??= [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@x402\/(core|evm|extensions|svm)(\/.*)?$/,
        emptyModuleAbs,
      ),
    );
    return config;
  },
  allowedDevOrigins: ["192.168.1.83"],
};

export default nextConfig;
