"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { MiniPayAutoConnect } from "@/components/MiniPayAutoConnect";
import { config } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#F83028",
            accentColorForeground: "#FFFFFF",
            borderRadius: "none",
          })}
        >
          <MiniPayAutoConnect />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
