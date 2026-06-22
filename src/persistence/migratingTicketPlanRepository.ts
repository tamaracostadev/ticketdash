import type { TicketPlan, TicketPlansByKey } from "../types/planning";
import type { TicketPlanImporter } from "./httpTicketPlanRepository";
import type { TicketPlanRepository } from "./ticketPlanRepository";

export class MigratingTicketPlanRepository implements TicketPlanRepository {
  public constructor(
    private readonly remote: TicketPlanRepository & TicketPlanImporter,
    private readonly local: TicketPlanRepository,
  ) {}

  public clear(): Promise<void> {
    return this.remote.clear();
  }

  public async load(): Promise<TicketPlansByKey> {
    const localPlans = await this.local.load();
    if (Object.keys(localPlans).length > 0) {
      await this.remote.import(localPlans);
      await this.local.clear();
    }
    return this.remote.load();
  }

  public remove(ticketKey: string): Promise<void> {
    return this.remote.remove(ticketKey);
  }

  public reorder(ticketKeys: string[]): Promise<void> {
    return this.remote.reorder(ticketKeys);
  }

  public save(plan: TicketPlan): Promise<void> {
    return this.remote.save(plan);
  }
}
