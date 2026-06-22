import type { FastifyInstance } from "fastify";

import type { LastSeenDatabaseRepository } from "../lastSeenRepository.ts";
import { normalizeIsoTimestamp } from "../../src/utils/dates.ts";
import { parseLastSeen } from "../../src/utils/lastSeenValidation.ts";
import { normalizeTicketKey } from "../../src/utils/ticketKeys.ts";

interface TicketKeyParams {
  ticketKey: string;
}

interface MarkSeenBody {
  seenAt?: unknown;
}

export function registerLastSeenRoutes(
  app: FastifyInstance,
  repository: LastSeenDatabaseRepository,
): void {
  app.get("/api/last-seen", () => repository.list());

  app.put<{ Body: MarkSeenBody; Params: TicketKeyParams }>(
    "/api/last-seen/:ticketKey",
    async (request, reply) => {
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      const seenAt = normalizeIsoTimestamp(request.body?.seenAt);
      if (ticketKey === null || seenAt === null) {
        return reply.status(400).send({ message: "Invalid last seen value." });
      }
      await repository.markSeen(ticketKey, seenAt);
      return reply.status(204).send();
    },
  );

  app.delete("/api/last-seen", async (_request, reply) => {
    await repository.clear();
    return reply.status(204).send();
  });

  app.post("/api/last-seen/import", async (request, reply) => {
    const lastSeen = parseLastSeen(request.body);
    if (lastSeen === null) {
      return reply.status(400).send({ message: "Invalid last seen values." });
    }
    await repository.import(lastSeen);
    return reply.status(204).send();
  });
}
