import type { WorkflowColumn } from "./workflow";

export type AttentionFilter = "all" | "action-required" | "no-action";
export type ProjectFilter = "all" | string;
export type VisibilityFilter = "operational" | "hidden" | "deferred" | "all";
export type WorkflowFilter = "all" | WorkflowColumn | "unclassified";
export type PRFilter =
  | "all"
  | "no-pr"
  | "draft"
  | "approved"
  | "partially-approved"
  | "changes-requested"
  | "pending-review";

export interface TicketFilters {
  attention: AttentionFilter;
  jiraStatus: string;
  onlyConflict: boolean;
  onlyDivergence: boolean;
  onlyOpenThreads: boolean;
  onlyUnreadComments: boolean;
  pr: PRFilter;
  project: ProjectFilter;
  search: string;
  visibility: VisibilityFilter;
  workflow: WorkflowFilter;
}

export const EMPTY_TICKET_FILTERS: TicketFilters = {
  attention: "all",
  jiraStatus: "all",
  onlyConflict: false,
  onlyDivergence: false,
  onlyOpenThreads: false,
  onlyUnreadComments: false,
  pr: "all",
  project: "all",
  search: "",
  visibility: "operational",
  workflow: "all",
};
