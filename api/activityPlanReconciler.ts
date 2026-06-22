import type { PoolClient } from "pg";

import { insertSystemEvent } from "./activityEventWriter.ts";
import type { PreviousObservation } from "./activityChanges.ts";
import type {
  ActivityObservationInput,
  RejectionReason,
} from "../src/types/activity.ts";

export async function reconcileActivityPlan(
  client: PoolClient,
  input: ActivityObservationInput,
  previous: PreviousObservation | null,
  rejectionReason: RejectionReason | null,
  observationId: number,
): Promise<void> {
  const isExplicitInProgress = /\bin progress\b/i.test(input.jiraStatus);
  const planState = await client.query<{
    active_development_source: "jira" | "manual" | null;
    active_development_started_at: string | null;
    is_active_development: boolean;
  }>(
    `SELECT is_active_development, active_development_started_at,
            active_development_source
     FROM ticketdash.ticket_plans
     WHERE ticket_key = $1`,
    [input.ticketKey],
  );
  const previousActive = planState.rows[0]?.is_active_development ?? false;
  const previousActiveStartedAt =
    planState.rows[0]?.active_development_started_at ?? null;
  const previousActiveSource =
    planState.rows[0]?.active_development_source ?? null;
  const isNewRejection =
    rejectionReason !== null &&
    rejectionReason !== previous?.rejectionReason;
  const isNewConflict = input.hasConflict && !previous?.hasConflict;

  const clearActiveDevelopment = async (
    onlyJira = false,
  ): Promise<boolean> => {
    const result = await client.query(
      `UPDATE ticketdash.ticket_plans
       SET is_active_development = false,
           active_development_started_at = NULL,
           active_development_source = NULL,
           updated_at = now()
       WHERE ticket_key = $1 AND is_active_development = true
         ${onlyJira ? "AND active_development_source = 'jira'" : ""}`,
      [input.ticketKey],
    );
    return (result.rowCount ?? 0) > 0;
  };

  const markPlanned = async (): Promise<void> => {
    await client.query(
      `INSERT INTO ticketdash.ticket_plans
         (ticket_key, is_planned, planned_period, manual_order,
          manual_priority, is_hidden, hidden_reason, deferred_until,
          deferred_reason, is_blocked, blocked_reason, notes,
          resolved_changes_requested_at)
       VALUES ($1, true, NULL, NULL, NULL, false, NULL, NULL, NULL, false,
               NULL, '', NULL)
       ON CONFLICT (ticket_key) DO UPDATE SET
         is_planned = true, planned_period = NULL, manual_order = NULL,
         updated_at = now()`,
      [input.ticketKey],
    );
    await insertSystemEvent(
      client, input.ticketKey, "planned", false, true,
      observationId, input.observedAt,
    );
  };

  const canPlan = ["backlog", "development"].includes(input.workflowColumn);
  if (!canPlan) {
    if (await clearActiveDevelopment()) {
      await insertSystemEvent(
        client,
        input.ticketKey,
        "active-development-stopped",
        previousActiveStartedAt,
        null,
        observationId,
        input.observedAt,
      );
    }
    if (isNewConflict) {
      await markPlanned();
      return;
    }
    const result = await client.query<{ ticket_key: string }>(
      `UPDATE ticketdash.ticket_plans
       SET is_planned = false, planned_period = NULL, manual_order = NULL,
           updated_at = now()
       WHERE ticket_key = $1 AND is_planned = true
       RETURNING ticket_key`,
      [input.ticketKey],
    );
    if (result.rowCount) {
      await insertSystemEvent(
        client, input.ticketKey, "unplanned", true, false,
        observationId, input.observedAt,
      );
    }
    return;
  }

  if (input.workflowColumn !== "development") {
    if (await clearActiveDevelopment()) {
      await insertSystemEvent(
        client,
        input.ticketKey,
        "active-development-stopped",
        previousActiveStartedAt,
        null,
        observationId,
        input.observedAt,
      );
    }
  } else if (isExplicitInProgress) {
    await client.query(
      `INSERT INTO ticketdash.ticket_plans
         (ticket_key, is_active_development, active_development_started_at,
          active_development_source, is_planned, planned_period, manual_order,
          manual_priority, is_hidden, hidden_reason, deferred_until,
          deferred_reason, is_blocked, blocked_reason, notes,
          resolved_changes_requested_at)
       VALUES ($1, true, $2, 'jira', false, NULL, NULL, NULL, false, NULL,
               NULL, NULL, false, NULL, '', NULL)
       ON CONFLICT (ticket_key) DO UPDATE SET
         is_active_development = true,
         active_development_started_at =
           CASE
             WHEN ticketdash.ticket_plans.is_active_development = true
               THEN ticketdash.ticket_plans.active_development_started_at
             ELSE EXCLUDED.active_development_started_at
           END,
         active_development_source = 'jira',
         updated_at = now()`,
      [input.ticketKey, input.observedAt],
    );
    if (!previousActive) {
      await insertSystemEvent(
        client,
        input.ticketKey,
        "active-development-started",
        null,
        input.observedAt,
        observationId,
        input.observedAt,
      );
    }
  } else {
    if (previousActiveSource === "jira" && await clearActiveDevelopment(true)) {
      await insertSystemEvent(
        client,
        input.ticketKey,
        "active-development-stopped",
        previousActiveStartedAt,
        null,
        observationId,
        input.observedAt,
      );
    }
  }
  if (!isNewRejection && !isNewConflict) return;
  await markPlanned();
}
