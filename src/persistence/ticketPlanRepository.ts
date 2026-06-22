import type { TicketPlan, TicketPlansByKey } from "../types/planning";

export interface TicketPlanRepository {
  clear(): Promise<void>;
  load(): Promise<TicketPlansByKey>;
  remove(ticketKey: string): Promise<void>;
  reorder(ticketKeys: string[]): Promise<void>;
  save(plan: TicketPlan): Promise<void>;
}
