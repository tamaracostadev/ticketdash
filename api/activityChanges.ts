import type {
  ActivityObservationInput,
  RejectionReason,
} from "../src/types/activity.ts";
import type { ExternalWorkflowColumn } from "../src/types/workflow.ts";

export interface PreviousObservation {
  hasConflict: boolean;
  jiraStatus: string;
  openThreadCount: number;
  pullRequests: unknown;
  rejectionReason: RejectionReason | null;
  reviewState: string;
  workflowColumn: ExternalWorkflowColumn;
}

export interface ActivityChange {
  current: unknown;
  previous: unknown;
  type: string;
}

export function getRejectionReason(
  previous: PreviousObservation | null,
  currentColumn: ExternalWorkflowColumn,
): RejectionReason | null {
  if (currentColumn !== "development") return null;
  if (previous?.workflowColumn === "code-review") return "rejected-by-review";
  if (previous?.workflowColumn === "testing") return "rejected-by-qa";
  return previous?.workflowColumn === "development"
    ? previous.rejectionReason
    : null;
}

export function isSameObservation(
  previous: PreviousObservation,
  current: ActivityObservationInput,
  rejectionReason: RejectionReason | null,
): boolean {
  return (
    previous.jiraStatus === current.jiraStatus &&
    previous.workflowColumn === current.workflowColumn &&
    previous.rejectionReason === rejectionReason &&
    previous.hasConflict === current.hasConflict &&
    previous.reviewState === current.reviewState &&
    previous.openThreadCount === current.openThreadCount &&
    JSON.stringify(previous.pullRequests) === JSON.stringify(current.pullRequests)
  );
}

export function getActivityChanges(
  previous: PreviousObservation,
  current: ActivityObservationInput,
  rejectionReason: RejectionReason | null,
): ActivityChange[] {
  const changes: ActivityChange[] = [];
  const add = (type: string, oldValue: unknown, newValue: unknown) => {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ current: newValue, previous: oldValue, type });
    }
  };

  add("jira-status-changed", previous.jiraStatus, current.jiraStatus);
  add(
    "workflow-column-changed",
    previous.workflowColumn,
    current.workflowColumn,
  );
  add("merge-conflict-changed", previous.hasConflict, current.hasConflict);
  add("review-state-changed", previous.reviewState, current.reviewState);
  add(
    "open-threads-changed",
    previous.openThreadCount,
    current.openThreadCount,
  );
  add("pull-requests-changed", previous.pullRequests, current.pullRequests);

  if (
    rejectionReason !== null &&
    rejectionReason !== previous.rejectionReason
  ) {
    changes.push({
      current: rejectionReason,
      previous: previous.rejectionReason,
      type: rejectionReason,
    });
  }

  return changes;
}
