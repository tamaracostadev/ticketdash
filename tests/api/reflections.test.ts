import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../api/app";
import type { Database } from "../../api/database";
import { ReflectionRepository } from "../../api/reflectionRepository";
import { EMPTY_PUBLIC_DASHBOARD_CONFIG } from "../../server/config";
import type { TicketReflection } from "../../src/types/reflections";

const reflection: TicketReflection = {
  blockers: "Merge queue",
  difficulty: "high",
  learnings: "Split infra changes",
  notes: "Sensitive note",
  outcome: "partial",
  ticketKey: "APP-100",
};

function result(rows: object[] = [], rowCount = rows.length): QueryResult {
  return { command: "", fields: [], oid: 0, rowCount, rows };
}

function createDatabase(query = vi.fn().mockResolvedValue(result())): Database {
  return {
    close: vi.fn(),
    query,
    transaction: vi.fn(async (operation) => operation({
      query,
      release: vi.fn(),
    } as unknown as PoolClient)),
  };
}

describe("reflection API", () => {
  it("validates reflections before writing and normalizes route keys", async () => {
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
      payload: { ticketKey: "APP-100" },
      url: "/api/reflections/APP-100",
    });
    expect(invalid.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();

    const valid = await app.inject({
      method: "PUT",
      payload: { ...reflection, ticketKey: "app-100" },
      url: "/api/reflections/app-100",
    });
    expect(valid.statusCode).toBe(204);
    expect(query.mock.calls.some(([, values]) =>
      Array.isArray(values) && values.includes("Sensitive note")
    )).toBe(true);
  });

  it("removes a reflection by normalized key", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const app = buildApp({
      database: createDatabase(query),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/reflections/app-100",
    });

    expect(response.statusCode).toBe(204);
    expect(query.mock.calls.some(([sql]) =>
      typeof sql === "string" &&
      sql.includes("DELETE FROM ticketdash.ticket_reflections")
    )).toBe(true);
  });
});

describe("ReflectionRepository", () => {
  it("lists reflections in browser shape", async () => {
    const query = vi.fn().mockResolvedValue(result([{
      blockers: reflection.blockers,
      difficulty: reflection.difficulty,
      learnings: reflection.learnings,
      notes: reflection.notes,
      outcome: reflection.outcome,
      ticket_key: reflection.ticketKey,
    }]));

    expect(await new ReflectionRepository(createDatabase(query)).list()).toEqual({
      "APP-100": reflection,
    });
  });

  it("records reflection events when saving and removing", async () => {
    let reads = 0;
    const query = vi.fn(async (sql: string, _values?: unknown[]) => {
      if (sql.includes("FROM ticketdash.ticket_reflections")) {
        reads += 1;
        return reads === 1
          ? result([])
          : result([{
            blockers: reflection.blockers,
            difficulty: reflection.difficulty,
            learnings: reflection.learnings,
            notes: reflection.notes,
            outcome: reflection.outcome,
            ticket_key: reflection.ticketKey,
          }]);
      }
      return result();
    });
    const repository = new ReflectionRepository(createDatabase(query));

    await repository.save(reflection);
    await repository.remove(reflection.ticketKey);

    expect(query.mock.calls.flatMap(([, values]) =>
      Array.isArray(values) ? values : []
    )).toContain("reflection-created");
    expect(query.mock.calls.flatMap(([, values]) =>
      Array.isArray(values) ? values : []
    )).toContain("reflection-removed");
  });
});
