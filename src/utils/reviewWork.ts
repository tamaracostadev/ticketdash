import type { GitHubPR } from "../types/github";
import type { JiraIssue } from "../types/jira";
import { getPRTicketId } from "./linkTickets";
import { getOpenThreadCount } from "./pullRequests";

export type ReviewWorkReason =
  | "pending-review-request"
  | "re-review-required";

export interface ReviewWorkItem {
  hasConflict: boolean;
  openThreadCount: number;
  pr: GitHubPR;
  reason: ReviewWorkReason;
  ticketKey: string | null;
}

interface ReviewWorkOptions {
  ticketKeyPrefixes?: string[];
  username?: string;
}

function getLatestCommitAt(pr: GitHubPR): string | null {
  return pr.latestCommits?.nodes[0]?.commit.committedDate ?? null;
}

function getLatestChangesRequestedByUser(
  pr: GitHubPR,
  username: string,
): string | null {
  const reviews = (pr.latestOpinionatedReviews?.nodes ?? [])
    .filter((review) =>
      review.state === "CHANGES_REQUESTED" &&
      review.author?.login.toLowerCase() === username.toLowerCase()
    )
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));

  return reviews[0]?.submittedAt ?? null;
}

export function isReReviewRequired(pr: GitHubPR, username: string): boolean {
  const latestChangesRequestedAt = getLatestChangesRequestedByUser(pr, username);
  const latestCommitAt = getLatestCommitAt(pr);

  return (
    latestChangesRequestedAt !== null &&
    latestCommitAt !== null &&
    Date.parse(latestCommitAt) > Date.parse(latestChangesRequestedAt)
  );
}

export function createReviewWorkItems(
  issues: JiraIssue[],
  prs: GitHubPR[],
  options: ReviewWorkOptions = {},
): ReviewWorkItem[] {
  const username = options.username?.trim();
  if (!username) {
    return [];
  }

  const assignedIssueKeys = new Set(
    issues.map((issue) => issue.key.toUpperCase()),
  );
  const items: ReviewWorkItem[] = [];

  for (const pr of prs) {
    if (pr.searchContexts?.authored) {
      continue;
    }

    const ticketKey = getPRTicketId(pr, options.ticketKeyPrefixes ?? []);
    if (ticketKey !== null && assignedIssueKeys.has(ticketKey)) {
      continue;
    }

    const reason: ReviewWorkReason | null = isReReviewRequired(pr, username)
      ? "re-review-required"
      : pr.searchContexts?.reviewRequested
        ? "pending-review-request"
        : null;

    if (reason === null) {
      continue;
    }

    items.push({
      hasConflict: pr.mergeable === "CONFLICTING",
      openThreadCount: getOpenThreadCount(pr),
      pr,
      reason,
      ticketKey,
    });
  }

  return items.sort((left, right) => {
    if (left.reason !== right.reason) {
      return left.reason === "re-review-required" ? -1 : 1;
    }

    const leftKey = left.ticketKey ?? left.pr.title;
    const rightKey = right.ticketKey ?? right.pr.title;
    return leftKey.localeCompare(rightKey);
  });
}
