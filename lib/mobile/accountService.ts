// Account deletion for the mobile app (Apple Guideline 5.1.1: an app that creates
// accounts must let the user delete theirs). Deletion is best-effort on the Apple
// side — we attempt to revoke any stored Apple refresh tokens, but a revocation
// failure never blocks removing the user's data. Composed over ports so it is
// unit-testable without a database or network.

export interface AccountDeletionStore {
  /** Apple refresh tokens stored for this account (empty when none were ever obtained). */
  appleRefreshTokens(accountId: string): Promise<string[]>;
  /** Permanently remove the account and all of its data (sessions, idempotency, user rows). */
  purge(accountId: string): Promise<void>;
}

export interface AppleRevoker {
  revoke(refreshToken: string): Promise<void>;
}

export interface AccountDeps {
  store: AccountDeletionStore;
  appleRevoker: AppleRevoker;
}

export async function deleteAccount(accountId: string, deps: AccountDeps): Promise<void> {
  const tokens = await deps.store.appleRefreshTokens(accountId);
  for (const token of tokens) {
    try {
      await deps.appleRevoker.revoke(token);
    } catch (err) {
      // Best-effort: log and continue so a user can always delete their data.
      console.error("apple token revocation failed", err);
    }
  }
  await deps.store.purge(accountId);
}
