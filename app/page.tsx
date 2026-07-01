"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ConnectSignIn } from "@/components/ConnectSignIn";
import { GettingStartedHero } from "@/components/GettingStartedHero";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSession } from "@/lib/hooks/useSession";
import { copy } from "@/lib/copy";

export default function LandingPage() {
  const router = useRouter();
  const { checked } = useSession();

  function handleSuccess() {
    router.push("/dashboard");
  }

  if (!checked) {
    return (
      <div className="app-shell items-center justify-center">
        <LoadingSpinner label={copy.auth.checkingSession} />
      </div>
    );
  }

  return (
    <div className="app-shell pb-4 min-h-screen">
      <header className="header-bar" style={{ viewTransitionName: "site-header" }}>
        <Link href="/">
          <BrandLogo size="nav" priority />
        </Link>
        <Link
          href="/faqs"
          transitionTypes={["nav-forward"]}
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.faqs.headerButton}
        </Link>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <GettingStartedHero
            headline={copy.landing.headline}
            subhead={copy.landing.subhead}
            priority
          />
        </div>

        <div className="w-full pb-2">
          <ConnectSignIn onSuccess={handleSuccess} variant="hero" />
        </div>
      </main>
    </div>
  );
}
