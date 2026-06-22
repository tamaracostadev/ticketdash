import type { JiraIssue } from "../types/jira";
import type { DashboardTicket } from "./dashboard";
import type { ReviewWorkItem } from "./reviewWork";

export interface DashboardAction {
  href: string;
  id: string;
  label: string;
  type:
    | "changes-requested"
    | "conflict"
    | "comment"
    | "linked-duplicate-sync"
    | "re-review"
    | "rejected-by-qa"
    | "rejected-by-review"
    | "thread";
}

export function getJiraUrl(issue: JiraIssue): string {
  return `${new URL(issue.self).origin}/browse/${issue.key}`;
}

export function getDashboardActions(ticket: DashboardTicket): DashboardAction[] {
  const actions: DashboardAction[] = [];
  const { issue, prs } = ticket;

  if (ticket.planningVisibility !== "operational") return actions;
  if (ticket.hasUnreadComment) {
    actions.push({
      href: getJiraUrl(issue),
      id: `comment:${issue.key}`,
      label: issue.key,
      type: "comment",
    });
  }
  if (ticket.rejectionReason) {
    actions.push({
      href: getJiraUrl(issue),
      id: `${ticket.rejectionReason}:${issue.key}`,
      label: issue.key,
      type: ticket.rejectionReason,
    });
  }
  for (const linkedKey of ticket.pendingLinkedDuplicateKeys) {
    actions.push({
      href: `${new URL(issue.self).origin}/browse/${linkedKey}`,
      id: `linked-duplicate-sync:${issue.key}:${linkedKey}`,
      label: linkedKey,
      type: "linked-duplicate-sync",
    });
  }
  for (const linked of prs) {
    const { pr } = linked;
    const label = `${issue.key} (${pr.repository.name} #${pr.number})`;
    if (linked.hasConflict) {
      actions.push({
        href: pr.url,
        id: `conflict:${issue.key}:${pr.url}`,
        label,
        type: "conflict",
      });
    }
    if (
      linked.hasChangesRequested
    ) {
      actions.push({
        href: pr.url,
        id: `changes-requested:${issue.key}:${pr.url}`,
        label,
        type: "changes-requested",
      });
    }
    if (linked.openThreadCount > 0) {
      actions.push({
        href: pr.url,
        id: `thread:${issue.key}:${pr.url}`,
        label: `${label}, ${linked.openThreadCount}`,
        type: "thread",
      });
    }
  }

  return actions;
}

export function getReviewWorkActions(
  items: ReviewWorkItem[],
): DashboardAction[] {
  return items
    .filter((item) => item.reason === "re-review-required")
    .map((item) => ({
      href: item.pr.url,
      id: `re-review:${item.pr.url}`,
      label: item.ticketKey
        ? `${item.ticketKey} (${item.pr.repository.name} #${item.pr.number})`
        : `${item.pr.repository.name} #${item.pr.number}`,
      type: "re-review" as const,
    }));
}
