/** Shorten a hex address for display while keeping enough to identify it. */
export function truncateAddress(
  address: string,
  options?: { head?: number; tail?: number }
): string {
  const head = options?.head ?? 18;
  const tail = options?.tail ?? 12;
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
