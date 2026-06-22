import type { ManualPriority } from "../types/planning";
import type {
  ReflectionDifficulty,
  ReflectionOutcome,
  TicketReflection,
} from "../types/reflections";
import type { AutomaticPriorityReasonType } from "../types/priority";
import type {
  TicketBadgeViewModel,
  TicketCardViewModel,
} from "../types/ticketCard";
import type { WorkflowColumn } from "../types/workflow";
import type { DashboardTicket } from "./dashboard";
import { getJiraUrl } from "./dashboard";
import { getPRReviewSummary } from "./pullRequests";
import { getWorkflowAlerts } from "./workflowAlerts";

const WORKFLOW_LABELS: Record<WorkflowColumn, string> = {
  backlog: "Backlog",
  "code-review": "Code review",
  development: "Development",
  finalized: "Finalized",
  planned: "Planned",
  release: "Release",
  testing: "Testing",
};

const PRIORITY_LABELS: Record<ManualPriority, string> = {
  high: "High",
  low: "Low",
  normal: "Normal",
  urgent: "Urgent",
};
const DIFFICULTY_LABELS: Record<Exclude<ReflectionDifficulty, null>, string> = {
  high: "Difficulty: High",
  low: "Difficulty: Low",
  medium: "Difficulty: Medium",
};
const OUTCOME_LABELS: Record<Exclude<ReflectionOutcome, null>, string> = {
  blocked: "Outcome: Blocked",
  done: "Outcome: Done",
  dropped: "Outcome: Dropped",
  partial: "Outcome: Partial",
};

const REASON_LABELS: Record<AutomaticPriorityReasonType, string> = {
  "changes-requested": "Changes requested",
  "merge-conflict": "Merge conflict",
  "open-threads": "Open threads",
  "rejected-by-qa": "Rejected by QA",
  "rejected-by-review": "Rejected by review",
  "unread-comments": "New comments",
};

const WORKFLOW_ALERT_LABELS = {
  "code-review-without-pr": "Code review without PR",
  "release-with-open-pr": "Release with open PR",
  "testing-with-open-threads": "Test with open threads",
} as const;

function getPersonalBadges(ticket: DashboardTicket): TicketBadgeViewModel[] {
  const badges: TicketBadgeViewModel[] = [];
  if (ticket.plan.isPlanned) {
    const label =
      ticket.plan.plannedPeriod === "today"
        ? "Today"
        : ticket.plan.plannedPeriod === "week"
          ? "This week"
          : "Planned";
    badges.push({ id: "planned", label, origin: "personal", tone: "info" });
  }
  if (ticket.plan.isActiveDevelopment) {
    badges.push({
      id: "active-development",
      label: "Active in development",
      origin: "personal",
      tone: "success",
    });
  }
  if (ticket.plan.manualPriority) {
    badges.push({
      id: "manual-priority",
      label: `Manual: ${PRIORITY_LABELS[ticket.plan.manualPriority]}`,
      origin: "personal",
      tone: "info",
    });
  }
  if (ticket.plan.isBlocked) {
    badges.push({ id: "blocked", label: "Blocked", origin: "personal", tone: "danger" });
  }
  if (
    ticket.prs.some(({ pr }) => pr.reviewDecision === "CHANGES_REQUESTED") &&
    !ticket.hasChangesRequested
  ) {
    badges.push({
      id: "changes-addressed",
      label: "Changes addressed",
      origin: "personal",
      tone: "success",
    });
  }
  if (ticket.duplicateOfTicketKey) {
    badges.push({
      id: "linked-duplicate",
      label: `Linked to ${ticket.duplicateOfTicketKey}`,
      origin: "personal",
      tone: "neutral",
    });
  }
  if (ticket.linkedDuplicateKeys.length > 0) {
    badges.push({
      id: "linked-duplicates",
      label:
        ticket.linkedDuplicateKeys.length === 1
          ? "1 linked duplicate"
          : `${ticket.linkedDuplicateKeys.length} linked duplicates`,
      origin: "personal",
      tone: "info",
    });
  }
  if (ticket.planningVisibility !== "operational") {
    badges.push({
      id: ticket.planningVisibility,
      label: ticket.planningVisibility === "hidden" ? "Hidden" : "Deferred",
      origin: "personal",
      tone: "neutral",
    });
  }
  if (ticket.reflection?.difficulty) {
    badges.push({
      id: "reflection-difficulty",
      label: DIFFICULTY_LABELS[ticket.reflection.difficulty],
      origin: "personal",
      tone: "neutral",
    });
  }
  if (ticket.reflection?.outcome) {
    badges.push({
      id: "reflection-outcome",
      label: OUTCOME_LABELS[ticket.reflection.outcome],
      origin: "personal",
      tone: "success",
    });
  }
  return badges;
}

