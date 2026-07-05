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
    root: import.meta.dirname,
    resolveAlias: {
      "@react-native-async-storage/async-storage": {
        browser: "./lib/empty-module.ts",
      },
    },
  },
  allowedDevOrigins: ["192.168.1.83"],
};

export default nextConfig;
