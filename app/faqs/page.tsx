import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { FaqList } from "@/components/FaqList";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: "FAQs | GoClaim",
  description: "Frequently asked questions about GoClaim and autopilot GoodDollar UBI.",
};

export default function FaqsPage() {
  return (
    <div className="app-shell pb-6 min-h-screen">
      <header className="header-bar">
        <Link href="/">
          <BrandLogo size="nav" />
        </Link>
        <Link
          href="/"
          className="section-label-inverse hover:bg-white/10 transition-colors shrink-0"
        >
          {copy.faqs.backToHome}
        </Link>
      </header>

      <main className="flex-1 py-6 space-y-4">
        <div className="space-y-1">
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
            {copy.faqs.title}
          </h1>
          <p className="text-sm text-white/80">{copy.faqs.subtitle}</p>
        </div>

        <FaqList />
      </main>
    </div>
  );
}
