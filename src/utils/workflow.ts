import { getWorkflowColumnForStatus } from "../config/workflow";
import type { WorkflowStatusConfig } from "../types/integrations";
import type { JiraIssue } from "../types/jira";
import type {
  ExternalWorkflowColumn,
  WorkflowClassification,
  WorkflowClassificationOptions,
  WorkflowDivergence,
} from "../types/workflow";

interface ExternalClassification {
  column: ExternalWorkflowColumn | null;
  divergence: WorkflowDivergence | null;
  reason: WorkflowClassification["reason"];
}

function getDivergence(
  column: ExternalWorkflowColumn,
  hasPR = false,
  canEvaluateMissingPR = false,
): WorkflowDivergence | null {
  if (column === "code-review" && !hasPR && canEvaluateMissingPR) {
    return "jira-review-without-pr";
  }

  if (column === "release" && hasPR) {
    return "release-with-open-pr";
  }

  if (column !== "code-review" && hasPR) {
    return "pr-outside-code-review";
  }

  return null;
}

function classifyExternalWorkflow(
  issue: JiraIssue,
  hasPR = false,
  canEvaluateMissingPR = false,
  workflowStatuses?: WorkflowStatusConfig,
): ExternalClassification {
  if (issue.fields.status.statusCategory.key.toLowerCase() === "done") {
    return {
      column: "finalized",
      divergence: getDivergence("finalized", hasPR, canEvaluateMissingPR),
      reason: "jira-done-category",
    };
  }

  const jiraColumn = getWorkflowColumnForStatus(
    issue.fields.status.name,
    workflowStatuses,
  );
  if (jiraColumn !== null) {
    return {
      column: jiraColumn,
      divergence: getDivergence(jiraColumn, hasPR, canEvaluateMissingPR),
      reason: "jira-status",
    };
  }

  if (hasPR) {
    return {
      column: "code-review",
      divergence: "pr-outside-code-review",
      reason: "github-open-pr",
    };
  }

  return {
    column: null,
    divergence: null,
    reason: "unclassified",
  };
}

export function classifyWorkflow(
  issue: JiraIssue,
  hasPR = false,
  options: WorkflowClassificationOptions = {},
  workflowStatuses?: WorkflowStatusConfig,
): WorkflowClassification {
  const {
    canEvaluateMissingPR = false,
    isPlanned = false,
    systemPlanningReasons = [],
  } = options;
  const external = classifyExternalWorkflow(
    issue,
    hasPR,
    canEvaluateMissingPR,
    workflowStatuses,
  );
  const canPlan =
    external.column === "backlog" || external.column === "development";

  if (canPlan && isPlanned) {
    return {
      column: "planned",
      divergence: external.divergence,
      externalColumn: external.column,
      reason: "manual-planning",
      systemPlanningReasons,
    };
  }

  return {
    column: external.column,
    divergence: external.divergence,
    externalColumn: external.column,
    reason: external.reason,
    systemPlanningReasons,
  };
}
