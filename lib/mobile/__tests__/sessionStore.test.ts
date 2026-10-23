import { describe, it, expect } from "vitest";
import { rowToSession, familyToRow, type MobileSessionRow } from "../sessionStore";
import { createRefreshFamily } from "../tokens";

const t0 = 1_800_000_000_000;

describe("session row mapping", () => {
  it("round-trips a family through the DB row shape", () => {
    const family = createRefreshFamily("wire-token", t0);
    const row: MobileSessionRow = {
      id: "sess-1",
      accountId: "acct-1",
      deviceId: "device-1",
      currentHash: family.currentHash,
      issuedAt: new Date(family.issuedAt),
      consumedHashes: family.consumedHashes,
      revoked: family.revoked,
    };
    const session = rowToSession(row);
    expect(session).toEqual({ sessionId: "sess-1", accountId: "acct-1", deviceId: "device-1", family });
  });

  it("maps a family back to the row's persisted columns", () => {
    const family = { currentHash: "sha256:x", issuedAt: t0, consumedHashes: ["sha256:y"], revoked: true };
    const cols = familyToRow(family);
    expect(cols.currentHash).toBe("sha256:x");
    expect(cols.issuedAt).toEqual(new Date(t0));
    expect(cols.consumedHashes).toEqual(["sha256:y"]);
    expect(cols.revoked).toBe(true);
  });
});
