import path from "node:path";
import { fileURLToPath } from "node:url";

import { getApiConfig } from "./config.ts";
import { createDatabase } from "./database.ts";
import { readMigrations, runMigrations } from "./migrations.ts";

const directory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);
const config = getApiConfig(process.env);
const database = createDatabase(config.databaseUrl);

try {
  await runMigrations(database, await readMigrations(directory));
} finally {
  await database.close();
}
