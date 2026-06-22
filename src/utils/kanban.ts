import type { WorkflowColumn } from "../types/workflow";
import type { DashboardTicket } from "./dashboard";
import { sortDashboardTickets } from "./sortTickets";

export type KanbanColumnId = WorkflowColumn | "unclassified";

export interface KanbanColumnData {
  id: KanbanColumnId;
  label: string;
  tickets: DashboardTicket[];
}

const COLUMNS: ReadonlyArray<{ id: WorkflowColumn; label: string }> = [
  { id: "backlog", label: "Backlog" },
  { id: "planned", label: "Planned" },
  { id: "development", label: "Development" },
  { id: "code-review", label: "Code review" },
  { id: "testing", label: "Testing" },
  { id: "release", label: "Release" },
  { id: "finalized", label: "Finalized" },
];

export function createKanbanColumns(
  tickets: DashboardTicket[],
): KanbanColumnData[] {
  const operational = tickets.filter(
    (ticket) => ticket.planningVisibility === "operational",
  );
  const columns = COLUMNS.map(({ id, label }) => ({
    id,
    label,
    tickets: sortDashboardTickets(
      operational.filter((ticket) => ticket.workflow.column === id),
    ),
  }));
  const unclassified = operational.filter(
    (ticket) => ticket.workflow.column === null,
  );

  return unclassified.length > 0
    ? [...columns, {
        id: "unclassified",
        label: "Unclassified",
        tickets: sortDashboardTickets(unclassified),
      }]
    : columns;
}
