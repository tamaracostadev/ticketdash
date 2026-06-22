import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../api/app";
import type { Database } from "../../api/database";
import { PlanningRepository } from "../../api/planningRepository";
import { EMPTY_PUBLIC_DASHBOARD_CONFIG } from "../../server/config";
import { createPlan } from "../fixtures/domain";

function result(rows: object[] = []): QueryResult {
  return { command: "", fields: [], oid: 0, rowCount: rows.length, rows };
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

describe("planning API", () => {
  it("validates plans before writing and normalizes route keys", async () => {
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
      url: "/api/planning/ticket-plans/APP-100",
    });
    expect(invalid.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();

    const valid = await app.inject({
      method: "PUT",
      payload: createPlan("app-100", { notes: "private note" }),
      url: "/api/planning/ticket-plans/app-100",
    });
    expect(valid.statusCode).toBe(204);
    expect(query.mock.calls.some(([, values]) =>
      Array.isArray(values) && values.includes("private note")
    )).toBe(true);
  });

  it("rejects partially invalid imports before opening a transaction", async () => {
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
      payload: { "APP-100": createPlan(), "APP-200": { invalid: true } },
      url: "/api/planning/ticket-plans/import",
    });

    expect(response.statusCode).toBe(400);
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rejects manual planning outside backlog and development", async () => {
    const query = vi.fn(async (sql: string) =>
      sql.includes("FROM ticketdash.activity_observations")
        ? result([{ workflow_column: "code-review" }])
        : result()
    );
    const app = buildApp({
      database: createDatabase(query),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });
    const response = await app.inject({
      method: "PUT",
      payload: createPlan("APP-100", { isPlanned: true }),
      url: "/api/planning/ticket-plans/APP-100",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Only backlog or development tickets can be planned.",
    });
  });

  it("rejects duplicate links without a primary ticket or with self-reference", async () => {
    const app = buildApp({
      database: createDatabase(),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const missingPrimary = await app.inject({
      method: "PUT",
      payload: createPlan("APP-100", {
        hiddenReason: "duplicate",
        isHidden: true,
      }),
      url: "/api/planning/ticket-plans/APP-100",
    });
    expect(missingPrimary.statusCode).toBe(400);
    expect(missingPrimary.json()).toEqual({
      message: "Duplicate hidden tickets must reference a primary ticket.",
    });

    const selfReference = await app.inject({
      method: "PUT",
      payload: createPlan("APP-100", {
        duplicateOfTicketKey: "APP-100",
        hiddenReason: "duplicate",
        isHidden: true,
      }),
      url: "/api/planning/ticket-plans/APP-100",
    });
    expect(selfReference.statusCode).toBe(400);
    expect(selfReference.json()).toEqual({
      message: "A duplicate ticket cannot link to itself.",
    });
  });

  it("accepts valid manual reorder payloads and rejects invalid ones", async () => {
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
      method: "POST",
      payload: { ticketKeys: ["APP-100", "app-100"] },
      url: "/api/planning/ticket-plans/reorder",
    });
    expect(invalid.statusCode).toBe(400);

    const valid = await app.inject({
      method: "POST",
      payload: { ticketKeys: ["APP-200", "APP-100"] },
      url: "/api/planning/ticket-plans/reorder",
    });
    expect(valid.statusCode).toBe(204);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE ticketdash.ticket_plans"),
      ["APP-200", 1],
    );
  });
});

describe("PlanningRepository", () => {
  it("imports all plans in one transaction", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = { query } as unknown as PoolClient;
    const database = createDatabase();
    database.transaction = async (operation) => operation(client);

    await new PlanningRepository(database).import([
      createPlan("APP-100"),
      createPlan("OPS-200"),
    ]);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[1]?.[0]).toBe("APP-100");
    expect(query.mock.calls[1]?.[1]?.[0]).toBe("OPS-200");
  });

  it("maps database timestamps to the browser contract", async () => {
    const updated = new Date("2026-06-15T10:00:00.000Z");
    const query = vi.fn().mockResolvedValue(result([{
      blocked_reason: null,
      deferred_reason: null,
      deferred_until: updated,
      duplicate_of_ticket_key: null,
      hidden_reason: null,
      is_blocked: false,
      is_active_development: false,
      is_hidden: false,
      is_planned: true,
      manual_order: null,
      manual_priority: null,
      notes: "",
      planned_period: "today",
      resolved_changes_requested_at: updated,
      ticket_key: "APP-100",
    }]));

    const plans = await new PlanningRepository(createDatabase(query)).list();
    expect(plans["APP-100"]?.isActiveDevelopment).toBe(false);
    expect(plans["APP-100"]?.deferredUntil).toBe(updated.toISOString());
    expect(plans["APP-100"]?.resolvedChangesRequestedAt).toBe(updated.toISOString());
  });
});
