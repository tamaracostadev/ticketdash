import type { GitHubPR } from "../types/github";
import type { TicketReflectionsByKey } from "../types/reflections";
import type { ActivityStateByTicket, RejectionReason } from "../types/activity";
import type { JiraIssue } from "../types/jira";
import type { LastSeenByTicket } from "../types/persistence";
import type { PublicDashboardConfig } from "../types/integrations";
import type { TicketPlan, TicketPlansByKey } from "../types/planning";
import type { TicketPriority } from "../types/priority";
import type {
  SystemPlanningReason,
  WorkflowClassification,
} from "../types/workflow";
import { hasUnreadComment } from "./comments";
import { isSameInstant } from "./dates";
import {
  getDashboardActions,
  getReviewWorkActions,
  type DashboardAction,
} from "./dashboardActions";
import { linkPRsToTickets } from "./linkTickets";
import {
  createTicketPlan,
  getPlanningVisibility,
  type PlanningVisibility,
} from "./planning";
import { calculatePriority } from "./priority";
import {
  getLatestChangesRequestedAt,
  getOpenThreadCount,
  sortPRs,
} from "./pullRequests";
import { createReviewWorkItems, type ReviewWorkItem } from "./reviewWork";
import { sortDashboardTickets } from "./sortTickets";
import { classifyWorkflow } from "./workflow";

export { getJiraUrl } from "./dashboardActions";

export interface DashboardPullRequest {
  hasChangesRequested: boolean;
  hasConflict: boolean;
  openThreadCount: number;
  pr: GitHubPR;
}

export interface DashboardTicket {
  changesRequestedAt: string | null;
  duplicateOfTicketKey: string | null;
  hasChangesRequested: boolean;
  hasConflict: boolean;
  hasUnreadComment: boolean;
  issue: JiraIssue;
  linkedDuplicateKeys: string[];
  openThreadCount: number;
  pendingLinkedDuplicateKeys: string[];
  plan: TicketPlan;
  planningVisibility: PlanningVisibility;
  prs: DashboardPullRequest[];
  priority: TicketPriority;
  rejectionReason: RejectionReason | null;
  reflection: TicketReflectionsByKey[string] | null;
  workflow: WorkflowClassification;
}

export interface DashboardData {
  actions: DashboardAction[];
  reviewItems: ReviewWorkItem[];
  tickets: DashboardTicket[];
  unlinkedPRs: GitHubPR[];
}

function getSystemPlanningReasons(
  prs: GitHubPR[],
  includeChangesRequested: boolean,
): SystemPlanningReason[] {
  const reasons: SystemPlanningReason[] = [];

  if (prs.some((pr) => pr.mergeable === "CONFLICTING")) {
    reasons.push("merge-conflict");
  }
  if (includeChangesRequested) {
    reasons.push("changes-requested");
  }

  return reasons;
}

export function createDashboardData(
  issues: JiraIssue[],
  prs: GitHubPR[],
  lastSeen: LastSeenByTicket,
  plans: TicketPlansByKey = {},
  now: Date = new Date(),
  config?: PublicDashboardConfig,
  activityStates: ActivityStateByTicket = {},
  reflections: TicketReflectionsByKey = {},
): DashboardData {
  const { prsByTicketId, unlinkedPRs } = linkPRsToTickets(
    issues,
    prs,
    config?.ticketKeyPrefixes,
  );
  const baseTickets = issues.map((issue): DashboardTicket => {
    const linkedPRs = sortPRs(prsByTicketId.get(issue.key.toUpperCase()) ?? []);
    const plan = plans[issue.key.toUpperCase()] ?? createTicketPlan(issue.key);
    const rejectionReason =
      activityStates[issue.key.toUpperCase()]?.rejectionReason ?? null;
    const reflection = reflections[issue.key.toUpperCase()] ?? null;
    const unreadComment = hasUnreadComment(issue, lastSeen);
    const openThreadCount = linkedPRs.reduce(
      (total, pr) => total + getOpenThreadCount(pr),
      0,
    );
    const changesRequestedAt = getLatestChangesRequestedAt(linkedPRs);
    const hasChangesRequested =
      linkedPRs.some((pr) => pr.reviewDecision === "CHANGES_REQUESTED") &&
      (changesRequestedAt === null ||
        plan.resolvedChangesRequestedAt === null ||
        !isSameInstant(plan.resolvedChangesRequestedAt, changesRequestedAt));
    const dashboardPRs = linkedPRs.map((pr): DashboardPullRequest => ({
      hasChangesRequested:
        hasChangesRequested && pr.reviewDecision === "CHANGES_REQUESTED",
      hasConflict: pr.mergeable === "CONFLICTING",
      openThreadCount: getOpenThreadCount(pr),
      pr,
    }));
    const hasConflict = dashboardPRs.some((pr) => pr.hasConflict);
    const systemPlanningReasons = getSystemPlanningReasons(
      linkedPRs,
      hasChangesRequested,
    );
    const workflow = classifyWorkflow(issue, linkedPRs.length > 0, {
      isActiveDevelopment: plan.isActiveDevelopment,
      isPlanned: plan.isPlanned,
      systemPlanningReasons,
    }, config?.workflowStatuses);
    return {
      changesRequestedAt,
      duplicateOfTicketKey: plan.duplicateOfTicketKey,
      hasChangesRequested,
      hasConflict,
      hasUnreadComment: unreadComment,
      issue,
      linkedDuplicateKeys: [],
      openThreadCount,
      pendingLinkedDuplicateKeys: [],
      plan,
      planningVisibility: getPlanningVisibility(plan, now),
      prs: dashboardPRs,
      priority: calculatePriority({
        hasChangesRequested,
        hasConflict,
        hasUnreadComment: unreadComment,
        openThreadCount,
        rejectionReason,
      }),
      rejectionReason,
      reflection,
      workflow,
    };
  });
  const ticketByKey = new Map(
    baseTickets.map((ticket) => [ticket.issue.key.toUpperCase(), ticket]),
  );
  const groupedLinkedDuplicates = baseTickets.reduce<Map<string, string[]>>(
    (groups, ticket) => {
      if (ticket.duplicateOfTicketKey === null) return groups;
      const parentKey = ticket.duplicateOfTicketKey.toUpperCase();
      const current = groups.get(parentKey) ?? [];
      current.push(ticket.issue.key);
      groups.set(parentKey, current);
      return groups;
    },
    new Map(),
  );
  const tickets = baseTickets.map((ticket) => {
    const linkedDuplicateKeys =
      groupedLinkedDuplicates.get(ticket.issue.key.toUpperCase()) ?? [];
    const pendingLinkedDuplicateKeys = ticket.workflow.column === "release"
      ? linkedDuplicateKeys.filter((linkedKey) => {
          const linkedTicket = ticketByKey.get(linkedKey.toUpperCase());
          return linkedTicket?.workflow.column !== "release";
        })
      : [];

    return {
      ...ticket,
      linkedDuplicateKeys,
      pendingLinkedDuplicateKeys,
    };
  });
  const reviewItems = createReviewWorkItems(issues, prs, {
    ticketKeyPrefixes: config?.ticketKeyPrefixes,
    username: config?.githubUsername,
  });
  const reviewUrls = new Set(reviewItems.map((item) => item.pr.url));

  return {
    actions: [
      ...tickets.flatMap(getDashboardActions),
      ...getReviewWorkActions(reviewItems),
    ],
    reviewItems,
    tickets: sortDashboardTickets(tickets),
    unlinkedPRs: unlinkedPRs.filter((pr) => !reviewUrls.has(pr.url)),
  };
}
