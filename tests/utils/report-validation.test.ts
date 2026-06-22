import { describe, expect, it } from "vitest";

import {
  parseDailyWorkLog,
  normalizeReportPeriod,
  normalizeReportReferenceDate,
  normalizeReportTimezone,
  parseReportSummary,
} from "../../src/utils/reportValidation";

describe("report validation", () => {
  it("accepts supported periods and reference dates", () => {
    expect(normalizeReportPeriod("day")).toBe("day");
    expect(normalizeReportPeriod("month")).toBe("month");
    expect(normalizeReportPeriod("custom")).toBe("custom");
    expect(normalizeReportReferenceDate("2026-06-19")).toBe("2026-06-19");
    expect(normalizeReportReferenceDate("19-06-2026")).toBeNull();
    expect(normalizeReportTimezone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
    expect(normalizeReportTimezone("Invalid/Timezone")).toBeNull();
  });

  it("parses a valid report summary", () => {
    expect(parseReportSummary({
      cycleTimes: {
        developmentActiveToRelease: {
          current: { averageSeconds: 7200, count: 1, medianSeconds: 7200 },
          previous: { averageSeconds: null, count: 0, medianSeconds: null },
        },
        developmentActiveToReview: {
          current: { averageSeconds: 3600, count: 1, medianSeconds: 3600 },
          previous: { averageSeconds: 5400, count: 2, medianSeconds: 5400 },
        },
      },
      endAt: "2026-06-20T03:00:00.000Z",
      hasCompleteObservationCoverage: true,
      metrics: {
        blocked: {
          count: 1,
          eventTypes: ["reflection-created"],
          source: "ticket_reflections",
          ticketKeys: ["app-1"],
        },
        completed: {
          count: 1,
          eventTypes: ["workflow-column-changed"],
          source: "activity_events",
          ticketKeys: ["APP-2"],
        },
        conflictRework: {
          count: 0,
          eventTypes: ["merge-conflict-changed"],
          source: "activity_events",
          ticketKeys: [],
        },
        movedToRelease: {
          count: 1,
          eventTypes: ["workflow-column-changed"],
          source: "activity_events",
          ticketKeys: ["APP-6"],
        },
        movedToReview: {
          count: 1,
          eventTypes: ["workflow-column-changed"],
          source: "activity_events",
          ticketKeys: ["APP-5"],
        },
        movedToTesting: {
          count: 1,
          eventTypes: ["workflow-column-changed"],
          source: "activity_events",
          ticketKeys: ["APP-2"],
        },
        planned: {
          count: 1,
          eventTypes: ["planned"],
          source: "activity_events",
          ticketKeys: ["APP-3"],
        },
        qaRework: {
          count: 0,
          eventTypes: ["rejected-by-qa"],
          source: "activity_events",
          ticketKeys: [],
        },
        reReviewsCompleted: {
          count: 1,
          eventTypes: ["re-review-submitted"],
          source: "activity_events",
          ticketKeys: ["APP-7"],
        },
        reviewRework: {
          count: 1,
          eventTypes: ["rejected-by-review"],
          source: "activity_events",
          ticketKeys: ["APP-4"],
        },
        reviewsCompleted: {
          count: 1,
          eventTypes: ["review-submitted"],
          source: "activity_events",
          ticketKeys: ["APP-7"],
        },
        returned: {
          count: 1,
          eventTypes: ["rejected-by-review"],
          source: "activity_events",
          ticketKeys: ["APP-4"],
        },
        started: {
          count: 1,
          eventTypes: ["active-development-started"],
          source: "activity_events",
          ticketKeys: ["APP-5"],
        },
        totalRework: {
          count: 1,
          eventTypes: ["merge-conflict-changed", "rejected-by-qa", "rejected-by-review"],
          source: "activity_events",
          ticketKeys: ["APP-4"],
        },
      },
      observationCoverageStartAt: "2026-06-01T12:00:00.000Z",
      period: "week",
      reflections: [{
        blockers: "",
        difficulty: "medium",
        learnings: "Keep PRs smaller",
        notes: "",
        outcome: "partial",
        ticketKey: "app-4",
        updatedAt: "2026-06-19T13:00:00.000Z",
      }],
      stageDurations: [{
        observedSeconds: 7200,
        ticketKeys: ["APP-5"],
        workflowColumn: "development",
      }],
      startAt: "2026-06-13T03:00:00.000Z",
      timezone: "America/Sao_Paulo",
    })?.reflections[0]?.ticketKey).toBe("APP-4");
  });

  it("parses a valid daily work log", () => {
    expect(parseDailyWorkLog({
      date: "2026-06-19",
      ignoredNoiseCount: 3,
      sections: {
        "my-actions": [{
          category: "my-actions",
          description: "APP-1 was added to the plan.",
          eventType: "planned",
          occurredAt: "2026-06-19T13:00:00.000Z",
          ticketKey: "app-1",
          title: "Planned ticket",
        }],
        "workflow-progress": [],
        "workflow-regressions": [],
      },
      timezone: "UTC",
    })?.sections["my-actions"][0]?.ticketKey).toBe("APP-1");
  });
});