function getReflectionSummary(reflection: TicketReflection | null): string | null {
  if (!reflection) return null;
  const parts = [
    reflection.blockers.trim(),
    reflection.learnings.trim(),
    reflection.notes.trim(),
  ].filter((part) => part !== "");
  return parts[0] ?? null;
}

function getAttentionBadges(ticket: DashboardTicket): TicketBadgeViewModel[] {
  const badges: TicketBadgeViewModel[] = ticket.priority.reasons.map((reason) => {
    const tone: TicketBadgeViewModel["tone"] = reason.score >= 80
      ? "danger"
      : reason.score >= 40
        ? "warning"
        : "neutral";
    return {
      id: reason.type,
      label:
        reason.type === "open-threads"
          ? `${ticket.openThreadCount} open threads`
          : REASON_LABELS[reason.type],
      origin: "attention",
      tone,
    };
  });
  for (const alert of getWorkflowAlerts(ticket)) {
    badges.push({
      id: alert,
      label: WORKFLOW_ALERT_LABELS[alert],
      origin: "attention",
      tone: "warning",
    });
  }
  return badges;
}

export function createTicketCardViewModel(
  ticket: DashboardTicket,
  duplicateCandidates: Array<{ ticketKey: string; title: string }>,
): TicketCardViewModel {
  const badges = [...getPersonalBadges(ticket), ...getAttentionBadges(ticket)];
  if (
    ticket.workflow.externalColumn !== null &&
    ticket.workflow.externalColumn !== ticket.workflow.column
  ) {
    badges.push({
      id: "external-workflow",
      label: `From ${WORKFLOW_LABELS[ticket.workflow.externalColumn]}`,
      origin: "external",
      tone: "neutral",
    });
  }

  return {
    badges,
    canPlan:
      ticket.workflow.externalColumn === "backlog" ||
      ticket.workflow.externalColumn === "development",
    canReturnToDevelopment:
      ticket.workflow.externalColumn !== null &&
      ticket.workflow.externalColumn !== "development" &&
      (ticket.hasConflict ||
        ticket.workflow.externalColumn === "code-review" ||
        ticket.workflow.externalColumn === "testing"),
    changesRequested:
      ticket.prs.some(({ pr }) => pr.reviewDecision === "CHANGES_REQUESTED") &&
      ticket.changesRequestedAt !== null
        ? {
            isPending: ticket.hasChangesRequested,
            reviewAt: ticket.changesRequestedAt,
          }
        : null,
    duplicateCandidates: duplicateCandidates.filter(
      (candidate) => candidate.ticketKey !== ticket.issue.key,
    ),
    duplicateOfTicketKey: ticket.duplicateOfTicketKey,
    isInDevelopment: ticket.workflow.externalColumn === "development",
    jiraStatus: ticket.issue.fields.status.name,
    jiraUrl: getJiraUrl(ticket.issue),
    notes: ticket.plan.notes.trim() || null,
    operationalColumn: ticket.workflow.column
      ? WORKFLOW_LABELS[ticket.workflow.column]
      : "Unclassified",
    plan: ticket.plan,
    prs: ticket.prs.map(({ hasConflict, openThreadCount, pr }) => {
      const review = getPRReviewSummary(pr);
      return {
        hasConflict,
        label: review.label,
        number: pr.number,
        openThreadCount,
        repository: pr.repository.name,
        tooltip: review.tooltip,
        url: pr.url,
      };
    }),
    priority: {
      automaticLabel: PRIORITY_LABELS[ticket.priority.level],
      manualLabel: ticket.plan.manualPriority
        ? PRIORITY_LABELS[ticket.plan.manualPriority]
        : null,
      reasons: ticket.priority.reasons.map((reason) => ({
        label: REASON_LABELS[reason.type],
        score: reason.score,
      })),
      score: ticket.priority.score,
    },
    reflection: ticket.reflection,
    reflectionSummary: getReflectionSummary(ticket.reflection),
    linkedDuplicateKeys: ticket.linkedDuplicateKeys,
    pendingLinkedDuplicateKeys: ticket.pendingLinkedDuplicateKeys,
    ticketKey: ticket.issue.key,
    title: ticket.issue.fields.summary,
  };
}
