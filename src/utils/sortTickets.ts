import type { ManualPriority, PlannedPeriod } from "../types/planning";
import type { AutomaticPriorityLevel } from "../types/priority";
import type { DashboardTicket } from "./dashboard";

const LEVEL_RANK: Readonly<
  Record<AutomaticPriorityLevel | ManualPriority, number>
> = {
  high: 2,
  low: 0,
  normal: 1,
  urgent: 3,
};

const PERIOD_RANK: Readonly<Record<Exclude<PlannedPeriod, null>, number>> = {
  today: 0,
  week: 1,
};

function compareManualOrder(
  left: DashboardTicket,
  right: DashboardTicket,
): number {
  if (left.workflow.column !== right.workflow.column) {
    return 0;
  }

  const leftOrder = left.plan.manualOrder;
  const rightOrder = right.plan.manualOrder;
  if (leftOrder !== null && rightOrder !== null) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== null) return -1;
  if (rightOrder !== null) return 1;

  return 0;
}

function comparePlanned(left: DashboardTicket, right: DashboardTicket): number {
  if (left.workflow.column !== "planned" || right.workflow.column !== "planned") {
    return 0;
  }

  const manualOrder = compareManualOrder(left, right);
  if (manualOrder !== 0) return manualOrder;

  const leftPeriod =
    left.plan.plannedPeriod === null ? 2 : PERIOD_RANK[left.plan.plannedPeriod];
  const rightPeriod =
    right.plan.plannedPeriod === null ? 2 : PERIOD_RANK[right.plan.plannedPeriod];
  if (leftPeriod !== rightPeriod) return leftPeriod - rightPeriod;
  return 0;
}

function getEffectiveRank(ticket: DashboardTicket): number {
  return LEVEL_RANK[ticket.plan.manualPriority ?? ticket.priority.level];
}

export function compareDashboardTickets(
  left: DashboardTicket,
  right: DashboardTicket,
): number {
  const planned = comparePlanned(left, right);
  if (planned !== 0) return planned;

  const manualOrder = compareManualOrder(left, right);
  if (manualOrder !== 0) return manualOrder;

  const effectivePriority = getEffectiveRank(right) - getEffectiveRank(left);
  if (effectivePriority !== 0) return effectivePriority;

  const automaticPriority = right.priority.score - left.priority.score;
  if (automaticPriority !== 0) return automaticPriority;

  const updated =
    Date.parse(right.issue.fields.updated) - Date.parse(left.issue.fields.updated);
  if (updated !== 0) return updated;

  return left.issue.key.localeCompare(right.issue.key);
}

export function sortDashboardTickets(tickets: DashboardTicket[]): DashboardTicket[] {
  return [...tickets].sort(compareDashboardTickets);
}
