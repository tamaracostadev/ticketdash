import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Database } from "./database.ts";

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

interface Migration {
  checksum: string;
  name: string;
  sql: string;
}

export async function readMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(path.join(directory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { checksum, name, sql };
    }),
  );
}

export async function runMigrations(
  database: Database,
  migrations: Migration[],
): Promise<void> {
  await database.query(CREATE_MIGRATIONS_TABLE);

  for (const migration of migrations) {
    await database.transaction(async (client) => {
      const applied = await client.query<{ checksum: string }>(
        "SELECT checksum FROM public.schema_migrations WHERE name = $1",
        [migration.name],
      );
      if (applied.rows[0]?.checksum === migration.checksum) {
        return;
      }
      if (applied.rows[0]) {
        throw new Error(`Migration checksum mismatch: ${migration.name}.`);
      }

      await client.query(migration.sql);
      await client.query(
        "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
        [migration.name, migration.checksum],
      );
    });
  }
}
