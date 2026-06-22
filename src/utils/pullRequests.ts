import type { GitHubPR } from "../types/github";

export type PullRequestReviewStatus =
  | "approved"
  | "changes-requested"
  | "draft"
  | "partially-approved"
  | "pending-review";

export interface PullRequestReviewSummary {
  approvedBy: string[];
  approvalCount: number;
  label: string;
  pendingCount: number;
  status: PullRequestReviewStatus;
  tooltip: string | null;
}

export function getOpenThreadCount(pr: GitHubPR): number {
  return pr.reviewThreads.nodes.filter(
    (thread) => !thread.isResolved && !thread.isOutdated,
  ).length;
}

export function getChangesRequestedAt(pr: GitHubPR): string | null {
  const reviews = pr.changesRequestedReviews?.nodes ?? [];
  return reviews[reviews.length - 1]?.submittedAt ?? null;
}

export function getLatestChangesRequestedAt(prs: GitHubPR[]): string | null {
  return prs.reduce<string | null>((latest, pr) => {
    const current = getChangesRequestedAt(pr);
    if (current === null) return latest;
    return latest === null || Date.parse(current) > Date.parse(latest)
      ? current
      : latest;
  }, null);
}

export function getPRReviewSummary(pr: GitHubPR): PullRequestReviewSummary {
  const approvals = (pr.latestOpinionatedReviews?.nodes ?? []).filter(
    (review) => review.state === "APPROVED",
  );
  const approvedBy = approvals.map(
    (review) => review.author?.login ?? "Unknown reviewer",
  );
  const approvalCount = approvals.length;
  const pendingCount = pr.reviewRequests?.totalCount ?? 0;
  const tooltip = approvedBy.length > 0
    ? `Approved by: ${approvedBy.join(", ")}`
    : null;

  if (pr.isDraft) {
    return { approvedBy, approvalCount, label: "Draft", pendingCount, status: "draft", tooltip };
  }
  if (pr.reviewDecision === "CHANGES_REQUESTED") {
    return {
      approvedBy,
      approvalCount,
      label: "Changes requested",
      pendingCount,
      status: "changes-requested",
      tooltip,
    };
  }
  if (pr.reviewDecision === "APPROVED") {
    return { approvedBy, approvalCount, label: "Approved", pendingCount, status: "approved", tooltip };
  }
  if (approvalCount > 0) {
    const approvalsLabel = `${approvalCount} approval${approvalCount === 1 ? "" : "s"}`;
    const pendingLabel = pendingCount > 0 ? ` · ${pendingCount} pending` : "";
    return {
      approvedBy,
      approvalCount,
      label: `${approvalsLabel}${pendingLabel}`,
      pendingCount,
      status: "partially-approved",
      tooltip,
    };
  }
  return {
    approvedBy,
    approvalCount,
    label: "Pending review",
    pendingCount,
    status: "pending-review",
    tooltip,
  };
}

export function getPRLabel(pr: GitHubPR): string {
  return getPRReviewSummary(pr).label;
}

export function sortPRs(prs: GitHubPR[]): GitHubPR[] {
  return [...prs].sort((left, right) => {
    const repository = left.repository.name.localeCompare(right.repository.name);
    return repository || left.number - right.number;
  });
}
