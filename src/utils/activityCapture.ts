import type { ActivityObservationInput } from "../types/activity";
import type { GitHubPR } from "../types/github";
import type { DashboardTicket } from "./dashboard";
import { getPRTicketId } from "./linkTickets";
import { getPRReviewSummary } from "./pullRequests";
import { isTrackedReviewPr } from "./reviewWork";

function toPullRequestObservation(pr: GitHubPR) {
  return {
    latestCommitAt: pr.latestCommits?.nodes[0]?.commit.committedDate ?? null,
    latestOpinionatedReviews: (pr.latestOpinionatedReviews?.nodes ?? []).map(
      (review) => ({
        authorLogin: review.author?.login ?? null,
        state: review.state,
        submittedAt: review.submittedAt,
      }),
    ),
    mergeable: pr.mergeable,
    number: pr.number,
    openThreadCount: pr.reviewThreads.nodes.filter(
      (thread) => !thread.isResolved && !thread.isOutdated,
    ).length,
    repository: `${pr.repository.owner.login}/${pr.repository.name}`,
    reviewStatus: getPRReviewSummary(pr).status,
  };
}

export function createActivityCapture(
  tickets: DashboardTicket[],
  prs: GitHubPR[],
  observedAt: string,
  ticketKeyPrefixes: string[] = [],
  githubUsername?: string,
): ActivityObservationInput[] {
  const observations = tickets.flatMap((ticket) => {
    if (ticket.workflow.externalColumn === null) return [];
    const pullRequests = ticket.prs.map(({ pr }) => toPullRequestObservation(pr));
    return [{
      hasConflict: ticket.hasConflict,
      jiraStatus: ticket.issue.fields.status.name,
      observedAt,
      openThreadCount: ticket.openThreadCount,
      pullRequests,
      reviewState: pullRequests.map(({ reviewStatus }) => reviewStatus).join(",")
        || "no-pr",
      ticketKey: ticket.issue.key,
      workflowColumn: ticket.workflow.externalColumn,
    }];
  });

  if (!githubUsername) {
    return observations;
  }

  const capturedKeys = new Set(
    observations.map((observation) => observation.ticketKey.toUpperCase()),
  );
  const reviewOnlyByTicket = new Map<string, GitHubPR[]>();

  for (const pr of prs) {
    if (pr.searchContexts?.authored) continue;
    if (!isTrackedReviewPr(pr, githubUsername)) continue;

    const ticketKey = getPRTicketId(pr, ticketKeyPrefixes);
    if (ticketKey === null || capturedKeys.has(ticketKey)) continue;

    const existing = reviewOnlyByTicket.get(ticketKey) ?? [];
    existing.push(pr);
    reviewOnlyByTicket.set(ticketKey, existing);
  }

  for (const [ticketKey, ticketPrs] of reviewOnlyByTicket.entries()) {
    const pullRequests = ticketPrs.map((pr) => toPullRequestObservation(pr));
    observations.push({
      hasConflict: ticketPrs.some((pr) => pr.mergeable === "CONFLICTING"),
      jiraStatus: "Code Review",
      observedAt,
      openThreadCount: pullRequests.reduce(
        (total, pr) => total + pr.openThreadCount,
        0,
      ),
      pullRequests,
      reviewState: pullRequests.map(({ reviewStatus }) => reviewStatus).join(",")
        || "no-pr",
      ticketKey,
      workflowColumn: "code-review",
    });
  }

  return observations;
}
