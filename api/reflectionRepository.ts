import type { PoolClient, QueryResultRow } from "pg";

import type { Database } from "./database.ts";
import type {
  TicketReflection,
  TicketReflectionsByKey,
} from "../src/types/reflections.ts";

interface ReflectionRow extends QueryResultRow {
  blockers: string;
  difficulty: TicketReflection["difficulty"];
  learnings: string;
  notes: string;
  outcome: TicketReflection["outcome"];
  ticket_key: string;
}

const COLUMNS = `
  ticket_key, difficulty, outcome, blockers, learnings, notes
`;
const UPSERT = `
  INSERT INTO ticketdash.ticket_reflections (${COLUMNS})
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (ticket_key) DO UPDATE SET
    difficulty = EXCLUDED.difficulty,
    outcome = EXCLUDED.outcome,
    blockers = EXCLUDED.blockers,
    learnings = EXCLUDED.learnings,
    notes = EXCLUDED.notes,
    updated_at = now()
`;

function values(reflection: TicketReflection): unknown[] {
  return [
    reflection.ticketKey,
    reflection.difficulty,
    reflection.outcome,
    reflection.blockers,
    reflection.learnings,
    reflection.notes,
  ];
}

function toReflection(row: ReflectionRow): TicketReflection {
  return {
    blockers: row.blockers,
    difficulty: row.difficulty,
    learnings: row.learnings,
    notes: row.notes,
    outcome: row.outcome,
    ticketKey: row.ticket_key,
  };
}

function toPayload(reflection: TicketReflection): string {
  return JSON.stringify(reflection);
}

async function insertReflectionEvent(
  client: PoolClient,
  ticketKey: string,
  type: "reflection-created" | "reflection-updated" | "reflection-removed",
  previous: TicketReflection | null,
  current: TicketReflection | null,
): Promise<void> {
  await client.query(
    `INSERT INTO ticketdash.activity_events
       (ticket_key, event_type, origin, previous_value, current_value)
     VALUES ($1, $2, 'user', $3, $4)`,
    [
      ticketKey,
      type,
      previous === null ? "null" : toPayload(previous),
      current === null ? "null" : toPayload(current),
    ],
  );
}

export class ReflectionRepository {
  private readonly database: Database;

  public constructor(database: Database) {
    this.database = database;
  }

  public async list(): Promise<TicketReflectionsByKey> {
    const result = await this.database.query<ReflectionRow>(
      `SELECT ${COLUMNS}
       FROM ticketdash.ticket_reflections
       ORDER BY ticket_key`,
    );
    return result.rows.reduce<TicketReflectionsByKey>((reflections, row) => {
      const reflection = toReflection(row);
      reflections[reflection.ticketKey] = reflection;
      return reflections;
    }, {});
  }

  public async remove(ticketKey: string): Promise<void> {
    await this.database.transaction(async (client) => {
      const previous = await this.find(client, ticketKey);
      await client.query(
        "DELETE FROM ticketdash.ticket_reflections WHERE ticket_key = $1",
        [ticketKey],
      );
      if (previous) {
        await insertReflectionEvent(
          client,
          ticketKey,
          "reflection-removed",
          previous,
          null,
        );
      }
    });
  }

  public async save(reflection: TicketReflection): Promise<void> {
    await this.database.transaction(async (client) => {
      const previous = await this.find(client, reflection.ticketKey);
      await client.query(UPSERT, values(reflection));
      await insertReflectionEvent(
        client,
        reflection.ticketKey,
        previous ? "reflection-updated" : "reflection-created",
        previous,
        reflection,
      );
    });
  }

  private async find(
    client: PoolClient,
    ticketKey: string,
  ): Promise<TicketReflection | null> {
    const result = await client.query<ReflectionRow>(
      `SELECT ${COLUMNS}
       FROM ticketdash.ticket_reflections
       WHERE ticket_key = $1
       FOR UPDATE`,
      [ticketKey],
    );
    return result.rows[0] ? toReflection(result.rows[0]) : null;
  }
}
