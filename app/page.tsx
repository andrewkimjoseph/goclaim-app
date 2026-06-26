"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ConnectSignIn } from "@/components/ConnectSignIn";
import { useSession } from "@/lib/hooks/useSession";
import { copy } from "@/lib/copy";

export default function LandingPage() {
  const router = useRouter();
  const { authenticated, checked } = useSession();

  useEffect(() => {
    if (checked && authenticated) {
      router.replace("/dashboard");
    }
  }, [checked, authenticated, router]);

  async function handleSuccess() {
    const createRes = await fetch("/api/agent/create", {
      method: "POST",
      credentials: "include",
    });
    if (createRes.ok) {
      router.push("/dashboard?onboarding=1");
    } else {
      router.push("/dashboard");
    }
  }

  if (checked && authenticated) {
    return (
      <div className="app-shell items-center justify-center">
        <p className="text-white/80 font-display">{copy.auth.openingDashboard}</p>
      </div>
    );
  }

  return (
    <div className="app-shell pb-4 min-h-screen">
      <header className="header-bar">
        <Link href="/">
          <BrandLogo size="nav" priority />
        </Link>
        <Link
          href="/faqs"
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.faqs.headerButton}
        </Link>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
          <BrandLogo size="hero" alt="" priority />
          <h1 className="font-display font-extrabold text-4xl tracking-tight leading-tight text-white">
            {copy.landing.headline}
          </h1>
          <p className="text-white/85 text-base leading-relaxed px-2">
            {copy.landing.subhead}
          </p>
        </div>

        <div className="w-full pb-2">
          <ConnectSignIn onSuccess={handleSuccess} variant="hero" />
        </div>

        <p className="text-center text-white/50 text-xs mt-4 px-2 pb-2">
          {copy.landing.footer}
        </p>
      </main>
    </div>
  );
}
