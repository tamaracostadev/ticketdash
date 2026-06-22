import type { IsoTimestamp, LastSeenByTicket } from "../types/persistence";
import type { LastSeenImporter } from "./httpLastSeenRepository";
import type { LastSeenRepository } from "./lastSeenRepository";

export class MigratingLastSeenRepository implements LastSeenRepository {
  public constructor(
    private readonly remote: LastSeenRepository & LastSeenImporter,
    private readonly local: LastSeenRepository,
  ) {}

  public clear(): Promise<void> {
    return this.remote.clear();
  }

  public async load(): Promise<LastSeenByTicket> {
    const localLastSeen = await this.local.load();
    if (Object.keys(localLastSeen).length > 0) {
      await this.remote.import(localLastSeen);
      await this.local.clear();
    }
    return this.remote.load();
  }

  public markSeen(ticketId: string, seenAt: IsoTimestamp): Promise<void> {
    return this.remote.markSeen(ticketId, seenAt);
  }
}
