import type { FastifyInstance } from "fastify";

import type { IntegrationConfig } from "../../server/config.ts";
import { fetchGitHubPRs } from "../../server/github.ts";
import {
  executeJiraTransition,
  fetchJiraIssues,
  fetchJiraTransitions,
  getJiraTransitionAssistantState,
} from "../../server/jira.ts";
import { normalizeTicketKey } from "../../src/utils/ticketKeys.ts";

interface TicketKeyParams {
  ticketKey: string;
}

export function registerIntegrationRoutes(
  app: FastifyInstance,
  config: IntegrationConfig,
): void {
  app.get("/api/integrations/status", async () => ({
    config: config.public,
    github: config.github !== null,
    jira: config.jira !== null,
  }));

  app.get("/api/jira/issues", async (_request, reply) => {
    if (!config.jira) {
      return reply.status(503).send({ message: "Integration unavailable." });
    }
    return fetchJiraIssues(config.jira);
  });

  app.get<{ Params: TicketKeyParams }>(
    "/api/jira/issues/:ticketKey/transition-assistant",
    async (request, reply) => {
      if (!config.jira) {
        return reply.status(503).send({ message: "Integration unavailable." });
      }
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      if (!ticketKey) {
        return reply.status(400).send({ message: "Invalid ticket key." });
      }
      const transitions = await fetchJiraTransitions(config.jira, ticketKey);
      return getJiraTransitionAssistantState(
        transitions,
        config.public.workflowStatuses.development,
      );
    },
  );

  app.post<{ Params: TicketKeyParams }>(
    "/api/jira/issues/:ticketKey/transition-assistant/execute",
    async (request, reply) => {
      if (!config.jira) {
        return reply.status(503).send({ message: "Integration unavailable." });
      }
      const ticketKey = normalizeTicketKey(request.params.ticketKey);
      if (!ticketKey) {
        return reply.status(400).send({ message: "Invalid ticket key." });
      }
      const transitions = await fetchJiraTransitions(config.jira, ticketKey);
      const assistant = getJiraTransitionAssistantState(
        transitions,
        config.public.workflowStatuses.development,
      );
      if (!assistant.available || !assistant.transition) {
        return reply.status(409).send({
          message: assistant.reason ?? "No direct development transition is available.",
        });
      }
      await executeJiraTransition(
        config.jira,
        ticketKey,
        assistant.transition.id,
      );
      return reply.status(204).send();
    },
  );

  app.get("/api/github/prs", async (_request, reply) => {
    if (!config.github) {
      return reply.status(503).send({ message: "Integration unavailable." });
    }
    return fetchGitHubPRs(config.github);
  });
}
