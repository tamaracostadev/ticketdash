import type { IsoTimestamp, LastSeenByTicket } from "../types/persistence";
import { parseLastSeen } from "../utils/lastSeenValidation";
import type { LastSeenRepository } from "./lastSeenRepository";

export interface LastSeenImporter {
  import(lastSeen: LastSeenByTicket): Promise<void>;
}

async function request(
  path: string,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(path, init);
  if (response.ok) return response;

  let message = "Last seen persistence unavailable.";
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message;
  } catch {
    // Keep the public fallback when the API does not return JSON.
  }
  throw new Error(message);
}

export class HttpLastSeenRepository
implements LastSeenRepository, LastSeenImporter {
  public constructor(private readonly fetcher: typeof fetch = fetch) {}

  public async clear(): Promise<void> {
    await request("/api/last-seen", { method: "DELETE" }, this.fetcher);
  }

  public async import(lastSeen: LastSeenByTicket): Promise<void> {
    await request("/api/last-seen/import", {
      body: JSON.stringify(lastSeen),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }, this.fetcher);
  }

  public async load(): Promise<LastSeenByTicket> {
    const response = await request("/api/last-seen", undefined, this.fetcher);
    const parsed = parseLastSeen(await response.json());
    if (parsed === null) {
      throw new Error("Last seen persistence returned invalid data.");
    }
    return parsed;
  }

  public async markSeen(
    ticketId: string,
    seenAt: IsoTimestamp,
  ): Promise<void> {
    await request(
      `/api/last-seen/${encodeURIComponent(ticketId.toUpperCase())}`,
      {
        body: JSON.stringify({ seenAt }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
      this.fetcher,
    );
  }
}
