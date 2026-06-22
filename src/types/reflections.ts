export type ReflectionDifficulty = "low" | "medium" | "high" | null;
export type ReflectionOutcome =
  | "done"
  | "partial"
  | "blocked"
  | "dropped"
  | null;

export interface TicketReflection {
  blockers: string;
  difficulty: ReflectionDifficulty;
  learnings: string;
  notes: string;
  outcome: ReflectionOutcome;
  ticketKey: string;
}

export type TicketReflectionsByKey = Record<string, TicketReflection>;
