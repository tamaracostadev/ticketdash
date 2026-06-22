import { resolveWorkflowStatuses } from "../config/workflow";
import type { ActivityStateByTicket } from "../types/activity";
import type { GitHubPR, GitHubWarning } from "../types/github";
import type { PublicDashboardConfig } from "../types/integrations";
import type { JiraIssue } from "../types/jira";
import type { LastSeenByTicket } from "../types/persistence";
import type { TicketPlan, TicketPlansByKey } from "../types/planning";
import type {
  DailyWorkLog,
  DailyWorkLogEntry,
  ReportPeriod,
  ReportSummary,
} from "../types/reports";
import type { TicketReflectionsByKey } from "../types/reflections";
import { createTicketPlan } from "../utils/planning";

const DEMO_NOW = "2026-06-22T12:00:00.000Z";
const DEMO_GITHUB_USERNAME = "demo-reviewer";

function createIssue(
  key: string,
  summary: string,
  status: string,
  category: "done" | "indeterminate" | "new" = "indeterminate",
  comments: Array<{ created: string; id: string }> = [],
): JiraIssue {
  return {
    id: key,
    key,
    self: `https://jira.example/rest/api/3/issue/${key}`,
    fields: {
      comment: {
        comments: comments.map((comment) => ({
          author: {
            accountId: `user-${comment.id}`,
            displayName: `User ${comment.id}`,
          },
          created: comment.created,
          id: comment.id,
          updated: comment.created,
        })),
        maxResults: comments.length,
        startAt: 0,
        total: comments.length,
      },
      status: {
        id: `status-${status}`,
        name: status,
        statusCategory: { key: category, name: category },
      },
      summary,
      updated: DEMO_NOW,
    },
  };
}

function createPR(
  ticketKey: string,
  changes: Partial<GitHubPR> = {},
): GitHubPR {
  return {
    author: { login: "demo-author" },
    changesRequestedReviews: { nodes: [] },
    headRefName: `feature/${ticketKey.toLowerCase()}`,
    isDraft: false,
    latestCommits: { nodes: [] },
    latestOpinionatedReviews: { nodes: [] },
    mergeable: "MERGEABLE",
    number: 100,
    repository: { name: "demo-repo", owner: { login: "example" } },
    reviewDecision: null,
    reviewRequests: { totalCount: 0 },
    searchContexts: { authored: true, reviewRequested: false },
    reviewThreads: { nodes: [] },
    title: `${ticketKey} ${ticketKey} demo PR`,
    updatedAt: DEMO_NOW,
    url: `https://github.example/pull/${ticketKey}`,
    ...changes,
  };
}

function createPlan(
  ticketKey: string,
  changes: Partial<Omit<TicketPlan, "ticketKey">> = {},
): TicketPlan {
  return { ...createTicketPlan(ticketKey), ...changes };
}

export const DEMO_CONFIG: PublicDashboardConfig = {
  githubUsername: DEMO_GITHUB_USERNAME,
  projectKeys: ["APP", "OPS", "WEB"],
  ticketKeyPrefixes: ["APP", "OPS", "WEB", "EXT"],
  workflowStatuses: resolveWorkflowStatuses(),
};

export const DEMO_INTEGRATIONS = {
  config: DEMO_CONFIG,
  github: true,
  jira: true,
};

export const DEMO_GITHUB_WARNINGS: GitHubWarning[] = [];

export const DEMO_ISSUES: JiraIssue[] = [
  createIssue(
    "APP-101",
    "Screenshot-ready public changelog page",
    "Open",
    "new",
  ),
  createIssue("OPS-202", "Generic webhook retry policy cleanup", "Dev"),
  createIssue("WEB-303", "Marketing assets CDN fallback", "Dev"),
  createIssue("APP-404", "Checkout trial copy regression", "Code Review"),
  createIssue("WEB-808", "Subscription dunning retry mismatch", "Dev"),
  createIssue("OPS-505", "Search analytics event mismatch", "In QA"),
  createIssue("APP-606", "Invoice export empty-state polish", "Ready for Production"),
  createIssue("APP-707", "Public docs metadata cleanup", "Closed", "done"),
  createIssue("WEB-909", "Legacy admin copy sync for release", "Dev"),
];

