import type { PoolClient, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  getActivityChanges,
  getRejectionReason,
  isSameObservation,
  type PreviousObservation,
} from "../../api/activityChanges";
import { ActivityRepository } from "../../api/activityRepository";
import { insertSystemEvent } from "../../api/activityEventWriter";
import type { Database } from "../../api/database";
import { recordPersonalPlanEvents } from "../../api/personalPlanEvents";
import type { ActivityObservationInput } from "../../src/types/activity";
import { createPlan } from "../fixtures/domain";

const input: ActivityObservationInput = {
  hasConflict: false,
  jiraStatus: "Dev",
  observedAt: "2026-06-18T12:00:00.000Z",
  openThreadCount: 0,
  pullRequests: [],
  reviewState: "no-pr",
  ticketKey: "APP-100",
  workflowColumn: "development",
};

function previous(
  workflowColumn: PreviousObservation["workflowColumn"],
): PreviousObservation {
  return {
    hasConflict: false,
    jiraStatus: workflowColumn === "development" ? "Dev" : "Other",
    openThreadCount: 0,
    pullRequests: [],
    rejectionReason: null,
    reviewState: "no-pr",
    workflowColumn,
  };
}

function result(rows: object[] = [], rowCount = rows.length): QueryResult {
  return { command: "", fields: [], oid: 0, rowCount, rows };
}

describe("activity transitions", () => {
  it("creates rejection reasons only from review and testing", () => {
    expect(getRejectionReason(null, "development")).toBeNull();
    expect(getRejectionReason(previous("code-review"), "development"))
      .toBe("rejected-by-review");
    expect(getRejectionReason(previous("testing"), "development"))
      .toBe("rejected-by-qa");
    expect(getRejectionReason(previous("release"), "development")).toBeNull();
  });

  it("preserves a rejection while the ticket remains in development", () => {
    const state = {
      ...previous("development"),
      rejectionReason: "rejected-by-qa" as const,
    };
    expect(getRejectionReason(state, "development")).toBe("rejected-by-qa");
  });

  it("does not treat an identical snapshot as a change", () => {
    expect(isSameObservation(previous("development"), input, null)).toBe(true);
    expect(getActivityChanges(previous("development"), input, null)).toEqual([]);
  });
});

