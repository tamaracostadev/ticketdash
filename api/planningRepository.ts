import type { PoolClient, QueryResultRow } from "pg";

import type { Database } from "./database.ts";
import { recordPersonalPlanEvents } from "./personalPlanEvents.ts";
import { PublicRequestError } from "./publicRequestError.ts";
import type { TicketPlan, TicketPlansByKey } from "../src/types/planning.ts";

interface TicketPlanRow extends QueryResultRow {
  active_development_source: TicketPlan["activeDevelopmentSource"];
  active_development_started_at: Date | null;
  blocked_reason: TicketPlan["blockedReason"];
  deferred_reason: TicketPlan["deferredReason"];
  deferred_until: Date | null;
  duplicate_of_ticket_key: string | null;
  hidden_reason: TicketPlan["hiddenReason"];
  is_blocked: boolean;
  is_hidden: boolean;
  is_planned: boolean;
  manual_order: number | null;
  manual_priority: TicketPlan["manualPriority"];
  notes: string;
  planned_period: TicketPlan["plannedPeriod"];
  resolved_changes_requested_at: Date | null;
  ticket_key: string;
}

const COLUMNS = `
  ticket_key, is_active_development, active_development_started_at,
  active_development_source, is_planned, planned_period, manual_order, manual_priority,
  is_hidden, hidden_reason, duplicate_of_ticket_key, deferred_until, deferred_reason, is_blocked,
  blocked_reason, notes, resolved_changes_requested_at
`;
const UPSERT = `
  INSERT INTO ticketdash.ticket_plans (${COLUMNS})
  VALUES (${Array.from({ length: 17 }, (_, index) => `$${index + 1}`).join(", ")})
  ON CONFLICT (ticket_key) DO UPDATE SET
    is_active_development = EXCLUDED.is_active_development,
    active_development_started_at = EXCLUDED.active_development_started_at,
    active_development_source = EXCLUDED.active_development_source,
    is_planned = EXCLUDED.is_planned,
    planned_period = EXCLUDED.planned_period,
    manual_order = EXCLUDED.manual_order,
    manual_priority = EXCLUDED.manual_priority,
    is_hidden = EXCLUDED.is_hidden,
    hidden_reason = EXCLUDED.hidden_reason,
    duplicate_of_ticket_key = EXCLUDED.duplicate_of_ticket_key,
    deferred_until = EXCLUDED.deferred_until,
    deferred_reason = EXCLUDED.deferred_reason,
    is_blocked = EXCLUDED.is_blocked,
    blocked_reason = EXCLUDED.blocked_reason,
    notes = EXCLUDED.notes,
    resolved_changes_requested_at = EXCLUDED.resolved_changes_requested_at,
    updated_at = now()
`;

function values(plan: TicketPlan): unknown[] {
  return [
    plan.ticketKey,
    plan.isActiveDevelopment,
    plan.activeDevelopmentStartedAt,
    plan.activeDevelopmentSource,
    plan.isPlanned,
    plan.plannedPeriod,
    plan.manualOrder,
    plan.manualPriority,
    plan.isHidden,
    plan.hiddenReason,
    plan.duplicateOfTicketKey,
    plan.deferredUntil,
    plan.deferredReason,
    plan.isBlocked,
    plan.blockedReason,
    plan.notes,
    plan.resolvedChangesRequestedAt,
  ];
}

function toPlan(row: TicketPlanRow): TicketPlan {
  return {
    activeDevelopmentSource: row.active_development_source ?? null,
    activeDevelopmentStartedAt:
      row.active_development_started_at?.toISOString() ?? null,
    blockedReason: row.blocked_reason,
    deferredReason: row.deferred_reason,
    deferredUntil: row.deferred_until?.toISOString() ?? null,
    duplicateOfTicketKey: row.duplicate_of_ticket_key,
    hiddenReason: row.hidden_reason,
    isActiveDevelopment: row.is_active_development ?? false,
    isBlocked: row.is_blocked,
    isHidden: row.is_hidden,
    isPlanned: row.is_planned,
    manualOrder: row.manual_order,
    manualPriority: row.manual_priority,
    notes: row.notes,
    plannedPeriod: row.planned_period,
    resolvedChangesRequestedAt:
      row.resolved_changes_requested_at?.toISOString() ?? null,
    ticketKey: row.ticket_key,
  };
}

export class PlanningRepository {
  private readonly database: Database;

  public constructor(database: Database) {
    this.database = database;
  }

  public async clear(): Promise<void> {
    await this.database.query("DELETE FROM ticketdash.ticket_plans");
  }

  public async import(plans: TicketPlan[]): Promise<void> {
    await this.database.transaction(async (client) => {
      for (const plan of plans) await client.query(UPSERT, values(plan));
    });
  }

  public async list(): Promise<TicketPlansByKey> {
    const result = await this.database.query<TicketPlanRow>(
      `SELECT ${COLUMNS} FROM ticketdash.ticket_plans ORDER BY ticket_key`,
    );
    return result.rows.reduce<TicketPlansByKey>((plans, row) => {
      const plan = toPlan(row);
      plans[plan.ticketKey] = plan;
      return plans;
    }, {});
  }

  public async remove(ticketKey: string): Promise<void> {
    await this.database.transaction(async (client) => {
      const previous = await this.find(client, ticketKey);
      await client.query(
        "DELETE FROM ticketdash.ticket_plans WHERE ticket_key = $1",
        [ticketKey],
      );
      await recordPersonalPlanEvents(client, previous, null);
    });
  }

  public async reorder(ticketKeys: string[]): Promise<void> {
    await this.database.transaction(async (client) => {
      for (const [index, ticketKey] of ticketKeys.entries()) {
        await client.query(
          `UPDATE ticketdash.ticket_plans
           SET manual_order = $2, updated_at = now()
           WHERE ticket_key = $1`,
          [ticketKey, index + 1],
        );
      }
    });
  }

  public async save(plan: TicketPlan): Promise<void> {
    await this.database.transaction(async (client) => {
      if (plan.isPlanned) {
        const state = await client.query<{ workflow_column: string }>(
          `SELECT workflow_column
           FROM ticketdash.activity_observations
           WHERE ticket_key = $1
           ORDER BY observed_at DESC, id DESC
           LIMIT 1`,
          [plan.ticketKey],
        );
        const column = state.rows[0]?.workflow_column;
        if (
          column !== undefined &&
          column !== "backlog" &&
          column !== "development"
        ) {
          throw new PublicRequestError(
            "Only backlog or development tickets can be planned.",
          );
        }
      }
      if (plan.duplicateOfTicketKey === plan.ticketKey) {
        throw new PublicRequestError(
          "A duplicate ticket cannot link to itself.",
        );
      }
      if (
        plan.isHidden &&
        plan.hiddenReason === "duplicate" &&
        plan.duplicateOfTicketKey === null
      ) {
        throw new PublicRequestError(
          "Duplicate hidden tickets must reference a primary ticket.",
        );
      }
      const previous = await this.find(client, plan.ticketKey);
      await client.query(UPSERT, values(plan));
      await recordPersonalPlanEvents(client, previous, plan);
    });
  }

  private async find(
    client: PoolClient,
    ticketKey: string,
  ): Promise<TicketPlan | null> {
    const result = await client.query<TicketPlanRow>(
      `SELECT ${COLUMNS}
       FROM ticketdash.ticket_plans
       WHERE ticket_key = $1
       FOR UPDATE`,
      [ticketKey],
    );
    return result.rows[0] ? toPlan(result.rows[0]) : null;
  }
}
