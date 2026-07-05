export function friendlyConnectError(err?: { message?: string } | null): string {
  if (!err) return "Transaction failed";
  const m = (err.message ?? "").toString();
  if (/Connect your wallet first/i.test(m)) {
    return "Connect your wallet first.";
  }
  if (/already connected/i.test(m)) {
    return "This GoClaim account is already linked to an identity.";
  }
  if (/invalid account/i.test(m)) {
    return "This GoClaim account cannot be linked (already whitelisted or blacklisted).";
  }
  if (/not whitelisted/i.test(m)) {
    return "Your root wallet is not verified. Re-verify in GoodDollar and try again.";
  }
  if (/User rejected|denied|rejected the request/i.test(m)) {
    return "You cancelled the transaction.";
  }
  if (/insufficient funds|gas required/i.test(m)) {
    return "Not enough CELO for gas. Add funds to your root wallet and try again.";
  }
  if (/internal error|Request Arguments/i.test(m)) {
    return "Transaction failed. Try again.";
  }
  if (/An internal error was received/i.test(m)) {
    return "Transaction failed. Try again.";
  }
  return m.slice(0, 80);
}

export function friendlySignInError(err?: { message?: string } | null): string {
  if (!err) return "Sign-in failed";
  const m = (err.message ?? "").toString();
  if (/User rejected|denied|rejected the request/i.test(m)) {
    return "You cancelled the sign-in.";
  }
  return m.slice(0, 80) || "Sign-in failed";
}
