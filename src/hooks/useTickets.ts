import { useQuery } from "@tanstack/react-query";

import { fetchJiraIssues } from "../api/jira";
import { useIntegrationStatus } from "./useIntegrationStatus";

export function useTickets() {
  const integrations = useIntegrationStatus();

  return useQuery({
    enabled: integrations.data?.jira === true,
    queryFn: () => fetchJiraIssues(),
    queryKey: ["jira", "tickets"],
  });
}
