import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GoClaim history | GoClaim",
  description: "Full history of your GoClaim runs.",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