describe("ActivityRepository", () => {
  it("records a review rejection and plans it in the same transaction", async () => {
    const query = vi.fn(async (sql: string, _parameters?: unknown[]) => {
      if (sql.includes("FROM ticketdash.activity_observations")) {
        return result([{
          has_conflict: false,
          jira_status: "Code Review",
          open_thread_count: 0,
          pull_requests: [],
          rejection_reason: null,
          review_state: "pending-review",
          workflow_column: "code-review",
        }]);
      }
      if (sql.includes("RETURNING id")) return result([{ id: 10 }]);
      return result();
    });
    const database: Database = {
      close: vi.fn(),
      query: vi.fn(),
      transaction: async (operation) => operation({
        query,
        release: vi.fn(),
      } as unknown as PoolClient),
    };

    await new ActivityRepository(database).capture([input]);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    const values = query.mock.calls.flatMap((call) => {
      const parameters = (call as unknown[])[1];
      return Array.isArray(parameters) ? parameters : [];
    });
    expect(values).toContain("rejected-by-review");
    expect(sql).toContain("INSERT INTO ticketdash.ticket_plans");
    expect(values).toContain("planned");
  });

  it("records a new merge conflict and plans it in the same transaction", async () => {
    const query = vi.fn(async (sql: string, _parameters?: unknown[]) => {
      if (sql.includes("FROM ticketdash.activity_observations")) {
        return result([{
          has_conflict: false,
          jira_status: "Code Review",
          open_thread_count: 0,
          pull_requests: [],
          rejection_reason: null,
          review_state: "pending-review",
          workflow_column: "code-review",
        }]);
      }
      if (sql.includes("RETURNING id")) return result([{ id: 10 }]);
      return result();
    });
    const database: Database = {
      close: vi.fn(),
      query: vi.fn(),
      transaction: async (operation) => operation({
        query,
        release: vi.fn(),
      } as unknown as PoolClient),
    };

    await new ActivityRepository(database).capture([{
      ...input,
      hasConflict: true,
      pullRequests: [],
      reviewState: "pending-review",
      workflowColumn: "code-review",
    }]);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    const values = query.mock.calls.flatMap((call) => {
      const parameters = (call as unknown[])[1];
      return Array.isArray(parameters) ? parameters : [];
    });
    expect(values).toContain("merge-conflict-changed");
    expect(sql).toContain("INSERT INTO ticketdash.ticket_plans");
    expect(values).toContain("planned");
  });

  it("automatically unplans a ticket that enters testing", async () => {
    const query = vi.fn(async (sql: string, _parameters?: unknown[]) => {
      if (sql.includes("FROM ticketdash.activity_observations")) {
        return result([{
          has_conflict: false,
          jira_status: "Dev",
          open_thread_count: 0,
          pull_requests: [],
          rejection_reason: null,
          review_state: "no-pr",
          workflow_column: "development",
        }]);
      }
      if (sql.includes("RETURNING id")) return result([{ id: 11 }]);
      if (sql.includes("UPDATE ticketdash.ticket_plans")) {
        return result([{ ticket_key: "APP-100" }], 1);
      }
      return result();
    });
    const database: Database = {
      close: vi.fn(),
      query: vi.fn(),
      transaction: async (operation) => operation({
        query,
        release: vi.fn(),
      } as unknown as PoolClient),
    };

    await new ActivityRepository(database).capture([{
      ...input,
      jiraStatus: "Test",
      workflowColumn: "testing",
    }]);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    const values = query.mock.calls.flatMap((call) => {
      const parameters = (call as unknown[])[1];
      return Array.isArray(parameters) ? parameters : [];
    });
    expect(sql).toContain("planned_period = NULL");
    expect(values).toContain("unplanned");
  });

  it("starts active development automatically for explicit in-progress Jira statuses", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM ticketdash.activity_observations")) {
        return result([{
          has_conflict: false,
          jira_status: "Dev",
          open_thread_count: 0,
          pull_requests: [],
          rejection_reason: null,
          review_state: "no-pr",
          workflow_column: "development",
        }]);
      }
      if (sql.includes("FROM ticketdash.ticket_plans")) {
        return result([]);
      }
      if (sql.includes("RETURNING id")) return result([{ id: 12 }]);
      return result();
    });
    const database: Database = {
      close: vi.fn(),
      query: vi.fn(),
      transaction: async (operation) => operation({
        query,
        release: vi.fn(),
      } as unknown as PoolClient),
    };

    await new ActivityRepository(database).capture([{
      ...input,
      jiraStatus: "Dev In Progress",
    }]);

    const sql = query.mock.calls.map(([statement]) => statement).join("\n");
    const values = query.mock.calls.flatMap((call) => {
      const parameters = (call as unknown[])[1];
      return Array.isArray(parameters) ? parameters : [];
    });
    expect(sql).toContain("active_development_source = 'jira'");
    expect(values).toContain("active-development-started");
  });

  it("records review and re-review events from captured pull requests", async () => {
    const firstReviewAt = "2026-06-19T14:00:00.000Z";
    const secondReviewAt = "2026-06-19T16:00:00.000Z";
    const query = vi.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes("FROM ticketdash.activity_observations")) {
        return result([{
          has_conflict: false,
          jira_status: "Code Review",
          open_thread_count: 0,
          pull_requests: [{
            latestCommitAt: "2026-06-19T15:00:00.000Z",
            latestOpinionatedReviews: [{
              authorLogin: "reviewer",
              state: "APPROVED",
              submittedAt: firstReviewAt,
            }],
            mergeable: "MERGEABLE",
            number: 11,
            openThreadCount: 0,
            repository: "org/repo",
            reviewStatus: "approved",
          }],
          rejection_reason: null,
          review_state: "approved",
          workflow_column: "code-review",
        }]);
      }
      if (sql.includes("FROM ticketdash.ticket_plans")) {
        return result([]);
      }
      if (sql.includes("RETURNING id")) return result([{ id: 13 }]);
      return result([], sql.includes("INSERT INTO ticketdash.activity_events")
        && Array.isArray(parameters)
        && parameters[2] === "re-review-submitted" ? 1 : 0);
    });
    const database: Database = {
      close: vi.fn(),
      query: vi.fn(),
      transaction: async (operation) => operation({
        query,
        release: vi.fn(),
      } as unknown as PoolClient),
    };

    await new ActivityRepository(database, "reviewer").capture([{
      ...input,
      jiraStatus: "Code Review",
      pullRequests: [{
        latestCommitAt: "2026-06-19T15:00:00.000Z",
        latestOpinionatedReviews: [{
          authorLogin: "reviewer",
          state: "CHANGES_REQUESTED",
          submittedAt: secondReviewAt,
        }],
        mergeable: "MERGEABLE",
        number: 11,
        openThreadCount: 0,
        repository: "org/repo",
        reviewStatus: "changes-requested",
      }],
      reviewState: "changes-requested",
      workflowColumn: "code-review",
    }]);

    const eventTypes = query.mock.calls
      .filter(([sql]) => String(sql).includes("INSERT INTO ticketdash.activity_events"))
      .map(([, values]) => (values as unknown[])[2]);

    expect(eventTypes).toContain("re-review-submitted");
  });
});

