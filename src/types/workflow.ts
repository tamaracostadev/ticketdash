export type WorkflowColumn =
  | "backlog"
  | "planned"
  | "development"
  | "code-review"
  | "testing"
  | "release"
  | "finalized";

export type ExternalWorkflowColumn = Exclude<WorkflowColumn, "planned">;

export type WorkflowClassificationReason =
  | "manual-planning"
  | "jira-done-category"
  | "jira-status"
  | "github-open-pr"
  | "unclassified";

export type SystemPlanningReason = "changes-requested" | "merge-conflict";

export type WorkflowDivergence =
  | "jira-review-without-pr"
  | "release-with-open-pr"
  | "pr-outside-code-review";

export interface WorkflowClassification {
  column: WorkflowColumn | null;
  divergence: WorkflowDivergence | null;
  externalColumn: ExternalWorkflowColumn | null;
  reason: WorkflowClassificationReason;
  systemPlanningReasons: SystemPlanningReason[];
}

export interface WorkflowClassificationOptions {
  canEvaluateMissingPR?: boolean;
  isPlanned?: boolean;
  systemPlanningReasons?: SystemPlanningReason[];
}
