import { useQuery } from "@tanstack/react-query";

import { fetchActivityStates } from "../api/activity";

export function useActivityStates() {
  return useQuery({
    queryFn: () => fetchActivityStates(),
    queryKey: ["activity", "state"],
  });
}