export const DEMO_PRS: GitHubPR[] = [
  createPR("OPS-202", {
    latestCommits: {
      nodes: [{ commit: { committedDate: "2026-06-22T10:10:00.000Z" } }],
    },
    number: 202,
    reviewDecision: "APPROVED",
    url: "https://github.example/example/demo-repo/pull/202",
  }),
  createPR("APP-404", {
    changesRequestedReviews: {
      nodes: [{ submittedAt: "2026-06-22T08:10:00.000Z" }],
    },
    latestOpinionatedReviews: {
      nodes: [{
        author: { login: "lead-reviewer" },
        state: "CHANGES_REQUESTED",
        submittedAt: "2026-06-22T08:10:00.000Z",
      }],
    },
    number: 404,
    reviewDecision: "CHANGES_REQUESTED",
    reviewThreads: {
      nodes: [{
        comments: {
          nodes: [{
            author: { login: "lead-reviewer" },
            createdAt: "2026-06-22T08:15:00.000Z",
          }],
        },
        isOutdated: false,
        isResolved: false,
      }],
    },
    url: "https://github.example/example/frontend/pull/404",
  }),
  createPR("WEB-808", {
    latestCommits: {
      nodes: [{ commit: { committedDate: "2026-06-22T11:05:00.000Z" } }],
    },
    mergeable: "CONFLICTING",
    number: 808,
    reviewDecision: "APPROVED",
    url: "https://github.example/example/checkout/pull/808",
  }),
  createPR("OPS-505", {
    number: 505,
    reviewThreads: {
      nodes: [{
        comments: {
          nodes: [{
            author: { login: "qa-reviewer" },
            createdAt: "2026-06-22T09:05:00.000Z",
          }],
        },
        isOutdated: false,
        isResolved: false,
      }],
    },
    url: "https://github.example/example/backend/pull/505",
  }),
  createPR("APP-606", {
    number: 606,
    reviewDecision: "APPROVED",
    url: "https://github.example/example/admin/pull/606",
  }),
  createPR("EXT-808", {
    author: { login: "another-dev" },
    headRefName: "feature/ext-808",
    latestCommits: {
      nodes: [{ commit: { committedDate: "2026-06-22T11:20:00.000Z" } }],
    },
    number: 808,
    reviewDecision: "REVIEW_REQUIRED",
    searchContexts: { authored: false, reviewRequested: true },
    title: "EXT-808 Shared billing abstractions",
    url: "https://github.example/example/platform/pull/808",
  }),
  createPR("EXT-909", {
    author: { login: "another-dev" },
    changesRequestedReviews: {
      nodes: [{ submittedAt: "2026-06-22T07:45:00.000Z" }],
    },
    headRefName: "feature/ext-909",
    latestCommits: {
      nodes: [{ commit: { committedDate: "2026-06-22T10:40:00.000Z" } }],
    },
    latestOpinionatedReviews: {
      nodes: [{
        author: { login: DEMO_GITHUB_USERNAME },
        state: "CHANGES_REQUESTED",
        submittedAt: "2026-06-22T07:45:00.000Z",
      }],
    },
    number: 909,
    reviewDecision: "REVIEW_REQUIRED",
    searchContexts: { authored: false, reviewRequested: false },
    title: "EXT-909 Shared customer timeline refactor",
    url: "https://github.example/example/platform/pull/909",
  }),
];

export const DEMO_LAST_SEEN: LastSeenByTicket = {
  "OPS-202": "2026-06-22T07:00:00.000Z",
};

export const DEMO_ACTIVITY_STATES: ActivityStateByTicket = {
  "WEB-303": {
    rejectionReason: "rejected-by-qa",
    ticketKey: "WEB-303",
    workflowColumn: "development",
  },
};

export const DEMO_TICKET_PLANS: TicketPlansByKey = {
  "APP-101": createPlan("APP-101", {
    isPlanned: true,
    manualOrder: 1,
    manualPriority: "high",
    notes: "Today focus for the public demo screenshots.",
    plannedPeriod: "today",
  }),
  "WEB-303": createPlan("WEB-303", {
    isPlanned: true,
    manualOrder: 2,
    manualPriority: "urgent",
    notes: "Returned from QA and needs a quick retry.",
    plannedPeriod: "today",
  }),
  "OPS-202": createPlan("OPS-202", {
    isActiveDevelopment: true,
    activeDevelopmentSource: "manual",
    activeDevelopmentStartedAt: "2026-06-22T09:00:00.000Z",
  }),
  "OPS-505": createPlan("OPS-505", {
    manualOrder: 1,
    manualPriority: "high",
  }),
  "APP-606": createPlan("APP-606", {
    manualOrder: 1,
    duplicateOfTicketKey: null,
  }),
  "WEB-909": createPlan("WEB-909", {
    isHidden: true,
    hiddenReason: "duplicate",
    duplicateOfTicketKey: "APP-606",
  }),
};

export const DEMO_REFLECTIONS: TicketReflectionsByKey = {
  "OPS-202": {
    blockers: "",
    difficulty: "medium",
    learnings: "Keep webhook retry behavior generic and documented.",
    notes: "Good candidate for a public architecture screenshot.",
    outcome: "partial",
    ticketKey: "OPS-202",
  },
};

function isoAt(date: string, time: string): string {
  return `${date}T${time}.000Z`;
}

