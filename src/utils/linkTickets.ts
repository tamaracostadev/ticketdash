import type { GitHubPR } from "../types/github";
import type { JiraIssue } from "../types/jira";

const TICKET_ID_PATTERN = /\b([A-Z][A-Z0-9_]{1,19}-\d+)\b/i;

export interface LinkedPRs {
  prsByTicketId: Map<string, GitHubPR[]>;
  unlinkedPRs: GitHubPR[];
}

export function extractTicketId(
  value: string,
  prefixes: string[] = [],
): string | null {
  const ticketId = value.match(TICKET_ID_PATTERN)?.[1].toUpperCase() ?? null;
  if (ticketId === null || prefixes.length === 0) return ticketId;
  const prefix = ticketId.split("-")[0];
  return prefixes.includes(prefix) ? ticketId : null;
}

export function getPRTicketId(pr: GitHubPR, prefixes: string[] = []): string | null {
  return extractTicketId(pr.headRefName, prefixes) ??
    extractTicketId(pr.title, prefixes);
}

export function linkPRsToTickets(
  tickets: JiraIssue[],
  prs: GitHubPR[],
  configuredPrefixes: string[] = [],
): LinkedPRs {
  const ticketIds = new Set(tickets.map(({ key }) => key.toUpperCase()));
  const prefixes = configuredPrefixes.length > 0
    ? configuredPrefixes
    : [...new Set([...ticketIds].map((key) => key.split("-")[0]))];
  const prsByTicketId = new Map<string, GitHubPR[]>();
  const unlinkedPRs: GitHubPR[] = [];

  for (const pr of prs) {
    const ticketId = getPRTicketId(pr, prefixes);

    if (ticketId === null || !ticketIds.has(ticketId)) {
      unlinkedPRs.push(pr);
    } else {
      const linked = prsByTicketId.get(ticketId) ?? [];
      linked.push(pr);
      prsByTicketId.set(ticketId, linked);
    }
  }

  return { prsByTicketId, unlinkedPRs };
}
