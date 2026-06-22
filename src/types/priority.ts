export type AutomaticPriorityLevel = "low" | "normal" | "high" | "urgent";

export type AutomaticPriorityReasonType =
  | "changes-requested"
  | "merge-conflict"
  | "open-threads"
  | "rejected-by-qa"
  | "rejected-by-review"
  | "unread-comments";

export interface AutomaticPriorityReason {
  score: number;
  type: AutomaticPriorityReasonType;
}

export interface TicketPriority {
  level: AutomaticPriorityLevel;
  reasons: AutomaticPriorityReason[];
  score: number;
}
