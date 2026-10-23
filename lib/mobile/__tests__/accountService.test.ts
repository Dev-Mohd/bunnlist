import { describe, it, expect, vi } from "vitest";
import { deleteAccount, type AccountDeletionStore, type AppleRevoker } from "../accountService";

function fakes(appleTokens: string[] = []) {
  const purge = vi.fn(async () => {});
  const revoke = vi.fn(async () => {});
  const store: AccountDeletionStore = {
    async appleRefreshTokens() { return appleTokens; },
    purge,
  };
  const appleRevoker: AppleRevoker = { revoke };
  return { store, appleRevoker, purge, revoke };
}

describe("deleteAccount", () => {
  it("purges the account when there is nothing to revoke", async () => {
    const { store, appleRevoker, purge, revoke } = fakes([]);
    await deleteAccount("acct-1", { store, appleRevoker });
    expect(revoke).not.toHaveBeenCalled();
    expect(purge).toHaveBeenCalledWith("acct-1");
  });

  it("revokes every stored Apple refresh token, then purges", async () => {
    const { store, appleRevoker, purge, revoke } = fakes(["apple-rt-1", "apple-rt-2"]);
    await deleteAccount("acct-1", { store, appleRevoker });
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenCalledWith("apple-rt-1");
    expect(revoke).toHaveBeenCalledWith("apple-rt-2");
    expect(purge).toHaveBeenCalledWith("acct-1");
  });

  it("still purges even if Apple revocation fails (best-effort)", async () => {
    const { store, appleRevoker, purge, revoke } = fakes(["apple-rt-1"]);
    (revoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("apple down"));
    await deleteAccount("acct-1", { store, appleRevoker });
    expect(purge).toHaveBeenCalledWith("acct-1");
  });
});
