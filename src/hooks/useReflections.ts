import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchReflections,
  removeReflection,
  saveReflection,
} from "../api/reflections";
import type { TicketReflection } from "../types/reflections";

export function useReflections() {
  const queryClient = useQueryClient();
  const reflections = useQuery({
    queryFn: () => fetchReflections(),
    queryKey: ["reflections"],
  });

  const save = useMutation({
    mutationFn: (reflection: TicketReflection) => saveReflection(reflection),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reflections"] });
    },
  });

  const remove = useMutation({
    mutationFn: (ticketKey: string) => removeReflection(ticketKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reflections"] });
    },
  });

  return {
    data: reflections.data ?? {},
    error: reflections.error,
    isLoading: reflections.isPending,
    isMutating: save.isPending || remove.isPending,
    remove: remove.mutateAsync,
    save: save.mutateAsync,
  };
}
