import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../api/app";
import type { Database } from "../../api/database";
import { LastSeenDatabaseRepository } from "../../api/lastSeenRepository";
import { EMPTY_PUBLIC_DASHBOARD_CONFIG } from "../../server/config";

const SEEN_AT = "2026-06-18T12:00:00.000Z";

function result(rows: object[] = []): QueryResult {
  return { command: "", fields: [], oid: 0, rowCount: rows.length, rows };
}

function createDatabase(query = vi.fn().mockResolvedValue(result())): Database {
  return {
    close: vi.fn(),
    query,
    transaction: vi.fn(),
  };
}

describe("last seen API", () => {
  it("validates and normalizes marks before writing", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const app = buildApp({
      database: createDatabase(query),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const invalid = await app.inject({
      method: "PUT",
      payload: { seenAt: "not-a-date" },
      url: "/api/last-seen/APP-100",
    });
    expect(invalid.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();

    const valid = await app.inject({
      method: "PUT",
      payload: { seenAt: "2026-06-18T09:00:00-03:00" },
      url: "/api/last-seen/app-100",
    });
    expect(valid.statusCode).toBe(204);
    expect(query.mock.calls[0]?.[1]).toEqual(["APP-100", SEEN_AT]);
  });

  it("rejects a partially invalid import before opening a transaction", async () => {
    const database = createDatabase();
    const app = buildApp({
      database,
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });
    const response = await app.inject({
      method: "POST",
      payload: { "APP-100": SEEN_AT, "APP-200": "invalid" },
      url: "/api/last-seen/import",
    });

    expect(response.statusCode).toBe(400);
    expect(database.transaction).not.toHaveBeenCalled();
  });
});

describe("LastSeenDatabaseRepository", () => {
  it("imports all values in one transaction using a non-regressing upsert", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = { query } as unknown as PoolClient;
    const database = createDatabase();
    database.transaction = async (operation) => operation(client);

    await new LastSeenDatabaseRepository(database).import({
      "APP-100": SEEN_AT,
      "OPS-200": "2026-06-18T13:00:00.000Z",
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain("GREATEST");
    expect(query.mock.calls[0]?.[1]).toEqual(["APP-100", SEEN_AT]);
  });

  it("maps database timestamps to canonical browser values", async () => {
    const seenAt = new Date(SEEN_AT);
    const query = vi.fn().mockResolvedValue(result([{
      seen_at: seenAt,
      ticket_key: "APP-100",
    }]));

    const lastSeen = await new LastSeenDatabaseRepository(
      createDatabase(query),
    ).list();
    expect(lastSeen).toEqual({ "APP-100": SEEN_AT });
  });
});
