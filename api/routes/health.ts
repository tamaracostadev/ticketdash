import type { FastifyInstance } from "fastify";

import type { Database } from "../database.ts";

export function registerHealthRoutes(
  app: FastifyInstance,
  database: Database,
): void {
  app.get("/api/health", async () => ({ status: "ok" }));
  app.get("/api/health/db", async (_request, reply) => {
    try {
      await database.query("SELECT 1");
      return { database: "ok", status: "ok" };
    } catch {
      return reply.status(503).send({
        database: "unavailable",
        message: "Database unavailable.",
        status: "error",
      });
    }
  });
}
