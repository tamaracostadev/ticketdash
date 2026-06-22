import type { GitHubPR } from "../../src/types/github";
import type { JiraIssue } from "../../src/types/jira";
import type { TicketPlan } from "../../src/types/planning";
import { createTicketPlan } from "../../src/utils/planning";

const NOW = "2026-06-15T10:00:00.000Z";

export function createIssue(
  key = "APP-100",
  status = "Dev",
  category = "indeterminate",
): JiraIssue {
  return {
    fields: {
      comment: { comments: [], maxResults: 0, startAt: 0, total: 0 },
      status: {
        id: "1",
        name: status,
        statusCategory: { key: category, name: category },
      },
      summary: `${key} summary`,
      updated: NOW,
    },
    id: key,
    key,
    self: `https://jira.example/rest/api/3/issue/${key}`,
  };
}

export function createPR(
  ticketKey = "APP-100",
  changes: Partial<GitHubPR> = {},
): GitHubPR {
  return {
    author: { login: "author" },
    changesRequestedReviews: { nodes: [] },
    headRefName: ticketKey,
    isDraft: false,
    latestCommits: { nodes: [] },
    mergeable: "MERGEABLE",
    number: 100,
    repository: { name: "repo", owner: { login: "org" } },
    reviewDecision: null,
    searchContexts: { authored: true, reviewRequested: false },
    reviewThreads: { nodes: [] },
    title: `${ticketKey} PR`,
    updatedAt: NOW,
    url: `https://github.example/pull/${ticketKey}`,
    ...changes,
  };
}

export function createPlan(
  ticketKey = "APP-100",
  changes: Partial<Omit<TicketPlan, "ticketKey">> = {},
): TicketPlan {
  return { ...createTicketPlan(ticketKey), ...changes };
}
