import type { Metadata } from "next";
import { FaqHeaderNav } from "@/components/FaqHeaderNav";
import { FaqList } from "@/components/FaqList";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: "FAQs | GoClaim",
  description: "Frequently asked questions about GoClaim and autopilot GoodDollar UBI.",
};

export default function FaqsPage() {
  return (
    <div className="app-shell app-shell-pinned">
      <FaqHeaderNav />

      <main className="app-shell-scroll py-6 space-y-4">
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
