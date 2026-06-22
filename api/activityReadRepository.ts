import type { QueryResultRow } from "pg";

import type { Database } from "./database.ts";
import type {
  ActivityEvent,
  ActivityStateByTicket,
  RejectionReason,
} from "../src/types/activity.ts";
import type { ExternalWorkflowColumn } from "../src/types/workflow.ts";

interface StateRow extends QueryResultRow {
  rejection_reason: RejectionReason | null;
  ticket_key: string;
  workflow_column: ExternalWorkflowColumn;
}

interface EventRow extends QueryResultRow {
  id: number;
  current_value: unknown;
  event_type: string;
  occurred_at: Date;
  origin: ActivityEvent["origin"];
  previous_value: unknown;
  ticket_key: string;
}

export class ActivityReadRepository {
  private readonly database: Database;

  public constructor(database: Database) {
    this.database = database;
  }

  public async listStates(): Promise<ActivityStateByTicket> {
    const result = await this.database.query<StateRow>(
      `SELECT DISTINCT ON (ticket_key)
         ticket_key, workflow_column, rejection_reason
       FROM ticketdash.activity_observations
       ORDER BY ticket_key, observed_at DESC, id DESC`,
    );
    return result.rows.reduce<ActivityStateByTicket>((states, row) => {
      states[row.ticket_key] = {
        rejectionReason: row.rejection_reason,
        ticketKey: row.ticket_key,
        workflowColumn: row.workflow_column,
      };
      return states;
    }, {});
  }

  public async timeline(ticketKey: string): Promise<ActivityEvent[]> {
    const result = await this.database.query<EventRow>(
      `SELECT id, ticket_key, event_type, origin, occurred_at,
              previous_value, current_value
       FROM ticketdash.activity_events
       WHERE ticket_key = $1
       ORDER BY occurred_at DESC, id DESC`,
      [ticketKey],
    );
    return result.rows.map((row) => ({
      currentValue: row.current_value,
      eventType: row.event_type,
      id: row.id,
      occurredAt: row.occurred_at.toISOString(),
      origin: row.origin,
      previousValue: row.previous_value,
      ticketKey: row.ticket_key,
    }));
  }
}
