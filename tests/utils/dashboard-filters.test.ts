import { describe, expect, it } from "vitest";

import { EMPTY_TICKET_FILTERS } from "../../src/types/filters";
import { createDashboardData } from "../../src/utils/dashboard";
import { filterTickets, needsAction } from "../../src/utils/filterTickets";
import { createIssue, createPlan, createPR } from "../fixtures/domain";

const REVIEW_AT = "2026-06-15T09:00:00.000Z";

function changesRequestedPR(reviewAt = REVIEW_AT) {
  return createPR("APP-100", {
    changesRequestedReviews: { nodes: [{ submittedAt: reviewAt }] },
    reviewDecision: "CHANGES_REQUESTED",
  });
}

describe("changes requested lifecycle", () => {
  it("requires action while keeping an unresolved review in code review", () => {
    const data = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [changesRequestedPR()],
      {},
    );

    expect(data.tickets[0].workflow.column).toBe("code-review");
    expect(needsAction(data.tickets[0])).toBe(true);
    expect(data.actions[0]?.type).toBe("changes-requested");
  });

  it("keeps the external status but removes action after it is addressed", () => {
    const plan = createPlan("APP-100", { resolvedChangesRequestedAt: REVIEW_AT });
    const data = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [changesRequestedPR()],
      {},
      { "APP-100": plan },
    );

    expect(data.tickets[0].prs[0]?.pr.reviewDecision).toBe("CHANGES_REQUESTED");
    expect(data.tickets[0].workflow.column).toBe("code-review");
    expect(needsAction(data.tickets[0])).toBe(false);
    expect(data.actions).toHaveLength(0);
  });

  it("keeps an addressed review resolved after PostgreSQL canonicalization", () => {
    const plan = createPlan("APP-100", {
      resolvedChangesRequestedAt: "2026-06-15T09:00:00.000Z",
    });
    const data = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [changesRequestedPR("2026-06-15T09:00:00Z")],
      {},
      { "APP-100": plan },
    );

    expect(data.tickets[0].hasChangesRequested).toBe(false);
    expect(data.actions).toHaveLength(0);
  });

  it("reactivates action when a newer review arrives", () => {
    const plan = createPlan("APP-100", { resolvedChangesRequestedAt: REVIEW_AT });
    const ticket = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [changesRequestedPR("2026-06-15T10:00:00.000Z")],
      {},
      { "APP-100": plan },
    ).tickets[0];

    expect(needsAction(ticket)).toBe(true);
  });
});

describe("attention filters", () => {
  it("filters dynamically discovered project keys", () => {
    const tickets = createDashboardData(
      [createIssue("APP-100"), createIssue("OPS-200")],
      [],
      {},
    ).tickets;

    expect(filterTickets(tickets, {
      ...EMPTY_TICKET_FILTERS,
      project: "OPS",
    }).map(({ issue }) => issue.key)).toEqual(["OPS-200"]);
  });

  it("separates action-required and no-action tickets", () => {
    const tickets = createDashboardData(
      [createIssue("APP-100", "Code Review"), createIssue("APP-200", "Dev")],
      [changesRequestedPR()],
      {},
    ).tickets;

    expect(filterTickets(tickets, {
      ...EMPTY_TICKET_FILTERS,
      attention: "action-required",
    }).map(({ issue }) => issue.key)).toEqual(["APP-100"]);
    expect(filterTickets(tickets, {
      ...EMPTY_TICKET_FILTERS,
      attention: "no-action",
    }).map(({ issue }) => issue.key)).toEqual(["APP-200"]);
  });

  it("treats explicit workflow alerts as actionable and filterable", () => {
    const tickets = createDashboardData(
      [createIssue("APP-100", "Code Review"), createIssue("APP-200", "Ready for Production")],
      [createPR("APP-200")],
      {},
      {},
      new Date(),
      {
        githubUsername: "",
        projectKeys: [],
        ticketKeyPrefixes: [],
        workflowStatuses: {
          backlog: [],
          codeReview: ["Code Review"],
          development: [],
          finalized: [],
          release: ["Ready for Production"],
          testing: [],
        },
      },
    ).tickets;

    expect(needsAction(tickets[0])).toBe(true);
    expect(needsAction(tickets[1])).toBe(true);
    expect(filterTickets(tickets, {
      ...EMPTY_TICKET_FILTERS,
      onlyDivergence: true,
    }).map(({ issue }) => issue.key)).toEqual(["APP-100", "APP-200"]);
  });

  it("matches any linked PR state in multi-repository tickets", () => {
    const issue = createIssue("APP-100", "Code Review");
    const approved = createPR("APP-100", {
      number: 1,
      repository: { name: "admin", owner: { login: "org" } },
      reviewDecision: "APPROVED",
      url: "https://github.example/admin/pull/1",
    });
    const requested = changesRequestedPR();
    requested.number = 2;
    requested.repository.name = "backend";
    requested.url = "https://github.example/backend/pull/2";
    const draft = createPR("APP-100", {
      isDraft: true,
      number: 3,
      repository: { name: "api", owner: { login: "org" } },
      url: "https://github.example/api/pull/3",
    });
    const pending = createPR("APP-100", {
      number: 4,
      repository: { name: "worker", owner: { login: "org" } },
      url: "https://github.example/worker/pull/4",
    });
    const partial = createPR("APP-100", {
      latestOpinionatedReviews: {
        nodes: [{
          author: { login: "reviewer" },
          state: "APPROVED",
          submittedAt: REVIEW_AT,
        }],
      },
      number: 5,
      repository: { name: "service", owner: { login: "org" } },
      reviewRequests: { totalCount: 1 },
      url: "https://github.example/service/pull/5",
    });
    const tickets = createDashboardData(
      [issue],
      [approved, requested, draft, pending, partial],
      {},
    ).tickets;

    for (const pr of [
      "approved",
      "changes-requested",
      "draft",
      "partially-approved",
      "pending-review",
    ] as const) {
      expect(filterTickets(tickets, {
        ...EMPTY_TICKET_FILTERS,
        pr,
      })).toHaveLength(1);
    }
    expect(filterTickets(tickets, {
      ...EMPTY_TICKET_FILTERS,
      pr: "no-pr",
    })).toHaveLength(0);
  });
});
