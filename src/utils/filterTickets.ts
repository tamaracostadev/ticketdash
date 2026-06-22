import type { TicketFilters } from "../types/filters";
import type { GitHubPR } from "../types/github";
import type { DashboardTicket } from "./dashboard";
import { getPRReviewSummary } from "./pullRequests";
import { hasWorkflowAlert } from "./workflowAlerts";

export function hasActiveTicketFilters(filters: TicketFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.project !== "all" ||
    filters.workflow !== "all" ||
    filters.jiraStatus !== "all" ||
    filters.pr !== "all" ||
    filters.visibility !== "operational" ||
    filters.attention !== "all" ||
    filters.onlyConflict ||
    filters.onlyUnreadComments ||
    filters.onlyOpenThreads ||
    filters.onlyDivergence
  );
}

export function needsAction(ticket: DashboardTicket): boolean {
  return (
    ticket.hasChangesRequested ||
    ticket.hasConflict ||
    ticket.hasUnreadComment ||
    ticket.openThreadCount > 0 ||
    ticket.pendingLinkedDuplicateKeys.length > 0 ||
    ticket.rejectionReason !== null ||
    hasWorkflowAlert(ticket)
  );
}

function matchesPR(ticket: DashboardTicket, filter: TicketFilters["pr"]): boolean {
  if (filter === "all") return true;
  if (filter === "no-pr") return ticket.prs.length === 0;
  return ticket.prs.some(({ pr }) => getPRFilter(pr) === filter);
}

function getPRFilter(pr: GitHubPR): Exclude<TicketFilters["pr"], "all" | "no-pr"> {
  return getPRReviewSummary(pr).status;
}

function matchesWorkflow(
  ticket: DashboardTicket,
  filter: TicketFilters["workflow"],
): boolean {
  if (filter === "all") return true;
  if (filter === "unclassified") return ticket.workflow.column === null;
  return ticket.workflow.column === filter;
}

export function filterTickets(
  tickets: DashboardTicket[],
  filters: TicketFilters,
): DashboardTicket[] {
  const search = filters.search.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const hasAction = needsAction(ticket);
    return (
      (search === "" ||
        ticket.issue.key.toLowerCase().includes(search) ||
        ticket.issue.fields.summary.toLowerCase().includes(search)) &&
      (filters.project === "all" ||
        ticket.issue.key.toUpperCase().startsWith(`${filters.project}-`)) &&
      (filters.jiraStatus === "all" ||
        ticket.issue.fields.status.name === filters.jiraStatus) &&
      matchesWorkflow(ticket, filters.workflow) &&
      matchesPR(ticket, filters.pr) &&
      (filters.visibility === "all" ||
        ticket.planningVisibility === filters.visibility) &&
      (filters.attention === "all" ||
        (filters.attention === "action-required" && hasAction) ||
        (filters.attention === "no-action" && !hasAction)) &&
      (!filters.onlyConflict || ticket.hasConflict) &&
      (!filters.onlyUnreadComments || ticket.hasUnreadComment) &&
      (!filters.onlyOpenThreads || ticket.openThreadCount > 0) &&
      (!filters.onlyDivergence || hasWorkflowAlert(ticket))
    );
  });
}
