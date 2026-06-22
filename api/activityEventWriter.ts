import type { PoolClient } from "pg";

export async function insertSystemEvent(
  client: PoolClient,
  ticketKey: string,
  type: string,
  previous: unknown,
  current: unknown,
  observationId: number,
  occurredAt: string,
): Promise<void> {
  await client.query(
    `INSERT INTO ticketdash.activity_events
       (observation_id, ticket_key, event_type, origin, occurred_at,
        previous_value, current_value)
     VALUES ($1, $2, $3, 'system', $4, $5, $6)`,
    [
      observationId,
      ticketKey,
      type,
      occurredAt,
      JSON.stringify(previous),
      JSON.stringify(current),
    ],
  );
}
