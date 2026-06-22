import { useEffect, useRef, useState } from "react";

import type { TicketPlan } from "../types/planning";
import type { TicketReflection } from "../types/reflections";
import type { DashboardTicket } from "../utils/dashboard";
import { createKanbanColumns } from "../utils/kanban";
import { useHorizontalBoardDrag } from "../hooks/useHorizontalBoardDrag";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  demoMode?: boolean;
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  hasActiveFilters: boolean;
  onRemovePlan: (ticketKey: string) => void;
  onRemoveReflection: (ticketKey: string) => void | Promise<void>;
  onSavePlan: (plan: TicketPlan) => void;
  onSaveReflection: (reflection: TicketReflection) => void | Promise<void>;
  tickets: DashboardTicket[];
  totalCount: number;
}

export function KanbanBoard({
  demoMode = false,
  duplicateCandidates,
  hasActiveFilters,
  onRemovePlan,
  onRemoveReflection,
  onSavePlan,
  onSaveReflection,
  tickets,
  totalCount,
}: KanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const horizontalDrag = useHorizontalBoardDrag(hasOverflow);
  const columns = createKanbanColumns(tickets);
  const visibleCount = columns.reduce(
    (total, column) => total + column.tickets.length,
    0,
  );

  useEffect(() => {
    const board = boardRef.current;
    const content = contentRef.current;
    if (!board || !content) return;

    const measure = () => {
      setHasOverflow(content.scrollWidth > board.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <section>
      {visibleCount === 0 && (
        <p className="mb-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          {totalCount === 0
            ? "No active Jira tickets found."
            : hasActiveFilters
              ? "No operational tickets match the filters. Hidden and deferred results remain available in list view."
              : "No operational tickets available."}
        </p>
      )}
      <div
        className={`kanban-scrollbar ${demoMode ? "overflow-x-auto overflow-y-visible" : "max-h-[calc(100vh-16rem)] overflow-auto"} pb-4 ${horizontalDrag.className}`.trim()}
        ref={boardRef}
        onPointerCancel={horizontalDrag.onPointerCancel}
        onPointerDown={horizontalDrag.onPointerDown}
        onPointerMove={horizontalDrag.onPointerMove}
        onPointerUp={horizontalDrag.onPointerUp}
      >
        <div className="flex min-w-max gap-4" ref={contentRef}>
          {columns.map((column) => (
            <KanbanColumn
              column={column}
              duplicateCandidates={duplicateCandidates}
              key={column.id}
              onRemovePlan={onRemovePlan}
              onRemoveReflection={onRemoveReflection}
              onSavePlan={onSavePlan}
              onSaveReflection={onSaveReflection}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
