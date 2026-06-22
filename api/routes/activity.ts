import type { FastifyInstance } from "fastify";

import type { ActivityRepository } from "../activityRepository.ts";
import type { ActivityReadRepository } from "../activityReadRepository.ts";
import { parseActivityCapture } from "../../src/utils/activityValidation.ts";
import { normalizeTicketKey } from "../../src/utils/ticketKeys.ts";

interface TicketKeyParams {
  ticketKey: string;
}

export function registerActivityRoutes(
  app: FastifyInstance,
  repository: ActivityRepository,
  readRepository: ActivityReadRepository,
): void {
  app.get("/api/activity/state", () => readRepository.listStates());

  app.post("/api/activity/capture", async (request, reply) => {
    const observations = parseActivityCapture(request.body);
    if (observations === null) {
      return reply.status(400).send({ message: "Invalid activity capture." });
    }
    await repository.capture(observations);
    return reply.status(204).send();
  });

  app.get<{ Params: TicketKeyParams }>(
    "/api/activity/tickets/:ticketKey/timeline",
    async (request, reply) => {
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      if (ticketKey === null) {
        return reply.status(400).send({ message: "Invalid ticket key." });
      }
      return readRepository.timeline(ticketKey);
    },
  );
}
