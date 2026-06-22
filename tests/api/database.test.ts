import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "../../api/database";
import { runTransaction } from "../../api/database";
import { runMigrations } from "../../api/migrations";

function result(rows: object[] = []): QueryResult {
  return { command: "", fields: [], oid: 0, rowCount: rows.length, rows };
}

function createClient(query: PoolClient["query"]): PoolClient {
  return {
    query,
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe("database transactions", () => {
  it("commits successful work and releases the connection", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = createClient(query);

    await expect(runTransaction(client, async () => "done")).resolves.toBe("done");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back failed work and releases the connection", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = createClient(query);

    await expect(runTransaction(client, async () => {
      throw new Error("failed");
    })).rejects.toThrow("failed");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });
});

describe("migration runner", () => {
  it("applies a new migration and records its checksum", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = createClient(query);
    const database: Database = {
      close: vi.fn(),
      query: vi.fn().mockResolvedValue(result()),
      transaction: async (operation) => operation(client),
    };

    await runMigrations(database, [{
      checksum: "checksum",
      name: "001_create_schema.sql",
      sql: "CREATE SCHEMA ticketdash",
    }]);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "SELECT checksum FROM public.schema_migrations WHERE name = $1",
      "CREATE SCHEMA ticketdash",
      "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
    ]);
  });

  it("rejects a changed migration", async () => {
    const client = createClient(vi.fn().mockResolvedValue(result([
      { checksum: "old" },
    ])));
    const database: Database = {
      close: vi.fn(),
      query: vi.fn().mockResolvedValue(result()),
      transaction: async (operation) => operation(client),
    };

    await expect(runMigrations(database, [{
      checksum: "new",
      name: "001_create_schema.sql",
      sql: "changed",
    }])).rejects.toThrow("checksum mismatch");
  });
});
