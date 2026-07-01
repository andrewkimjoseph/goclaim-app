"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSession } from "@/lib/hooks/useSession";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { copy } from "@/lib/copy";

const LOGOUT_TIMEOUT_MS = 5_000;

async function postLogoutWithTimeout() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function SessionWalletGuard() {
  const router = useRouter();
  const { authenticated, rootAddress, checked, clearSession } = useSession();
  const { address, isConnected, isReconnecting, isConnecting } = useAccount();
  const [signingOut, setSigningOut] = useState(false);
  const hasFired = useRef(false);

  useEffect(() => {
    if (checked && !authenticated) {
      hasFired.current = false;
      setSigningOut(false);
    }
  }, [checked, authenticated]);

  useEffect(() => {
    if (hasFired.current) return;
    if (!checked || !authenticated || !rootAddress) return;
    if (isReconnecting || isConnecting) return;
    if (!isConnected || !address) return;
    if (address.toLowerCase() === rootAddress.toLowerCase()) return;

    hasFired.current = true;
    setSigningOut(true);

    (async () => {
      try {
        await postLogoutWithTimeout();
      } catch {
        // best-effort: still clear client session and redirect
      } finally {
        clearSession();
        router.replace("/");
        setSigningOut(false);
      }
    })();
  }, [
    checked,
    authenticated,
    rootAddress,
    address,
    isConnected,
    isReconnecting,
    isConnecting,
    clearSession,
    router,
  ]);

  if (!signingOut) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell">
      <LoadingSpinner label={copy.auth.walletChangedSigningOut} />
    </div>
  );
}
