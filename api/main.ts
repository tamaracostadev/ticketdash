import { buildApp } from "./app.ts";
import { getApiConfig } from "./config.ts";
import { createDatabase } from "./database.ts";

const config = getApiConfig(process.env);
const database = createDatabase(config.databaseUrl);
const app = buildApp({ database, integrations: config.integrations });

async function shutdown(): Promise<void> {
  await app.close();
  await database.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: config.host, port: config.port });