function metric(ticketKeys: string[], eventTypes: string[]) {
  return {
    count: ticketKeys.length,
    eventTypes,
    source: "activity_events" as const,
    ticketKeys,
  };
}

export function createDemoDailyWorkLog(date: string, timezone: string): DailyWorkLog {
  const myActions: DailyWorkLogEntry[] = [
    {
      category: "my-actions",
      description: "OPS-202 no longer has a merge conflict.",
      eventType: "merge-conflict-changed",
      occurredAt: isoAt(date, "13:20:00"),
      ticketKey: "OPS-202",
      title: "Resolved merge conflict",
    },
    {
      category: "my-actions",
      description: "Reviewed the PR and approved it for release.",
      eventType: "review-completed",
      occurredAt: isoAt(date, "15:00:00"),
      ticketKey: "EXT-808",
      title: "Reviewed PR",
    },
    {
      category: "my-actions",
      description: "Reviewed follow-up commits after requested changes.",
      eventType: "re-review-completed",
      occurredAt: isoAt(date, "16:10:00"),
      ticketKey: "EXT-909",
      title: "Re-reviewed PR",
    },
  ];

  return {
    date,
    ignoredNoiseCount: 2,
    sections: {
      "my-actions": myActions,
      "workflow-progress": [
        {
          category: "workflow-progress",
          description: "OPS-505 progressed from testing to release.",
          eventType: "workflow-column-changed",
          occurredAt: isoAt(date, "14:00:00"),
          ticketKey: "OPS-505",
          title: "Moved to release",
        },
      ],
      "workflow-regressions": [
        {
          category: "workflow-regressions",
          description: "WEB-303 returned to development after QA feedback.",
          eventType: "rejected-by-qa",
          occurredAt: isoAt(date, "10:30:00"),
          ticketKey: "WEB-303",
          title: "Returned from QA",
        },
      ],
    },
    timezone,
  };
}

export function createDemoReportSummary(
  period: ReportPeriod,
  referenceDate: string,
  timezone: string,
  includeNotes: boolean,
  rangeStart?: string,
  rangeEnd?: string,
): ReportSummary {
  const startDate = period === "custom" ? (rangeStart ?? referenceDate) : referenceDate;
  const endDate = period === "custom" ? (rangeEnd ?? referenceDate) : referenceDate;
  return {
    cycleTimes: {
      developmentActiveToRelease: {
        current: { averageSeconds: 60 * 60 * 18, count: 2, medianSeconds: 60 * 60 * 17 },
        previous: { averageSeconds: 60 * 60 * 22, count: 2, medianSeconds: 60 * 60 * 21 },
      },
      developmentActiveToReview: {
        current: { averageSeconds: 60 * 60 * 8, count: 3, medianSeconds: 60 * 60 * 7 },
        previous: { averageSeconds: 60 * 60 * 11, count: 3, medianSeconds: 60 * 60 * 10 },
      },
    },
    endAt: `${endDate}T23:59:59.999Z`,
    hasCompleteObservationCoverage: true,
    metrics: {
      blocked: metric(["APP-101"], ["blocked"]),
      completed: metric(["APP-606", "APP-707"], ["completed"]),
      conflictRework: metric(["WEB-808"], ["merge-conflict-changed"]),
      movedToRelease: metric(["OPS-505", "APP-606"], ["workflow-column-changed"]),
      movedToReview: metric(["OPS-202", "WEB-303"], ["workflow-column-changed"]),
      movedToTesting: metric(["OPS-202"], ["workflow-column-changed"]),
      planned: metric(["APP-101", "WEB-303"], ["planned"]),
      qaRework: metric(["WEB-303"], ["rejected-by-qa"]),
      reReviewsCompleted: metric(["EXT-909"], ["re-review-completed"]),
      reviewRework: metric(["APP-404"], ["rejected-by-review"]),
      reviewsCompleted: metric(["EXT-808"], ["review-completed"]),
      returned: metric(["WEB-303", "APP-404", "WEB-808"], ["rejected-by-qa", "rejected-by-review", "merge-conflict-changed"]),
      started: metric(["OPS-202"], ["active-development-started"]),
      totalRework: metric(["APP-404", "WEB-303", "WEB-808"], [
        "merge-conflict-changed",
        "rejected-by-qa",
        "rejected-by-review",
      ]),
    },
    observationCoverageStartAt: `${startDate}T00:00:00.000Z`,
    period,
    reflections: includeNotes
      ? [{
        blockers: "",
        difficulty: "medium",
        learnings: "The demo mode should look realistic without exposing private work.",
        notes: "Cycle time metrics improved after separating active development from passive development.",
        outcome: "partial",
        ticketKey: "OPS-202",
        updatedAt: "2026-06-22T18:00:00.000Z",
      }]
      : [],
    stageDurations: [],
    startAt: `${startDate}T00:00:00.000Z`,
    timezone,
  };
}
