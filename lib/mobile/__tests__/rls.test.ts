import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every table created after the enable_rls migration must turn RLS on in the same
// migration, so Supabase's public Data API never exposes it.
const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const RLS_MIGRATION = "20261025120000_enable_rls";

describe("row level security", () => {
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  it("has the migration that enables RLS on existing tables", () => {
    expect(dirs).toContain(RLS_MIGRATION);
  });

  it("enables RLS for each table created after it", () => {
    for (const dir of dirs.filter((d) => d > RLS_MIGRATION)) {
      const sql = readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");
      for (const [, table] of sql.matchAll(/CREATE TABLE "([^"]+)"/g)) {
        expect(sql, `${dir} creates ${table} without RLS`).toMatch(
          new RegExp(`ALTER TABLE "?${table}"? ENABLE ROW LEVEL SECURITY`),
        );
      }
    }
  });
});
