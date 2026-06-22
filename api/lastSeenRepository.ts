import type { QueryResultRow } from "pg";

import type { Database } from "./database.ts";
import type { LastSeenByTicket } from "../src/types/persistence.ts";

interface LastSeenRow extends QueryResultRow {
  seen_at: Date;
  ticket_key: string;
}

const UPSERT = `
  INSERT INTO ticketdash.ticket_last_seen (ticket_key, seen_at)
  VALUES ($1, $2)
  ON CONFLICT (ticket_key) DO UPDATE SET
    seen_at = GREATEST(ticketdash.ticket_last_seen.seen_at, EXCLUDED.seen_at),
    updated_at = now()
`;

interface QueryExecutor {
  query(text: string, values?: unknown[]): Promise<unknown>;
}

async function save(
  client: QueryExecutor,
  ticketKey: string,
  seenAt: string,
): Promise<void> {
  await client.query(UPSERT, [ticketKey, seenAt]);
}

export class LastSeenDatabaseRepository {
  private readonly database: Database;

  public constructor(database: Database) {
    this.database = database;
  }

  public async clear(): Promise<void> {
    await this.database.query("DELETE FROM ticketdash.ticket_last_seen");
  }

  public async import(lastSeen: LastSeenByTicket): Promise<void> {
    await this.database.transaction(async (client) => {
      for (const [ticketKey, seenAt] of Object.entries(lastSeen)) {
        await save(client, ticketKey, seenAt);
      }
    });
  }

  public async list(): Promise<LastSeenByTicket> {
    const result = await this.database.query<LastSeenRow>(
      `SELECT ticket_key, seen_at
       FROM ticketdash.ticket_last_seen
       ORDER BY ticket_key`,
    );
    return result.rows.reduce<LastSeenByTicket>((lastSeen, row) => {
      lastSeen[row.ticket_key] = row.seen_at.toISOString();
      return lastSeen;
    }, {});
  }

  public async markSeen(ticketKey: string, seenAt: string): Promise<void> {
    await save(this.database, ticketKey, seenAt);
  }
}
