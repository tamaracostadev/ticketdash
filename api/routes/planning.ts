import type { FastifyInstance } from "fastify";

import type { PlanningRepository } from "../planningRepository.ts";
import { normalizeTicketPlan, parseTicketPlans } from "../../src/utils/ticketPlanValidation.ts";
import { normalizeTicketKey } from "../../src/utils/ticketKeys.ts";

interface TicketKeyParams {
  ticketKey: string;
}

interface ReorderBody {
  ticketKeys?: unknown;
}

export function registerPlanningRoutes(
  app: FastifyInstance,
  repository: PlanningRepository,
): void {
  app.get("/api/planning/ticket-plans", () => repository.list());

  app.put<{ Params: TicketKeyParams }>(
    "/api/planning/ticket-plans/:ticketKey",
    async (request, reply) => {
      const key = normalizeTicketKey(request.params.ticketKey);
      const plan = normalizeTicketPlan(request.body);
      if (!key || !plan || plan.ticketKey !== key) {
        return reply.status(400).send({ message: "Invalid ticket plan." });
      }
      await repository.save(plan);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: TicketKeyParams }>(
    "/api/planning/ticket-plans/:ticketKey",
    async (request, reply) => {
      const key = normalizeTicketKey(request.params.ticketKey);
      if (!key) return reply.status(400).send({ message: "Invalid ticket key." });
      await repository.remove(key);
      return reply.status(204).send();
    },
  );

  app.delete("/api/planning/ticket-plans", async (_request, reply) => {
    await repository.clear();
    return reply.status(204).send();
  });

  app.post<{ Body: ReorderBody }>(
    "/api/planning/ticket-plans/reorder",
    async (request, reply) => {
      const ticketKeys = Array.isArray(request.body?.ticketKeys)
        ? request.body.ticketKeys.map((value) =>
            typeof value === "string" ? normalizeTicketKey(value) : null
          )
        : null;
      if (
        ticketKeys === null ||
        ticketKeys.length === 0 ||
        ticketKeys.some((value) => value === null) ||
        new Set(ticketKeys).size !== ticketKeys.length
      ) {
        return reply.status(400).send({ message: "Invalid ticket order." });
      }
      await repository.reorder(ticketKeys as string[]);
      return reply.status(204).send();
    },
  );

  app.post("/api/planning/ticket-plans/import", async (request, reply) => {
    if (
      typeof request.body !== "object" ||
      request.body === null ||
      Array.isArray(request.body)
    ) {
      return reply.status(400).send({ message: "Invalid ticket plans." });
    }
    const plans = parseTicketPlans(request.body);
    if (Object.keys(plans).length !== Object.keys(request.body).length) {
      return reply.status(400).send({ message: "Invalid ticket plans." });
    }
    await repository.import(Object.values(plans));
    return reply.status(204).send();
  });
}
