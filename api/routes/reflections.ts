import type { FastifyInstance } from "fastify";

import type { ReflectionRepository } from "../reflectionRepository.ts";
import { normalizeTicketReflection } from "../../src/utils/reflectionValidation.ts";
import { normalizeTicketKey } from "../../src/utils/ticketKeys.ts";

interface TicketKeyParams {
  ticketKey: string;
}

export function registerReflectionRoutes(
  app: FastifyInstance,
  repository: ReflectionRepository,
): void {
  app.get("/api/reflections", () => repository.list());

  app.put<{ Params: TicketKeyParams }>(
    "/api/reflections/:ticketKey",
    async (request, reply) => {
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      const reflection = normalizeTicketReflection(request.body);
      if (!ticketKey || !reflection || reflection.ticketKey !== ticketKey) {
        return reply.status(400).send({ message: "Invalid reflection." });
      }
      await repository.save(reflection);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: TicketKeyParams }>(
    "/api/reflections/:ticketKey",
    async (request, reply) => {
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      if (!ticketKey) {
        return reply.status(400).send({ message: "Invalid ticket key." });
      }
      await repository.remove(ticketKey);
      return reply.status(204).send();
    },
  );
}
