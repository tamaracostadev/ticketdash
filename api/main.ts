import { buildApp } from "./app.ts";
import { ActivityRepository } from "./activityRepository.ts";
import { BackgroundRefreshService } from "./backgroundRefresh.ts";
import { getApiConfig } from "./config.ts";
import { createDatabase } from "./database.ts";

const config = getApiConfig(process.env);
const database = createDatabase(config.databaseUrl);
const activityRepository = new ActivityRepository(
  database,
  config.integrations.github?.username ?? null,
);
const backgroundRefresh = new BackgroundRefreshService({
  activityRepository,
  config: config.backgroundRefresh,
  integrations: config.integrations,
});
const app = buildApp({
  database,
  getBackgroundRefreshStatus: () => backgroundRefresh.getStatus(),
  integrations: config.integrations,
});
backgroundRefresh.start();

async function shutdown(): Promise<void> {
  backgroundRefresh.stop();
  await app.close();
  await database.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: config.host, port: config.port });
