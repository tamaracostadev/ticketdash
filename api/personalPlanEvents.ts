import type { PoolClient } from "pg";

import type { TicketPlan } from "../src/types/planning.ts";

interface PersonalChange {
  current: unknown;
  previous: unknown;
  type: string;
}

function getChanges(
  previous: TicketPlan | null,
  current: TicketPlan | null,
): PersonalChange[] {
  const changes: PersonalChange[] = [];
  const add = (type: string, oldValue: unknown, newValue: unknown) => {
    if (oldValue !== newValue) {
      changes.push({ current: newValue, previous: oldValue, type });
    }
  };
  const oldPlanned = previous?.isPlanned ?? false;
  const newPlanned = current?.isPlanned ?? false;
  const oldHidden = previous?.isHidden ?? false;
  const newHidden = current?.isHidden ?? false;
  const oldActive = previous?.isActiveDevelopment ?? false;
  const newActive = current?.isActiveDevelopment ?? false;
  const oldAddressed = previous?.resolvedChangesRequestedAt ?? null;
  const newAddressed = current?.resolvedChangesRequestedAt ?? null;

  if (!oldPlanned && newPlanned) add("planned", false, true);
  if (oldPlanned && !newPlanned) add("unplanned", true, false);
  if (!oldHidden && newHidden) add("hidden", false, true);
  if (oldHidden && !newHidden) add("restored", true, false);
  if (!oldActive && newActive) {
    add(
      "active-development-started",
      null,
      current?.activeDevelopmentStartedAt ?? null,
    );
  }
  if (oldActive && !newActive) {
    add(
      "active-development-stopped",
      previous?.activeDevelopmentStartedAt ?? null,
      null,
    );
  }
  if (oldAddressed === null && newAddressed !== null) {
    add("changes-addressed", null, newAddressed);
  }
  if (oldAddressed !== null && newAddressed === null) {
    add("changes-addressed-reopened", oldAddressed, null);
  }
  return changes;
}

export async function recordPersonalPlanEvents(
  client: PoolClient,
  previous: TicketPlan | null,
  current: TicketPlan | null,
): Promise<void> {
  const ticketKey = current?.ticketKey ?? previous?.ticketKey;
  if (!ticketKey) return;
  for (const change of getChanges(previous, current)) {
    await client.query(
      `INSERT INTO ticketdash.activity_events
         (ticket_key, event_type, origin, previous_value, current_value)
       VALUES ($1, $2, 'user', $3, $4)`,
      [
        ticketKey,
        change.type,
        JSON.stringify(change.previous),
        JSON.stringify(change.current),
      ],
    );
  }
}
