import type { GitHubPR } from "../types/github";
import type { JiraIssue } from "../types/jira";
import { getPRTicketId } from "./linkTickets";
import { getOpenThreadCount } from "./pullRequests";

export type ReviewWorkReason =
  | "changes-requested-open"
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

export function isTrackedReviewPr(pr: GitHubPR, username: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  return Boolean(
    pr.searchContexts?.reviewRequested ||
      pr.searchContexts?.reviewed ||
      (pr.latestOpinionatedReviews?.nodes ?? []).some((review) =>
        review.author?.login.toLowerCase() === normalizedUsername
      ),
  );
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

function getLatestReviewStateByUser(
  pr: GitHubPR,
  username: string,
): "APPROVED" | "CHANGES_REQUESTED" | null {
  const reviews = (pr.latestOpinionatedReviews?.nodes ?? [])
    .filter((review) =>
      review.author?.login.toLowerCase() === username.toLowerCase()
    )
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));

  return reviews[0]?.state ?? null;
}

export function isReReviewRequired(pr: GitHubPR, username: string): boolean {
  const latestChangesRequestedAt = getLatestChangesRequestedByUser(pr, username);
  const latestCommitAt = getLatestCommitAt(pr);
  const openThreadCount = getOpenThreadCount(pr);

  return (
    latestChangesRequestedAt !== null &&
    (
      openThreadCount === 0 ||
      (
        latestCommitAt !== null &&
        Date.parse(latestCommitAt) > Date.parse(latestChangesRequestedAt)
      )
    )
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

    const latestReviewStateByUser = getLatestReviewStateByUser(pr, username);
    const reason: ReviewWorkReason | null =
      latestReviewStateByUser === "CHANGES_REQUESTED"
        ? (
          isReReviewRequired(pr, username)
            ? "re-review-required"
            : "changes-requested-open"
        )
        : (
          pr.searchContexts?.reviewRequested || pr.reviewDecision === "REVIEW_REQUIRED"
            ? "pending-review-request"
            : null
        );

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
      const rank: Record<ReviewWorkReason, number> = {
        "re-review-required": 0,
        "pending-review-request": 1,
        "changes-requested-open": 2,
      };
      return rank[left.reason] - rank[right.reason];
    }

    const leftKey = left.ticketKey ?? left.pr.title;
    const rightKey = right.ticketKey ?? right.pr.title;
    return leftKey.localeCompare(rightKey);
  });
}
