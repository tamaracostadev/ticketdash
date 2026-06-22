import type { ActivityObservationInput } from "../types/activity";
import type { DashboardTicket } from "./dashboard";
import { getPRReviewSummary } from "./pullRequests";

export function createActivityCapture(
  tickets: DashboardTicket[],
  observedAt: string,
): ActivityObservationInput[] {
  return tickets.flatMap((ticket) => {
    if (ticket.workflow.externalColumn === null) return [];
    const pullRequests = ticket.prs.map(({ openThreadCount, pr }) => ({
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
      openThreadCount,
      repository: `${pr.repository.owner.login}/${pr.repository.name}`,
      reviewStatus: getPRReviewSummary(pr).status,
    }));
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
}
