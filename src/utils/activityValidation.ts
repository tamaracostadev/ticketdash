import type {
  ActivityObservationInput,
  ActivityPullRequest,
  ActivityState,
  ActivityStateByTicket,
  RejectionReason,
} from "../types/activity";
import type { ExternalWorkflowColumn } from "../types/workflow";
import { normalizeIsoTimestamp } from "./dates.ts";
import { normalizeTicketKey } from "./ticketKeys.ts";

const COLUMNS: ExternalWorkflowColumn[] = [
  "backlog", "development", "code-review", "testing", "release", "finalized",
];
const REJECTIONS: RejectionReason[] = [
  "rejected-by-review", "rejected-by-qa",
];
const MERGEABLE = ["MERGEABLE", "CONFLICTING", "UNKNOWN"];
const REVIEWS = [
  "approved", "changes-requested", "draft", "partially-approved",
  "pending-review",
];

function parsePullRequest(value: unknown): ActivityPullRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const pr = value as Record<string, unknown>;
  if (
    !(pr.latestCommitAt === null || normalizeIsoTimestamp(pr.latestCommitAt) !== null) ||
    !Array.isArray(pr.latestOpinionatedReviews) ||
    typeof pr.repository !== "string" ||
    !Number.isInteger(pr.number) ||
    Number(pr.number) < 1 ||
    !MERGEABLE.includes(String(pr.mergeable)) ||
    !REVIEWS.includes(String(pr.reviewStatus)) ||
    !Number.isInteger(pr.openThreadCount) ||
    Number(pr.openThreadCount) < 0
  ) {
    return null;
  }
  for (const review of pr.latestOpinionatedReviews) {
    if (
      typeof review !== "object" ||
      review === null ||
      Array.isArray(review) ||
      !(
        (review as Record<string, unknown>).authorLogin === null ||
        typeof (review as Record<string, unknown>).authorLogin === "string"
      ) ||
      (
        (review as Record<string, unknown>).state !== "APPROVED" &&
        (review as Record<string, unknown>).state !== "CHANGES_REQUESTED"
      ) ||
      normalizeIsoTimestamp((review as Record<string, unknown>).submittedAt) === null
    ) {
      return null;
    }
  }
  return pr as unknown as ActivityPullRequest;
}

export function parseActivityCapture(
  value: unknown,
): ActivityObservationInput[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const observations: ActivityObservationInput[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }
    const input = item as Record<string, unknown>;
    const ticketKey = typeof input.ticketKey === "string"
      ? normalizeTicketKey(input.ticketKey)
      : null;
    const observedAt = normalizeIsoTimestamp(input.observedAt);
    const pullRequests = Array.isArray(input.pullRequests)
      ? input.pullRequests.map(parsePullRequest)
      : null;
    if (
      ticketKey === null ||
      seen.has(ticketKey) ||
      observedAt === null ||
      typeof input.jiraStatus !== "string" ||
      !COLUMNS.includes(input.workflowColumn as ExternalWorkflowColumn) ||
      typeof input.hasConflict !== "boolean" ||
      typeof input.reviewState !== "string" ||
      !Number.isInteger(input.openThreadCount) ||
      Number(input.openThreadCount) < 0 ||
      pullRequests === null ||
      pullRequests.some((pr) => pr === null)
    ) {
      return null;
    }
    seen.add(ticketKey);
    observations.push({
      ...(input as unknown as ActivityObservationInput),
      observedAt,
      pullRequests: pullRequests as ActivityPullRequest[],
      ticketKey,
    });
  }
  return observations;
}

export function parseActivityStates(value: unknown): ActivityStateByTicket | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const states: ActivityStateByTicket = {};
  for (const rawState of Object.values(value)) {
    if (
      typeof rawState !== "object" ||
      rawState === null ||
      Array.isArray(rawState)
    ) {
      return null;
    }
    const state = rawState as Record<string, unknown>;
    const ticketKey = typeof state.ticketKey === "string"
      ? normalizeTicketKey(state.ticketKey)
      : null;
    const rejection = state.rejectionReason;
    if (
      ticketKey === null ||
      !COLUMNS.includes(state.workflowColumn as ExternalWorkflowColumn) ||
      !(rejection === null || REJECTIONS.includes(rejection as RejectionReason))
    ) {
      return null;
    }
    states[ticketKey] = state as unknown as ActivityState;
  }
  return states;
}
