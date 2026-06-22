import { useMemo, useState } from "react";

import {
  EMPTY_TICKET_FILTERS,
  type TicketFilters,
} from "../types/filters";
import type { DashboardTicket } from "../utils/dashboard";
import {
  filterTickets,
  hasActiveTicketFilters,
} from "../utils/filterTickets";

export function useTicketFilters(tickets: DashboardTicket[]) {
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_TICKET_FILTERS);

  const jiraStatuses = useMemo(
    () =>
      [...new Set(tickets.map((ticket) => ticket.issue.fields.status.name))]
        .sort((left, right) => left.localeCompare(right)),
    [tickets],
  );
  const projects = useMemo(
    () =>
      [...new Set(tickets.map((ticket) => ticket.issue.key.split("-")[0]))]
        .sort((left, right) => left.localeCompare(right)),
    [tickets],
  );
  const filteredTickets = useMemo(
    () => filterTickets(tickets, filters),
    [filters, tickets],
  );
  const hasActiveFilters = hasActiveTicketFilters(filters);

  return {
    clearFilters: () => setFilters(EMPTY_TICKET_FILTERS),
    filteredTickets,
    filters,
    hasActiveFilters,
    jiraStatuses,
    projects,
    setFilters,
  };
}
