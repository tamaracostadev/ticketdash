import type { TicketPlan } from "../types/planning";
import type { TicketReflection } from "../types/reflections";
import type { KanbanColumnData } from "../utils/kanban";
import { createTicketCardViewModel } from "../utils/ticketCard";
import { TicketCard } from "./TicketCard";

interface KanbanColumnProps {
  column: KanbanColumnData;
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  onRemovePlan: (ticketKey: string) => void;
  onRemoveReflection: (ticketKey: string) => void | Promise<void>;
  onSavePlan: (plan: TicketPlan) => void;
  onSaveReflection: (reflection: TicketReflection) => void | Promise<void>;
}

export function KanbanColumn({
  column,
  duplicateCandidates,
  onRemovePlan,
  onRemoveReflection,
  onSavePlan,
  onSaveReflection,
}: KanbanColumnProps) {
  return (
    <section className="w-[340px] shrink-0 rounded-xl bg-slate-900/60 p-3">
      <h3 className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-slate-900/95 px-2 py-2 font-semibold text-slate-200 backdrop-blur">
        <span>{column.label}</span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {column.tickets.length}
        </span>
      </h3>
      <div className="mt-3 space-y-3">
        {column.tickets.map((ticket) => (
          <div key={ticket.issue.key}>
            <TicketCard
              card={createTicketCardViewModel(ticket, duplicateCandidates)}
              onRemovePlan={onRemovePlan}
              onRemoveReflection={onRemoveReflection}
              onSavePlan={onSavePlan}
              onSaveReflection={onSaveReflection}
            />
          </div>
        ))}
        {column.tickets.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">
            No tickets
          </p>
        )}
      </div>
    </section>
  );
}
