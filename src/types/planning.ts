import type { IsoTimestamp } from "./persistence";

export type PlannedPeriod = "today" | "week" | null;
export type ManualPriority = "low" | "normal" | "high" | "urgent";
export type ActiveDevelopmentSource = "manual" | "jira" | null;
export type PlanningReason =
  | "deprioritized"
  | "not-my-responsibility"
  | "waiting-on-someone"
  | "duplicate"
  | "other";

export interface TicketPlan {
  activeDevelopmentSource: ActiveDevelopmentSource;
  activeDevelopmentStartedAt: IsoTimestamp | null;
  blockedReason: PlanningReason | null;
  deferredReason: PlanningReason | null;
  deferredUntil: IsoTimestamp | null;
  duplicateOfTicketKey: string | null;
  hiddenReason: PlanningReason | null;
  isActiveDevelopment: boolean;
  isBlocked: boolean;
  isHidden: boolean;
  isPlanned: boolean;
  manualOrder: number | null;
  manualPriority: ManualPriority | null;
  notes: string;
  plannedPeriod: PlannedPeriod;
  resolvedChangesRequestedAt: IsoTimestamp | null;
  ticketKey: string;
}

export type TicketPlansByKey = Record<string, TicketPlan>;
