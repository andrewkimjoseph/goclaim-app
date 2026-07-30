/** New GoClaim enrollment. Set GOCLAIM_ACCOUNT_CREATION_ENABLED=false to pause. */
export function isAccountCreationEnabled(): boolean {
  return process.env.GOCLAIM_ACCOUNT_CREATION_ENABLED !== "false";
}

export class AccountCreationPausedError extends Error {
  readonly code = "ACCOUNT_CREATION_PAUSED" as const;

  constructor(message = "GoClaim account creation is paused") {
    super(message);
    this.name = "AccountCreationPausedError";
  }
}
