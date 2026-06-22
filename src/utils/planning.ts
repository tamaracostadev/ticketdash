import type { TicketPlan } from "../types/planning";

export type PlanningVisibility = "operational" | "hidden" | "deferred";

export function createTicketPlan(ticketKey: string): TicketPlan {
  return {
    activeDevelopmentSource: null,
    activeDevelopmentStartedAt: null,
    blockedReason: null,
    deferredReason: null,
    deferredUntil: null,
    duplicateOfTicketKey: null,
    hiddenReason: null,
    isActiveDevelopment: false,
    isBlocked: false,
    isHidden: false,
    isPlanned: false,
    manualOrder: null,
    manualPriority: null,
    notes: "",
    plannedPeriod: null,
    resolvedChangesRequestedAt: null,
    ticketKey: ticketKey.toUpperCase(),
  };
}

export function isDeferred(plan: TicketPlan, now: Date = new Date()): boolean {
  return (
    plan.deferredUntil !== null &&
    Date.parse(plan.deferredUntil) > now.getTime()
  );
}

export function getPlanningVisibility(
  plan: TicketPlan,
  now: Date = new Date(),
): PlanningVisibility {
  if (plan.isHidden) return "hidden";
  if (isDeferred(plan, now)) return "deferred";
  return "operational";
}

export function withPlanChanges(
  plan: TicketPlan,
  changes: Partial<Omit<TicketPlan, "ticketKey">>,
): TicketPlan {
  const updated = { ...plan, ...changes };
  const isActiveDevelopment = updated.isActiveDevelopment;
  return {
    ...updated,
    activeDevelopmentSource: updated.isActiveDevelopment
      ? updated.activeDevelopmentSource
      : null,
    activeDevelopmentStartedAt: updated.isActiveDevelopment
      ? updated.activeDevelopmentStartedAt
      : null,
    blockedReason: updated.isBlocked ? updated.blockedReason : null,
    duplicateOfTicketKey:
      updated.isHidden && updated.hiddenReason === "duplicate"
        ? updated.duplicateOfTicketKey
        : null,
    hiddenReason: updated.isHidden ? updated.hiddenReason : null,
    isPlanned: isActiveDevelopment ? false : updated.isPlanned,
    manualOrder: isActiveDevelopment ? null : updated.manualOrder,
    plannedPeriod:
      isActiveDevelopment ? null : updated.isPlanned ? updated.plannedPeriod : null,
  };
}
