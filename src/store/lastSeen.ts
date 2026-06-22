import { create, type StoreApi, type UseBoundStore } from "zustand";

import {
  lastSeenRepository,
  type LastSeenRepository,
} from "../persistence/index";
import type { LastSeenByTicket } from "../types/persistence";

export interface LastSeenState {
  error: string | null;
  isHydrated: boolean;
  lastSeen: LastSeenByTicket;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
  markSeen: (ticketId: string) => Promise<void>;
}

export type LastSeenStore = UseBoundStore<StoreApi<LastSeenState>>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown persistence error";
}

export function createLastSeenStore(
  repository: LastSeenRepository,
  now: () => Date = () => new Date(),
): LastSeenStore {
  return create<LastSeenState>()((set) => ({
    error: null,
    isHydrated: false,
    lastSeen: {},
    clear: async () => {
      try {
        await repository.clear();
        set({ error: null, lastSeen: {} });
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
    hydrate: async () => {
      try {
        set({ error: null, isHydrated: true, lastSeen: await repository.load() });
      } catch (error) {
        set({ error: getErrorMessage(error), isHydrated: true });
      }
    },
    markSeen: async (ticketId) => {
      const normalizedId = ticketId.toUpperCase();
      const seenAt = now().toISOString();
      try {
        await repository.markSeen(normalizedId, seenAt);
        set(({ lastSeen }) => ({
          error: null,
          lastSeen: { ...lastSeen, [normalizedId]: seenAt },
        }));
      } catch (error) {
        set({ error: getErrorMessage(error) });
      }
    },
  }));
}

export const useLastSeenStore = createLastSeenStore(lastSeenRepository);