describe("personal activity events", () => {
  it("records planning, hiding and changes-addressed transitions", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = { query } as unknown as PoolClient;
    const previousPlan = createPlan("APP-100");
    const currentPlan = createPlan("APP-100", {
      isHidden: true,
      isPlanned: true,
      resolvedChangesRequestedAt: input.observedAt,
    });

    await recordPersonalPlanEvents(client, previousPlan, currentPlan);

    expect(query.mock.calls.map(([, values]) => values?.[1])).toEqual([
      "planned",
      "hidden",
      "changes-addressed",
    ]);
  });

  it("records inverse transitions when a plan is reset", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = { query } as unknown as PoolClient;
    await recordPersonalPlanEvents(
      client,
      createPlan("APP-100", {
        isHidden: true,
        isPlanned: true,
        resolvedChangesRequestedAt: input.observedAt,
      }),
      null,
    );

    expect(query.mock.calls.map(([, values]) => values?.[1])).toEqual([
      "unplanned",
      "restored",
      "changes-addressed-reopened",
    ]);
  });

  it("records active development start and stop transitions", async () => {
    const query = vi.fn().mockResolvedValue(result());
    const client = { query } as unknown as PoolClient;

    await recordPersonalPlanEvents(
      client,
      createPlan("APP-100"),
      createPlan("APP-100", {
        activeDevelopmentSource: "manual",
        activeDevelopmentStartedAt: input.observedAt,
        isActiveDevelopment: true,
      }),
    );
    await recordPersonalPlanEvents(
      client,
      createPlan("APP-100", {
        activeDevelopmentSource: "manual",
        activeDevelopmentStartedAt: input.observedAt,
        isActiveDevelopment: true,
      }),
      createPlan("APP-100"),
    );

    expect(query.mock.calls.map(([, values]) => values?.[1])).toEqual([
      "active-development-started",
      "active-development-stopped",
    ]);
  });
});

describe("activity event serialization", () => {
  it("serializes textual values for jsonb columns", async () => {
    const query = vi.fn().mockResolvedValue(result());
    await insertSystemEvent(
      { query } as unknown as PoolClient,
      "APP-100",
      "jira-status-changed",
      "Code Review",
      "Dev",
      1,
      input.observedAt,
    );

    expect(query.mock.calls[0]?.[1]?.slice(4)).toEqual([
      "\"Code Review\"",
      "\"Dev\"",
    ]);
  });
});
