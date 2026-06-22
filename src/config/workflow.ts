import type { WorkflowStatusConfig } from "../types/integrations";
import type { ExternalWorkflowColumn } from "../types/workflow";

export const FINALIZED_WINDOW_DAYS = 14;

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatusConfig = {
  backlog: ["Backlog", "Delivery", "Open", "Ready", "To Do"],
  codeReview: ["Code Review", "In Review"],
  development: ["Development", "Dev", "Dev In Progress", "In Progress"],
  finalized: [
    "Alpha",
    "Announce",
    "Beta",
    "Closed",
    "Deleted",
    "Done",
    "Released",
    "Shipped",
  ],
  release: ["Ready for Production", "Ready for Release", "Waiting for Release"],
  testing: ["In QA", "QA In Progress", "Test", "Test In Progress", "Testing"],
};

function normalizeStatusName(statusName: string): string {
  return statusName.trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeWorkflowStatuses(
  defaults: string[],
  configured: string[],
): string[] {
  const merged = [...defaults];
  const seen = new Set(defaults.map(normalizeStatusName));

  for (const statusName of configured) {
    const normalized = normalizeStatusName(statusName);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(statusName);
  }

  return merged;
}

export function resolveWorkflowStatuses(
  configured: WorkflowStatusConfig = DEFAULT_WORKFLOW_STATUSES,
): WorkflowStatusConfig {
  return {
    backlog: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.backlog,
      configured.backlog,
    ),
    codeReview: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.codeReview,
      configured.codeReview,
    ),
    development: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.development,
      configured.development,
    ),
    finalized: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.finalized,
      configured.finalized,
    ),
    release: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.release,
      configured.release,
    ),
    testing: mergeWorkflowStatuses(
      DEFAULT_WORKFLOW_STATUSES.testing,
      configured.testing,
    ),
  };
}

export function getWorkflowColumnForStatus(
  statusName: string,
  configured: WorkflowStatusConfig = DEFAULT_WORKFLOW_STATUSES,
): ExternalWorkflowColumn | null {
  const resolved = resolveWorkflowStatuses(configured);
  const statuses = {
    backlog: resolved.backlog,
    "code-review": resolved.codeReview,
    development: resolved.development,
    finalized: resolved.finalized,
    release: resolved.release,
    testing: resolved.testing,
  } satisfies Record<ExternalWorkflowColumn, string[]>;

  const normalized = normalizeStatusName(statusName);
  return (
    Object.entries(statuses).find(([, names]) =>
      names.some((name) => normalizeStatusName(name) === normalized)
    )?.[0] as ExternalWorkflowColumn | undefined
  ) ?? null;
}
