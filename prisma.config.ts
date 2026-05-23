import { defineConfig } from "prisma/config";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(path: string) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://user:password@localhost:5432/bunnlist",
  },
});
