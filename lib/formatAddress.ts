/** Shorten a hex address for display while keeping enough to identify it. */
export function truncateAddress(address: string): string {
  if (address.length <= 27) return address;
  return `${address.slice(0, 14)}…${address.slice(-10)}`;
}
