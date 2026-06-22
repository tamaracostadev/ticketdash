import { create, type StoreApi, type UseBoundStore } from "zustand";

import {
  ticketPlanRepository,
  type TicketPlanRepository,
} from "../persistence/index";
import type { TicketPlan, TicketPlansByKey } from "../types/planning";

export interface TicketPlansState {
  error: string | null;
  isHydrated: boolean;
  plans: TicketPlansByKey;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
  remove: (ticketKey: string) => Promise<void>;
  reorder: (ticketKeys: string[]) => Promise<void>;
  save: (plan: TicketPlan) => Promise<void>;
}

export type TicketPlansStore = UseBoundStore<StoreApi<TicketPlansState>>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown persistence error";
}

export function createTicketPlansStore(
  repository: TicketPlanRepository,
): TicketPlansStore {
  return create<TicketPlansState>()((set) => ({
    error: null,
    isHydrated: false,
    plans: {},
    clear: async () => {
      try {
        await repository.clear();
        set({ error: null, plans: {} });
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
    hydrate: async () => {
      try {
        set({ error: null, isHydrated: true, plans: await repository.load() });
      } catch (error) {
        set({ error: getErrorMessage(error), isHydrated: true });
      }
    },
    remove: async (ticketKey) => {
      const normalizedKey = ticketKey.toUpperCase();
      try {
        await repository.remove(normalizedKey);
        set(({ plans }) => {
          const updatedPlans = { ...plans };
          delete updatedPlans[normalizedKey];
          return { error: null, plans: updatedPlans };
        });
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
    reorder: async (ticketKeys) => {
      const normalizedKeys = ticketKeys.map((ticketKey) => ticketKey.toUpperCase());
      try {
        await repository.reorder(normalizedKeys);
        set(({ plans }) => {
          const updatedPlans = { ...plans };
          normalizedKeys.forEach((ticketKey, index) => {
            const current = updatedPlans[ticketKey];
            if (current) {
              updatedPlans[ticketKey] = {
                ...current,
                manualOrder: index + 1,
              };
            }
          });
          return { error: null, plans: updatedPlans };
        });
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
    save: async (plan) => {
      const ticketKey = plan.ticketKey.toUpperCase();
      const normalizedPlan = { ...plan, ticketKey };
      try {
        await repository.save(normalizedPlan);
        set(({ plans }) => ({
          error: null,
          plans: { ...plans, [ticketKey]: normalizedPlan },
        }));
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
  }));
}

export const useTicketPlansStore = createTicketPlansStore(ticketPlanRepository);
