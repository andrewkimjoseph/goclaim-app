import { copy } from "@/lib/copy";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 status-pill bg-accent text-white shrink-0">
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5l3 3 7-7" />
      </svg>
      {copy.auth.verifiedBadge}
    </span>
  );
}
