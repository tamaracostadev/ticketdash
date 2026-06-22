import { useShallow } from "zustand/react/shallow";

import { useTicketPlansStore } from "../store/ticketPlans";

export function useTicketPlans() {
  return useTicketPlansStore(
    useShallow(({ clear, error, hydrate, isHydrated, plans, remove, reorder, save }) => ({
      clear,
      error,
      hydrate,
      isHydrated,
      plans,
      remove,
      reorder,
      save,
    })),
  );
}
