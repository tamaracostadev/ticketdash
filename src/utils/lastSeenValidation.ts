import type { LastSeenByTicket } from "../types/persistence";
import { normalizeIsoTimestamp } from "./dates.ts";
import { normalizeTicketKey } from "./ticketKeys.ts";

export function parseLastSeen(value: unknown): LastSeenByTicket | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const normalized: LastSeenByTicket = {};
  for (const [rawKey, rawTimestamp] of Object.entries(value)) {
    const ticketKey = normalizeTicketKey(rawKey);
    const timestamp = normalizeIsoTimestamp(rawTimestamp);
    if (ticketKey === null || timestamp === null || ticketKey in normalized) {
      return null;
    }
    normalized[ticketKey] = timestamp;
  }

  return normalized;
}
