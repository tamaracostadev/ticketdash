import type {
  ActiveDevelopmentSource,
  ManualPriority,
  PlannedPeriod,
  PlanningReason,
  TicketPlan,
  TicketPlansByKey,
} from "../types/planning";
import { normalizeIsoTimestamp } from "./dates.ts";
import { normalizeTicketKey } from "./ticketKeys.ts";

const PRIORITIES: ManualPriority[] = ["low", "normal", "high", "urgent"];
const ACTIVE_DEVELOPMENT_SOURCES: Exclude<ActiveDevelopmentSource, null>[] = [
  "manual",
  "jira",
];
const PERIODS: Exclude<PlannedPeriod, null>[] = ["today", "week"];
const REASONS: PlanningReason[] = [
  "deprioritized",
  "not-my-responsibility",
  "waiting-on-someone",
  "duplicate",
  "other",
];

function isOptionalMember<Value extends string>(
  value: unknown,
  members: Value[],
): value is Value | null {
  return value === null || (
    typeof value === "string" && members.includes(value as Value)
  );
}

export function normalizeTicketPlan(value: unknown): TicketPlan | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const plan = value as Record<string, unknown>;
  const ticketKey = typeof plan.ticketKey === "string"
    ? normalizeTicketKey(plan.ticketKey)
    : null;
  const isActiveDevelopment = typeof plan.isActiveDevelopment === "boolean"
    ? plan.isActiveDevelopment
    : false;
  const rawActiveDevelopmentSource = isOptionalMember(
    plan.activeDevelopmentSource ?? null,
    ACTIVE_DEVELOPMENT_SOURCES,
  )
    ? plan.activeDevelopmentSource ?? null
    : "__invalid__";
  const deferredUntil = plan.deferredUntil === null
    ? null
    : normalizeIsoTimestamp(plan.deferredUntil);
  const duplicateOfTicketKey = (plan.duplicateOfTicketKey ?? null) === null
    ? null
    : typeof plan.duplicateOfTicketKey === "string"
      ? normalizeTicketKey(plan.duplicateOfTicketKey)
      : null;
  const activeDevelopmentStartedAt =
    (plan.activeDevelopmentStartedAt ?? null) === null
      ? null
      : normalizeIsoTimestamp(plan.activeDevelopmentStartedAt);
  const resolvedChangesRequestedAt =
    (plan.resolvedChangesRequestedAt ?? null) === null
      ? null
      : normalizeIsoTimestamp(plan.resolvedChangesRequestedAt);
  if (
    ticketKey === null ||
    typeof plan.isPlanned !== "boolean" ||
    typeof plan.isHidden !== "boolean" ||
    typeof plan.isBlocked !== "boolean" ||
    typeof plan.notes !== "string" ||
    rawActiveDevelopmentSource === "__invalid__" ||
    !isOptionalMember(plan.plannedPeriod, PERIODS) ||
    !isOptionalMember(plan.manualPriority, PRIORITIES) ||
    !isOptionalMember(plan.hiddenReason, REASONS) ||
    !isOptionalMember(plan.deferredReason, REASONS) ||
    !isOptionalMember(plan.blockedReason, REASONS) ||
    (duplicateOfTicketKey === null &&
      (plan.duplicateOfTicketKey ?? null) !== null) ||
    deferredUntil === null && plan.deferredUntil !== null ||
    activeDevelopmentStartedAt === null &&
      (plan.activeDevelopmentStartedAt ?? null) !== null ||
    resolvedChangesRequestedAt === null &&
      (plan.resolvedChangesRequestedAt ?? null) !== null ||
    (isActiveDevelopment &&
      (activeDevelopmentStartedAt === null ||
        rawActiveDevelopmentSource === null)) ||
    (!isActiveDevelopment &&
      ((plan.activeDevelopmentStartedAt ?? null) !== null ||
        (plan.activeDevelopmentSource ?? null) !== null)) ||
    !(plan.manualOrder === null ||
      (Number.isInteger(plan.manualOrder) && Number(plan.manualOrder) >= 1))
  ) {
    return null;
  }

  return {
    ...(plan as unknown as TicketPlan),
    activeDevelopmentSource:
      rawActiveDevelopmentSource === "__invalid__"
        ? null
        : rawActiveDevelopmentSource as ActiveDevelopmentSource,
    activeDevelopmentStartedAt,
    deferredUntil,
    duplicateOfTicketKey,
    isActiveDevelopment,
    resolvedChangesRequestedAt,
    ticketKey,
  };
}

export function parseTicketPlans(value: unknown): TicketPlansByKey {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.values(value).reduce<TicketPlansByKey>((plans, valuePlan) => {
    const plan = normalizeTicketPlan(valuePlan);
    if (plan) plans[plan.ticketKey] = plan;
    return plans;
  }, {});
}
