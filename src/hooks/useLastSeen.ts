import { useShallow } from "zustand/react/shallow";

import { useLastSeenStore } from "../store/lastSeen";

export function useLastSeen() {
  return useLastSeenStore(
    useShallow(({ clear, error, hydrate, isHydrated, lastSeen, markSeen }) => ({
      clear,
      error,
      hydrate,
      isHydrated,
      lastSeen,
      markSeen,
    })),
  );
}
