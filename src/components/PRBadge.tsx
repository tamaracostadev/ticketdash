import type { GitHubPR } from "../types/github";
import { getPRReviewSummary } from "../utils/pullRequests";

interface PRBadgeProps {
  pr: GitHubPR;
}

function getColor(pr: GitHubPR): string {
  const status = getPRReviewSummary(pr).status;
  if (pr.isDraft) return "bg-slate-500/15 text-slate-300";
  if (status === "approved") {
    return "bg-emerald-500/15 text-emerald-300";
  }
  if (status === "changes-requested") {
    return "bg-rose-500/15 text-rose-300";
  }
  if (status === "partially-approved") {
    return "bg-sky-500/15 text-sky-300";
  }
  return "bg-amber-500/15 text-amber-300";
}

export function PRBadge({ pr }: PRBadgeProps) {
  const summary = getPRReviewSummary(pr);
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-medium leading-tight ${getColor(pr)}`}
      title={summary.tooltip ?? undefined}
    >
      {summary.label}
    </span>
  );
}
