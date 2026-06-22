import { useQuery } from "@tanstack/react-query";

import { fetchGitHubPRs } from "../api/github";
import { useIntegrationStatus } from "./useIntegrationStatus";

export function usePRs() {
  const integrations = useIntegrationStatus();

  return useQuery({
    enabled: integrations.data?.github === true,
    queryFn: () => fetchGitHubPRs(),
    queryKey: ["github", "pull-requests"],
  });
}
