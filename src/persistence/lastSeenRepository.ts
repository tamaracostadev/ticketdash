import type { IsoTimestamp, LastSeenByTicket } from "../types/persistence";

export interface LastSeenRepository {
  clear(): Promise<void>;
  load(): Promise<LastSeenByTicket>;
  markSeen(ticketId: string, seenAt: IsoTimestamp): Promise<void>;
}
