import type { TicketPlan, TicketPlansByKey } from "../types/planning";
import { parseTicketPlans } from "../utils/ticketPlanValidation";
import type { TicketPlanRepository } from "./ticketPlanRepository";
import {
  LEGACY_STORAGE_KEYS,
  migrateStorageKey,
  STORAGE_KEYS,
} from "./storageKeys";

export class LocalStorageTicketPlanRepository implements TicketPlanRepository {
  public constructor(private readonly storage: Storage = globalThis.localStorage) {}

  public async clear(): Promise<void> {
    this.storage.removeItem(STORAGE_KEYS.plans);
  }

  public async load(): Promise<TicketPlansByKey> {
    migrateStorageKey(
      this.storage,
      LEGACY_STORAGE_KEYS.plans,
      STORAGE_KEYS.plans,
    );
    const stored = this.storage.getItem(STORAGE_KEYS.plans);
    if (stored === null) return {};

    try {
      return parseTicketPlans(JSON.parse(stored) as unknown);
    } catch {
      return {};
    }
  }

  public async remove(ticketKey: string): Promise<void> {
    const plans = await this.load();
    delete plans[ticketKey.toUpperCase()];
    this.storage.setItem(STORAGE_KEYS.plans, JSON.stringify(plans));
  }

  public async save(plan: TicketPlan): Promise<void> {
    const plans = await this.load();
    const ticketKey = plan.ticketKey.toUpperCase();
    plans[ticketKey] = { ...plan, ticketKey };
    this.storage.setItem(STORAGE_KEYS.plans, JSON.stringify(plans));
  }

  public async reorder(ticketKeys: string[]): Promise<void> {
    const plans = await this.load();
    ticketKeys.forEach((ticketKey, index) => {
      const normalizedKey = ticketKey.toUpperCase();
      const plan = plans[normalizedKey];
      if (plan) {
        plans[normalizedKey] = { ...plan, manualOrder: index + 1 };
      }
    });
    this.storage.setItem(STORAGE_KEYS.plans, JSON.stringify(plans));
  }
}
