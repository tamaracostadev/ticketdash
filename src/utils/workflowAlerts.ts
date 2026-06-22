import type { DashboardTicket } from "./dashboard";

export type WorkflowAlert =
  | "code-review-without-pr"
  | "release-with-open-pr"
  | "testing-with-open-threads";

export function getWorkflowAlerts(ticket: DashboardTicket): WorkflowAlert[] {
  const column = ticket.workflow.externalColumn ?? ticket.workflow.column;
  const alerts: WorkflowAlert[] = [];

  if (column === "code-review" && ticket.prs.length === 0) {
    alerts.push("code-review-without-pr");
  }
  if (column === "release" && ticket.prs.length > 0) {
    alerts.push("release-with-open-pr");
  }
  if (column === "testing" && ticket.openThreadCount > 0) {
    alerts.push("testing-with-open-threads");
  }

  return alerts;
}

export function hasWorkflowAlert(ticket: DashboardTicket): boolean {
  return getWorkflowAlerts(ticket).length > 0;
}
