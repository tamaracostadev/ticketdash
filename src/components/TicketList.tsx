import { ListTodo } from "lucide-react";

import type { DashboardTicket } from "../utils/dashboard";
import type { TicketPlan } from "../types/planning";
import { TicketRow } from "./TicketRow";

interface TicketListProps {
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  hasActiveFilters: boolean;
  onMarkSeen: (ticketId: string) => void;
  onRemovePlan: (ticketKey: string) => void;
  onSavePlan: (plan: TicketPlan) => void;
  tickets: DashboardTicket[];
  totalCount: number;
}

export function TicketList({
  duplicateCandidates,
  hasActiveFilters,
  onMarkSeen,
  onRemovePlan,
  onSavePlan,
  tickets,
  totalCount,
}: TicketListProps) {
  const emptyMessage = hasActiveFilters
    ? "No tickets match the active filters."
    : "No active Jira tickets found.";

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
        <ListTodo size={20} /> Active Jira tickets
      </h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[900px] bg-slate-900/60 text-left">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pull request</th><th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Comments</th><th className="px-4 py-3">Planning</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.issue.key} {...ticket} duplicateCandidates={duplicateCandidates.filter((candidate) => candidate.ticketKey !== ticket.issue.key)} onMarkSeen={onMarkSeen} onRemovePlan={onRemovePlan} onSavePlan={onSavePlan} />
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            {totalCount === 0 ? "No active Jira tickets found." : emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
