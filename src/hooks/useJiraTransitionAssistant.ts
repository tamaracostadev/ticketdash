import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  executeJiraTransitionAssistant,
  fetchJiraTransitionAssistant,
} from "../api/jira";

export function useJiraTransitionAssistant(ticketKey: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const assistant = useQuery({
    enabled,
    queryFn: () => fetchJiraTransitionAssistant(ticketKey),
    queryKey: ["jira", "transition-assistant", ticketKey],
    staleTime: 30_000,
  });

  const execute = useMutation({
    mutationFn: () => executeJiraTransitionAssistant(ticketKey),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jira", "tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", "state"] }),
        queryClient.invalidateQueries({ queryKey: ["jira", "transition-assistant", ticketKey] }),
      ]);
    },
  });

  return { assistant, execute };
}
