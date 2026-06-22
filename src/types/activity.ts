import type { GitHubMergeable } from "./github";
import type { IsoTimestamp } from "./persistence";
import type { ExternalWorkflowColumn } from "./workflow";

export type RejectionReason = "rejected-by-review" | "rejected-by-qa";
export type ActivityReviewStatus =
  | "approved"
  | "changes-requested"
  | "draft"
  | "partially-approved"
  | "pending-review";

export interface ActivityPRReview {
  authorLogin: string | null;
  state: "APPROVED" | "CHANGES_REQUESTED";
  submittedAt: IsoTimestamp;
}

export interface ActivityPullRequest {
  latestCommitAt: IsoTimestamp | null;
  latestOpinionatedReviews: ActivityPRReview[];
  mergeable: GitHubMergeable;
  number: number;
  openThreadCount: number;
  repository: string;
  reviewStatus: ActivityReviewStatus;
}

export interface ActivityObservationInput {
  hasConflict: boolean;
  jiraStatus: string;
  observedAt: IsoTimestamp;
  openThreadCount: number;
  pullRequests: ActivityPullRequest[];
  reviewState: string;
  ticketKey: string;
  workflowColumn: ExternalWorkflowColumn;
}

export interface ActivityState {
  rejectionReason: RejectionReason | null;
  ticketKey: string;
  workflowColumn: ExternalWorkflowColumn;
}

export type ActivityStateByTicket = Record<string, ActivityState>;

export interface ActivityEvent {
  currentValue: unknown;
  eventType: string;
  id?: number;
  occurredAt: IsoTimestamp;
  origin: "system" | "user";
  previousValue: unknown;
  ticketKey: string;
}
