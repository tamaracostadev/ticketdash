import { describe, expect, it } from "vitest";

import { createDashboardData } from "../../src/utils/dashboard";
import { createKanbanColumns } from "../../src/utils/kanban";
import { sortDashboardTickets } from "../../src/utils/sortTickets";
import {
  createTicketPlan,
  getPlanningVisibility,
  withPlanChanges,
} from "../../src/utils/planning";
import { createIssue, createPlan, createPR } from "../fixtures/domain";

describe("personal planning", () => {
  it("normalizes dependent fields and visibility", () => {
    const plan = withPlanChanges(createTicketPlan("app-1"), {
      deferredUntil: "2026-06-16T10:00:00.000Z",
      isBlocked: false,
      isPlanned: false,
      plannedPeriod: "today",
    });

    expect(plan.plannedPeriod).toBeNull();
    expect(plan.blockedReason).toBeNull();
    expect(getPlanningVisibility(plan, new Date("2026-06-15T10:00:00.000Z")))
      .toBe("deferred");
  });

  it("removes planned state when active development starts", () => {
    const plan = withPlanChanges(createTicketPlan("app-1"), {
      isActiveDevelopment: true,
      activeDevelopmentSource: "manual",
      activeDevelopmentStartedAt: "2026-06-16T10:00:00.000Z",
      isPlanned: true,
      manualOrder: 1,
      plannedPeriod: "today",
    });

    expect(plan.isPlanned).toBe(false);
    expect(plan.manualOrder).toBeNull();
    expect(plan.plannedPeriod).toBeNull();
  });
});

describe("kanban grouping", () => {
  it("preserves order, uniqueness and excludes hidden tickets", () => {
    const issues = [
      createIssue("APP-2", "Open"),
      createIssue("APP-1", "Open"),
      createIssue("APP-3", "Dev"),
    ];
    const tickets = createDashboardData(issues, [], {}, {
      "APP-3": createPlan("APP-3", { isHidden: true }),
    }).tickets;
    const columns = createKanbanColumns(tickets);

    expect(columns.find(({ id }) => id === "backlog")?.tickets.map(
      ({ issue }) => issue.key,
    )).toEqual(["APP-1", "APP-2"]);
    expect(columns.flatMap(({ tickets: grouped }) => grouped)).toHaveLength(2);
  });

  it("creates duplicate sync actions only when the primary ticket reaches release", () => {
    const issues = [
      createIssue("APP-1", "Ready for production"),
      createIssue("APP-2", "Dev"),
      createIssue("APP-3", "Dev"),
    ];
    const dashboard = createDashboardData(issues, [], {}, {
      "APP-2": createPlan("APP-2", {
        duplicateOfTicketKey: "APP-1",
        hiddenReason: "duplicate",
        isHidden: true,
      }),
      "APP-3": createPlan("APP-3", {
        duplicateOfTicketKey: "APP-1",
        hiddenReason: "duplicate",
        isHidden: true,
      }),
    }, new Date("2026-06-15T10:00:00.000Z"), {
      githubUsername: "tamara",
      projectKeys: ["APP"],
      ticketKeyPrefixes: ["APP"],
      workflowStatuses: {
        backlog: ["Open"],
        codeReview: ["Code Review"],
        development: ["Dev"],
        finalized: ["Done"],
        release: ["Ready for production"],
        testing: ["QA"],
      },
    });

    expect(
      dashboard.actions.filter((action) => action.type === "linked-duplicate-sync"),
    ).toEqual([
      expect.objectContaining({ label: "APP-2" }),
      expect.objectContaining({ label: "APP-3" }),
    ]);
  });

  it("respects manual order inside the same operational column before default ordering", () => {
    const tickets = createDashboardData(
      [
        createIssue("APP-100", "QA"),
        createIssue("APP-200", "QA"),
        createIssue("APP-300", "Open"),
        createIssue("APP-400", "Open"),
      ],
      [],
      {},
      {
        "APP-100": createPlan("APP-100", { manualOrder: 2 }),
        "APP-200": createPlan("APP-200", { manualOrder: 1 }),
        "APP-300": createPlan("APP-300", {
          isPlanned: true,
          manualOrder: 2,
          plannedPeriod: "today",
        }),
        "APP-400": createPlan("APP-400", {
          isPlanned: true,
          manualOrder: 1,
          plannedPeriod: "today",
        }),
      },
      new Date("2026-06-15T10:00:00.000Z"),
      {
        githubUsername: "tamara",
        projectKeys: ["APP"],
        ticketKeyPrefixes: ["APP"],
        workflowStatuses: {
          backlog: ["Open"],
          codeReview: ["Code Review"],
          development: ["Dev"],
          finalized: ["Done"],
          release: ["Ready for production"],
          testing: ["QA"],
        },
      },
    ).tickets;

    const testingTickets = sortDashboardTickets(tickets).filter(
      (ticket) => ticket.workflow.column === "testing",
    );
    expect(testingTickets.map((ticket) => ticket.issue.key)).toEqual([
      "APP-200",
      "APP-100",
    ]);

    const plannedTickets = createKanbanColumns(tickets)
      .find((column) => column.id === "planned")
      ?.tickets.map((ticket) => ticket.issue.key);
    expect(plannedTickets).toEqual(["APP-400", "APP-300"]);
  });

  it("keeps active development tickets in development even when a stale plan still exists", () => {
    const tickets = createDashboardData(
      [createIssue("APP-100", "Dev")],
      [],
      {},
      {
        "APP-100": createPlan("APP-100", {
          isActiveDevelopment: true,
          activeDevelopmentSource: "manual",
          activeDevelopmentStartedAt: "2026-06-15T10:00:00.000Z",
          isPlanned: true,
          plannedPeriod: "today",
        }),
      },
      new Date("2026-06-15T10:00:00.000Z"),
      {
        githubUsername: "tamara",
        projectKeys: ["APP"],
        ticketKeyPrefixes: ["APP"],
        workflowStatuses: {
          backlog: ["Open"],
          codeReview: ["Code Review"],
          development: ["Dev"],
          finalized: ["Done"],
          release: ["Ready for production"],
          testing: ["QA"],
        },
      },
    ).tickets;

    expect(tickets[0]?.workflow.column).toBe("development");
  });

  it("shows system-planned merge-conflict tickets in planned even when Jira is still in code review", () => {
    const tickets = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [createPR("APP-100", { mergeable: "CONFLICTING" })],
      {},
      {
        "APP-100": createPlan("APP-100", {
          isPlanned: true,
        }),
      },
      new Date("2026-06-15T10:00:00.000Z"),
      {
        githubUsername: "tamara",
        projectKeys: ["APP"],
        ticketKeyPrefixes: ["APP"],
        workflowStatuses: {
          backlog: ["Open"],
          codeReview: ["Code Review"],
          development: ["Dev"],
          finalized: ["Done"],
          release: ["Ready for production"],
          testing: ["QA"],
        },
      },
    ).tickets;

    expect(tickets[0]?.workflow.column).toBe("planned");
    expect(tickets[0]?.workflow.reason).toBe("system-planning");
  });
});
