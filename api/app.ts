import Fastify, { type FastifyInstance } from "fastify";

import type { IntegrationConfig } from "../server/config.ts";
import { ActivityRepository } from "./activityRepository.ts";
import { ActivityReadRepository } from "./activityReadRepository.ts";
import type { Database } from "./database.ts";
import { LastSeenDatabaseRepository } from "./lastSeenRepository.ts";
import { toPublicError } from "./errors.ts";
import { PlanningRepository } from "./planningRepository.ts";
import { ReportRepository } from "./reportRepository.ts";
import { ReflectionRepository } from "./reflectionRepository.ts";
import { registerActivityRoutes } from "./routes/activity.ts";
import { registerHealthRoutes } from "./routes/health.ts";
import { registerIntegrationRoutes } from "./routes/integrations.ts";
import { registerLastSeenRoutes } from "./routes/lastSeen.ts";
import { registerPlanningRoutes } from "./routes/planning.ts";
import { registerReportRoutes } from "./routes/reports.ts";
import { registerReflectionRoutes } from "./routes/reflections.ts";

export interface AppDependencies {
  database: Database;
  integrations: IntegrationConfig;
}

export function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  registerActivityRoutes(
    app,
    new ActivityRepository(
      dependencies.database,
      dependencies.integrations.github?.username ?? null,
    ),
    new ActivityReadRepository(dependencies.database),
  );
  registerHealthRoutes(app, dependencies.database);
  registerIntegrationRoutes(app, dependencies.integrations);
  registerLastSeenRoutes(
    app,
    new LastSeenDatabaseRepository(dependencies.database),
  );
  registerPlanningRoutes(app, new PlanningRepository(dependencies.database));
  registerReportRoutes(
    app,
    new ReportRepository(
      dependencies.database,
      dependencies.integrations.public.githubUsername,
    ),
  );
  registerReflectionRoutes(
    app,
    new ReflectionRepository(dependencies.database),
  );

  app.setErrorHandler((error, _request, reply) => {
    const publicError = toPublicError(error, dependencies.integrations);
    return reply.status(publicError.status).send({ message: publicError.message });
  });

  return app;
}
