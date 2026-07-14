export type ClaimDisplayStatus = {
  label: string;
  detail?: string;
};

const SKIP_REASONS: Record<string, string> = {
  already_claimed: "Claimed",
  not_whitelisted: "Not verified on GoodDollar",
  no_entitlement: "No GoClaim available yet",
  "No active GoClaim account": "GoClaim account not active",
  "No active smart account": "GoClaim account not active",
  "No active agent wallet": "GoClaim account not active",
};

export function formatClaimStatus(
  status: string,
  errorMsg?: string | null
): ClaimDisplayStatus {
  if (status === "success") {
    return { label: "GoClaimed" };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      detail: errorMsg ?? undefined,
    };
  }

  if (status === "skipped") {
    const reason = errorMsg ?? "";
    return {
      label: "Skipped",
      detail: SKIP_REASONS[reason] ?? (reason || undefined),
    };
  }

  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    detail: errorMsg ?? undefined,
  };
}
