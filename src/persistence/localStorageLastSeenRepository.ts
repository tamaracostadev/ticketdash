import type { IsoTimestamp, LastSeenByTicket } from "../types/persistence";
import { parseLastSeen } from "../utils/lastSeenValidation";
import type { LastSeenRepository } from "./lastSeenRepository";
import {
  LEGACY_STORAGE_KEYS,
  migrateStorageKey,
  STORAGE_KEYS,
} from "./storageKeys";

export class LocalStorageLastSeenRepository implements LastSeenRepository {
  public constructor(private readonly storage: Storage = globalThis.localStorage) {}

  public async clear(): Promise<void> {
    this.storage.removeItem(STORAGE_KEYS.lastSeen);
  }

  public async load(): Promise<LastSeenByTicket> {
    migrateStorageKey(
      this.storage,
      LEGACY_STORAGE_KEYS.lastSeen,
      STORAGE_KEYS.lastSeen,
    );
    const storedLastSeen = this.storage.getItem(STORAGE_KEYS.lastSeen);

    if (storedLastSeen === null) {
      return {};
    }

    try {
      const parsedLastSeen: unknown = JSON.parse(storedLastSeen);
      return parseLastSeen(parsedLastSeen) ?? {};
    } catch {
      return {};
    }
  }

  public async markSeen(
    ticketId: string,
    seenAt: IsoTimestamp,
  ): Promise<void> {
    const lastSeen = await this.load();
    const normalizedId = ticketId.toUpperCase();
    this.storage.setItem(
      STORAGE_KEYS.lastSeen,
      JSON.stringify({ ...lastSeen, [normalizedId]: seenAt }),
    );
  }
}
