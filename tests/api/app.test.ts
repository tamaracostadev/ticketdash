import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../api/app";
import type { Database } from "../../api/database";
import { EMPTY_PUBLIC_DASHBOARD_CONFIG } from "../../server/config";
import { GitHubProxyError } from "../../server/github";

function createDatabase(query = vi.fn().mockResolvedValue({ rows: [] })): Database {
  return {
    close: vi.fn(),
    query,
    transaction: vi.fn(),
  };
}

describe("local API", () => {
  it("separates API and database health", async () => {
    const app = buildApp({
      database: createDatabase(vi.fn().mockRejectedValue(new Error("secret"))),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
    const database = await app.inject("/api/health/db");
    expect(database.statusCode).toBe(503);
    expect(database.json()).toEqual({
      database: "unavailable",
      message: "Database unavailable.",
      status: "error",
    });
  });

  it("returns availability without exposing integration configuration", async () => {
    const app = buildApp({
      database: createDatabase(),
      integrations: {
        github: {
          authoredSearchLimit: 30,
          reviewRequestedSearchLimit: 30,
          searchScopes: [],
          token: "secret-token",
          username: "user",
        },
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const response = await app.inject("/api/integrations/status");
    expect(response.json()).toEqual({
      backgroundRefresh: null,
      config: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      github: true,
      jira: false,
    });
    expect(response.body).not.toContain("secret-token");
  });

  it("hides internal errors and sanitizes integration errors", async () => {
    const app = buildApp({
      database: createDatabase(),
      integrations: {
        github: {
          authoredSearchLimit: 30,
          reviewRequestedSearchLimit: 30,
          searchScopes: [],
          token: "secret-token",
          username: "user",
        },
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });
    app.get("/test/internal", async () => {
      throw new Error("SQL and secret-token");
    });
    app.get("/test/integration", async () => {
      throw new GitHubProxyError("Rejected secret-token", 401);
    });

    expect((await app.inject("/test/internal")).json()).toEqual({
      message: "Internal server error.",
    });
    expect((await app.inject("/test/integration")).json()).toEqual({
      message: "Rejected [redacted]",
    });
  });

  it("exposes background refresh status without leaking secrets", async () => {
    const app = buildApp({
      database: createDatabase(),
      getBackgroundRefreshStatus: () => ({
        enabled: true,
        intervalMs: 300000,
        isRunning: false,
        lastError: "ok",
        lastFinishedAt: "2026-07-08T12:00:00.000Z",
        lastStartedAt: "2026-07-08T11:59:00.000Z",
        lastSuccessAt: "2026-07-08T12:00:00.000Z",
      }),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    expect((await app.inject("/api/integrations/status")).json()).toEqual({
      backgroundRefresh: {
        enabled: true,
        intervalMs: 300000,
        isRunning: false,
        lastError: "ok",
        lastFinishedAt: "2026-07-08T12:00:00.000Z",
        lastStartedAt: "2026-07-08T11:59:00.000Z",
        lastSuccessAt: "2026-07-08T12:00:00.000Z",
      },
      config: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      github: false,
      jira: false,
    });
  });
});
