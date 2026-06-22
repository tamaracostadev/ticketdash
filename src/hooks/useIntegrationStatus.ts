import { useQuery } from "@tanstack/react-query";

import { fetchIntegrationStatus } from "../api/integrations";

export function useIntegrationStatus() {
  return useQuery({
    queryFn: () => fetchIntegrationStatus(),
    queryKey: ["integrations", "status"],
    staleTime: 30_000,
  });
}
