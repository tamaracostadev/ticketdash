import type { PoolClient, QueryResultRow } from "pg";

import {
  getActivityChanges,
  getRejectionReason,
  isSameObservation,
  type PreviousObservation,
} from "./activityChanges.ts";
import { insertSystemEvent } from "./activityEventWriter.ts";
import { reconcileActivityPlan } from "./activityPlanReconciler.ts";
import type { Database } from "./database.ts";
import type {
  ActivityPullRequest,
  ActivityObservationInput,
  RejectionReason,
} from "../src/types/activity.ts";
import type { ExternalWorkflowColumn } from "../src/types/workflow.ts";

interface ObservationRow extends QueryResultRow {
  has_conflict: boolean;
  jira_status: string;
  open_thread_count: number;
  pull_requests: unknown;
  rejection_reason: RejectionReason | null;
  review_state: string;
  workflow_column: ExternalWorkflowColumn;
}

function toPrevious(row: ObservationRow): PreviousObservation {
  return {
    hasConflict: row.has_conflict,
    jiraStatus: row.jira_status,
    openThreadCount: row.open_thread_count,
    pullRequests: row.pull_requests,
    rejectionReason: row.rejection_reason,
    reviewState: row.review_state,
    workflowColumn: row.workflow_column,
  };
}

function getPRIdentity(pr: ActivityPullRequest): string {
  return `${pr.repository}#${pr.number}`;
}

function getLatestReviewByUser(
  pr: ActivityPullRequest,
  username: string,
) {
  return getReviewsByUser(pr, username)[0]
    ?? null;
}

function getReviewsByUser(
  pr: ActivityPullRequest,
  username: string,
) {
  return [...pr.latestOpinionatedReviews]
    .filter((review) =>
      review.authorLogin?.toLowerCase() === username.toLowerCase()
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

export class ActivityRepository {
  private readonly database: Database;
  private readonly githubUsername: string | null;

  public constructor(database: Database, githubUsername: string | null = null) {
    this.database = database;
    this.githubUsername = githubUsername?.trim() || null;
  }

  public async capture(inputs: ActivityObservationInput[]): Promise<void> {
    await this.database.transaction(async (client) => {
      for (const input of inputs) await this.captureTicket(client, input);
    });
  }

  private async captureTicket(
    client: PoolClient,
    input: ActivityObservationInput,
  ): Promise<void> {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      input.ticketKey,
    ]);
    const previousResult = await client.query<ObservationRow>(
      `SELECT jira_status, workflow_column, rejection_reason, has_conflict,
              review_state, open_thread_count, pull_requests
       FROM ticketdash.activity_observations
       WHERE ticket_key = $1
       ORDER BY observed_at DESC, id DESC
       LIMIT 1`,
      [input.ticketKey],
    );
    const previous = previousResult.rows[0]
      ? toPrevious(previousResult.rows[0])
      : null;
    const rejectionReason = getRejectionReason(
      previous,
      input.workflowColumn,
    );
    if (previous && isSameObservation(previous, input, rejectionReason)) return;

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO ticketdash.activity_observations
         (ticket_key, observed_at, jira_status, workflow_column,
          rejection_reason, has_conflict, review_state, open_thread_count,
          pull_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        input.ticketKey, input.observedAt, input.jiraStatus,
        input.workflowColumn, rejectionReason, input.hasConflict,
        input.reviewState, input.openThreadCount,
        JSON.stringify(input.pullRequests),
      ],
    );
    const observationId = inserted.rows[0]?.id;
    if (observationId === undefined) throw new Error("Observation insert failed.");

    if (previous) {
      for (const change of getActivityChanges(
        previous,
        input,
        rejectionReason,
      )) {
        await insertSystemEvent(
          client, input.ticketKey, change.type, change.previous,
          change.current, observationId, input.observedAt,
        );
      }
      await this.captureReviewEvents(client, previous, input, observationId);
    }
    if (!previous) {
      await this.captureReviewEvents(client, null, input, observationId);
    }
    await reconcileActivityPlan(
      client,
      input,
      previous,
      rejectionReason,
      observationId,
    );
  }

  private async captureReviewEvents(
    client: PoolClient,
    previous: PreviousObservation | null,
    input: ActivityObservationInput,
    observationId: number,
  ): Promise<void> {
    if (!this.githubUsername) return;

    const previousPullRequests = Array.isArray(previous?.pullRequests)
      ? previous.pullRequests as ActivityPullRequest[]
      : [];
    const previousByIdentity = new Map(
      previousPullRequests.map((pr) => [getPRIdentity(pr), pr]),
    );

    for (const pr of input.pullRequests) {
      const currentUserReviews = getReviewsByUser(pr, this.githubUsername);
      const currentReview = currentUserReviews[0] ?? null;
      if (!currentReview) continue;

      const previousPR = previousByIdentity.get(getPRIdentity(pr));
      const previousReview = previousPR
        ? getLatestReviewByUser(previousPR, this.githubUsername)
        : null;

      if (!previousReview) {
        const priorReviewOnSamePR = currentUserReviews[1] ?? null;
        await insertSystemEvent(
          client,
          input.ticketKey,
          priorReviewOnSamePR ? "re-review-submitted" : "review-submitted",
          priorReviewOnSamePR
            ? {
              prNumber: pr.number,
              repository: pr.repository,
              reviewState: priorReviewOnSamePR.state,
              submittedAt: priorReviewOnSamePR.submittedAt,
            }
            : null,
          {
            prNumber: pr.number,
            repository: pr.repository,
            reviewState: currentReview.state,
            submittedAt: currentReview.submittedAt,
          },
          observationId,
          currentReview.submittedAt,
        );
        continue;
      }

      if (currentReview.submittedAt > previousReview.submittedAt) {
        await insertSystemEvent(
          client,
          input.ticketKey,
          "re-review-submitted",
          {
            prNumber: pr.number,
            repository: pr.repository,
            reviewState: previousReview.state,
            submittedAt: previousReview.submittedAt,
          },
          {
            prNumber: pr.number,
            repository: pr.repository,
            reviewState: currentReview.state,
            submittedAt: currentReview.submittedAt,
          },
          observationId,
          currentReview.submittedAt,
        );
      }
    }
  }

}
