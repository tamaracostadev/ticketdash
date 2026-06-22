import type { TicketPlan } from "./planning";
import type { TicketReflection } from "./reflections";

export type TicketBadgeOrigin = "attention" | "external" | "personal";
export type TicketBadgeTone =
  | "danger"
  | "info"
  | "neutral"
  | "success"
  | "warning";

export interface TicketBadgeViewModel {
  id: string;
  label: string;
  origin: TicketBadgeOrigin;
  tone: TicketBadgeTone;
}

export interface PriorityReasonViewModel {
  label: string;
  score: number;
}

export interface TicketCardViewModel {
  badges: TicketBadgeViewModel[];
  canPlan: boolean;
  canReturnToDevelopment: boolean;
  changesRequested: {
    isPending: boolean;
    reviewAt: string;
  } | null;
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  duplicateOfTicketKey: string | null;
  isInDevelopment: boolean;
  jiraStatus: string;
  jiraUrl: string;
  notes: string | null;
  operationalColumn: string;
  plan: TicketPlan;
  prs: Array<{
    hasConflict: boolean;
    label: string;
    number: number;
    openThreadCount: number;
    repository: string;
    tooltip: string | null;
    url: string;
  }>;
  priority: {
    automaticLabel: string;
    manualLabel: string | null;
    reasons: PriorityReasonViewModel[];
    score: number;
  };
  reflection: TicketReflection | null;
  reflectionSummary: string | null;
  linkedDuplicateKeys: string[];
  pendingLinkedDuplicateKeys: string[];
  ticketKey: string;
  title: string;
}
