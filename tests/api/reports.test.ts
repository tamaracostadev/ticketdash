import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../api/app";
import type { Database } from "../../api/database";
import {
  DEFAULT_REPORT_TIMEZONE,
  ReportRepository,
} from "../../api/reportRepository.ts";
import { EMPTY_PUBLIC_DASHBOARD_CONFIG } from "../../server/config";

function result<T extends QueryResultRow>(
  rows: T[] = [],
  rowCount = rows.length,
): QueryResult<T> {
  return { command: "", fields: [], oid: 0, rowCount, rows };
}

function createDatabase(
  query = vi.fn().mockResolvedValue(result([])),
): Database {
  return {
    close: vi.fn(),
    query,
    transaction: vi.fn(),
  };
}

describe("report API", () => {
  it("validates the report query before reading data", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{
        end_at: new Date("2026-06-23T03:00:00.000Z"),
        start_at: new Date("2026-06-16T03:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([{
        first_observed_at: new Date("2026-06-01T12:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]));
    const app = buildApp({
      database: createDatabase(query),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const invalid = await app.inject({
      method: "GET",
      url: "/api/reports/summary?period=custom&referenceDate=2026-06-19&timezone=UTC",
    });
    expect(invalid.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();

    const valid = await app.inject({
      method: "GET",
      url: "/api/reports/summary?period=month&referenceDate=2026-06-19&includeNotes=true&timezone=America%2FSao_Paulo",
    });
    expect(valid.statusCode).toBe(200);
  });

  it("validates the daily log query before reading data", async () => {
    const query = vi.fn().mockResolvedValue(result([]));
    const app = buildApp({
      database: createDatabase(query),
      integrations: {
        github: null,
        jira: null,
        public: EMPTY_PUBLIC_DASHBOARD_CONFIG,
      },
    });

    const invalid = await app.inject({
      method: "GET",
      url: "/api/reports/daily-log?date=2026-06-19&timezone=Invalid%2FTimezone",
    });
    expect(invalid.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("ReportRepository", () => {
  it("builds a summary from persisted events, observations and reflections", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{
        end_at: new Date("2026-06-23T03:00:00.000Z"),
        start_at: new Date("2026-06-16T03:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([{
        first_observed_at: new Date("2026-06-01T12:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([
        { metric: "planned", ticket_keys: ["APP-1", "APP-2"] },
        { metric: "returned", ticket_keys: ["APP-3"] },
        { metric: "reviewsCompleted", ticket_keys: ["APP-9"] },
      ]))
      .mockResolvedValueOnce(result([{
        observed_seconds: "5400",
        ticket_keys: ["APP-1"],
        workflow_column: "development",
      }]))
      .mockResolvedValueOnce(result([{
        blockers: "",
        difficulty: "high",
        learnings: "Split changes",
        notes: "Track review latency",
        outcome: "blocked",
        ticket_key: "APP-3",
        updated_at: new Date("2026-06-19T13:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([
        {
          current_value: true,
          event_type: "active-development-started",
          occurred_at: new Date("2026-06-17T14:00:00.000Z"),
          ticket_key: "APP-1",
        },
        {
          current_value: "code-review",
          event_type: "workflow-column-changed",
          occurred_at: new Date("2026-06-17T15:00:00.000Z"),
          ticket_key: "APP-1",
        },
      ]));

    const summary = await new ReportRepository(createDatabase(query))
      .fetchSummary("week", "2026-06-19", "America/Sao_Paulo", true);

    expect(String(query.mock.calls[2]?.[0])).toContain("WITH scoped_events AS");
    expect(String(query.mock.calls[2]?.[0])).toContain("workflow_column = 'code-review'");
    expect(String(query.mock.calls[2]?.[0])).toContain("jira_status = 'Code Review'");
    expect(String(query.mock.calls[2]?.[0])).toContain(
      "previous_value IN ('\"backlog\"'::jsonb, '\"development\"'::jsonb)",
    );
    expect(summary.timezone).toBe("America/Sao_Paulo");
    expect(summary.hasCompleteObservationCoverage).toBe(true);
    expect(summary.observationCoverageStartAt).toBe("2026-06-01T12:00:00.000Z");
    expect(summary.metrics.planned.count).toBe(2);
    expect(summary.metrics.returned.ticketKeys).toEqual(["APP-3"]);
    expect(summary.metrics.reviewsCompleted.ticketKeys).toEqual(["APP-9"]);
    expect(summary.metrics.completed.count).toBe(0);
    expect(summary.cycleTimes.developmentActiveToReview.current.count).toBe(1);
    expect(summary.stageDurations[0]).toEqual({
      observedSeconds: 5400,
      ticketKeys: ["APP-1"],
      workflowColumn: "development",
    });
    expect(summary.reflections[0]?.ticketKey).toBe("APP-3");
  });

  it("skips note loading when notes are not requested", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{
        end_at: new Date("2026-06-20T03:00:00.000Z"),
        start_at: new Date("2026-06-19T03:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([{
        first_observed_at: new Date("2026-06-01T12:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]));

    const summary = await new ReportRepository(createDatabase(query))
      .fetchSummary("day", "2026-06-19", DEFAULT_REPORT_TIMEZONE, false);

    expect(summary.reflections).toEqual([]);
    expect(query).toHaveBeenCalledTimes(5);
  });

  it("suppresses stage durations when observation coverage starts after the selected period", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{
        end_at: new Date("2026-06-23T03:00:00.000Z"),
        start_at: new Date("2026-06-16T03:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([{
        first_observed_at: new Date("2026-06-18T12:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([]));

    const summary = await new ReportRepository(createDatabase(query))
      .fetchSummary("week", "2026-06-19", "America/Sao_Paulo", false);

    expect(summary.hasCompleteObservationCoverage).toBe(false);
    expect(summary.stageDurations).toEqual([]);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("builds a daily work log and ignores noisy workflow corrections", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{
        end_at: new Date("2026-06-20T00:00:00.000Z"),
        start_at: new Date("2026-06-19T00:00:00.000Z"),
      }]))
      .mockResolvedValueOnce(result([{
        current_value: "backlog",
        event_type: "workflow-column-changed",
        id: 1,
        occurred_at: new Date("2026-06-19T13:00:00.000Z"),
        origin: "system",
        previous_value: "testing",
        ticket_key: "APP-1",
      }, {
        current_value: "development",
        event_type: "workflow-column-changed",
        id: 2,
        occurred_at: new Date("2026-06-19T13:03:00.000Z"),
        origin: "system",
        previous_value: "backlog",
        ticket_key: "APP-1",
      }, {
        current_value: "code-review",
        event_type: "workflow-column-changed",
        id: 3,
        jira_status: "Development",
        occurred_at: new Date("2026-06-19T13:05:00.000Z"),
        origin: "system",
        previous_value: "development",
        ticket_key: "APP-1",
        workflow_column: "code-review",
      }, {
        current_value: "testing",
        event_type: "workflow-column-changed",
        id: 4,
        jira_status: "Code Review",
        occurred_at: new Date("2026-06-19T13:08:00.000Z"),
        origin: "system",
        previous_value: "code-review",
        ticket_key: "APP-1",
        workflow_column: "testing",
      }, {
        current_value: false,
        event_type: "merge-conflict-changed",
        id: 5,
        jira_status: "Development",
        occurred_at: new Date("2026-06-19T15:00:00.000Z"),
        origin: "system",
        previous_value: true,
        ticket_key: "APP-2",
        workflow_column: "development",
      }, {
        current_value: {
          prNumber: 88,
          repository: "org/repo",
          reviewState: "APPROVED",
          submittedAt: "2026-06-19T15:30:00.000Z",
        },
        event_type: "review-submitted",
        id: 8,
        jira_status: "Code Review",
        occurred_at: new Date("2026-06-19T15:30:00.000Z"),
        origin: "system",
        previous_value: null,
        ticket_key: "APP-2",
        workflow_column: "code-review",
      }, {
        current_value: {
          prNumber: 88,
          repository: "org/repo",
          reviewState: "CHANGES_REQUESTED",
          submittedAt: "2026-06-19T15:45:00.000Z",
        },
        event_type: "re-review-submitted",
        id: 9,
        jira_status: "Code Review",
        occurred_at: new Date("2026-06-19T15:45:00.000Z"),
        origin: "system",
        previous_value: {
          prNumber: 88,
          repository: "org/repo",
          reviewState: "APPROVED",
          submittedAt: "2026-06-19T15:30:00.000Z",
        },
        ticket_key: "APP-2",
        workflow_column: "code-review",
      }, {
        current_value: true,
        event_type: "planned",
        id: 6,
        jira_status: "Development",
        occurred_at: new Date("2026-06-19T16:00:00.000Z"),
        origin: "user",
        previous_value: false,
        ticket_key: "APP-3",
        workflow_column: "development",
      }, {
        current_value: "development",
        event_type: "rejected-by-qa",
        id: 7,
        jira_status: "Development",
        occurred_at: new Date("2026-06-19T17:00:00.000Z"),
        origin: "system",
        previous_value: "testing",
        ticket_key: "APP-4",
        workflow_column: "development",
      }, {
        current_value: "testing",
        event_type: "workflow-column-changed",
        id: 10,
        jira_status: "Test",
        occurred_at: new Date("2026-06-19T18:00:00.000Z"),
        origin: "system",
        previous_value: "development",
        ticket_key: "APP-5",
        workflow_column: "testing",
      }, {
        current_value: false,
        event_type: "merge-conflict-changed",
        id: 11,
        jira_status: "Code Review",
        occurred_at: new Date("2026-06-19T18:05:00.000Z"),
        origin: "system",
        previous_value: true,
        ticket_key: "APP-6",
        workflow_column: "code-review",
      }, {
        current_value: "finalized",
        event_type: "workflow-column-changed",
        id: 14,
        jira_status: "Closed",
        occurred_at: new Date("2026-06-19T18:12:00.000Z"),
        origin: "system",
        previous_value: "backlog",
        ticket_key: "APP-9",
        workflow_column: "finalized",
      }, {
        current_value: "finalized",
        event_type: "workflow-column-changed",
        id: 12,
        jira_status: "Closed",
        occurred_at: new Date("2026-06-19T18:10:00.000Z"),
        origin: "system",
        previous_value: "development",
        ticket_key: "APP-7",
        workflow_column: "finalized",
      }, {
        current_value: "finalized",
        event_type: "workflow-column-changed",
        id: 13,
        jira_status: "Closed",
        occurred_at: new Date("2026-06-19T18:15:00.000Z"),
        origin: "system",
        previous_value: "release",
        ticket_key: "APP-8",
        workflow_column: "finalized",
      }]));

    const log = await new ReportRepository(createDatabase(query))
      .fetchDailyLog("2026-06-19", "UTC");

    expect(log.ignoredNoiseCount).toBe(4);
    expect(log.sections["my-actions"].map((entry) => entry.ticketKey)).toEqual([
      "APP-9",
      "APP-7",
      "APP-5",
      "APP-2",
      "APP-2",
      "APP-2",
    ]);
    expect(log.sections["my-actions"][0]?.title).toBe("Closed after investigation");
    expect(log.sections["my-actions"][1]?.title).toBe("Closed after investigation");
    expect(log.sections["my-actions"][2]?.title).toBe("Completed development");
    expect(log.sections["my-actions"][3]?.title).toBe("Re-reviewed PR");
    expect(log.sections["my-actions"][4]?.title).toBe("Reviewed PR");
    expect(log.sections["my-actions"][5]?.title).toBe("Resolved merge conflict");
    expect(log.sections["workflow-progress"]).toEqual([]);
    expect(log.sections["workflow-regressions"][0]?.ticketKey).toBe("APP-4");
  });
});
