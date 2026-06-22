import { describe, expect, it } from "vitest";

import type { WorkflowClassificationOptions } from "../../src/types/workflow";
import { createDashboardData } from "../../src/utils/dashboard";
import { calculatePriority } from "../../src/utils/priority";
import { classifyWorkflow } from "../../src/utils/workflow";
import { createIssue, createPlan, createPR } from "../fixtures/domain";

describe("workflow classification", () => {
  it("uses configured Jira status groups", () => {
    const result = classifyWorkflow(
      createIssue("APP-1", "Peer Validation"),
      false,
      {},
      {
        backlog: [],
        codeReview: ["Peer Validation"],
        development: [],
        finalized: [],
        release: [],
        testing: [],
      },
    );

    expect(result.column).toBe("code-review");
  });

  it("keeps action signals in the external workflow column", () => {
    const result = classifyWorkflow(createIssue("APP-1", "Code Review"), true, {
      systemPlanningReasons: ["changes-requested"],
    });

    expect(result).toMatchObject({
      column: "code-review",
      externalColumn: "code-review",
      reason: "jira-status",
    });
  });

  it("does not system-plan backlog or development", () => {
    const options: WorkflowClassificationOptions = {
      systemPlanningReasons: ["merge-conflict"],
    };

    expect(classifyWorkflow(createIssue("APP-1", "Open"), false, options).column)
      .toBe("backlog");
    expect(classifyWorkflow(createIssue("APP-2", "Dev"), false, options).column)
      .toBe("development");
  });
});

describe("automatic priority", () => {
  it("keeps typed reasons and caps open thread score", () => {
    const priority = calculatePriority({
      hasChangesRequested: true,
      hasConflict: false,
      hasUnreadComment: false,
      openThreadCount: 20,
      rejectionReason: null,
    });

    expect(priority).toEqual({
      level: "urgent",
      reasons: [
        { score: 90, type: "changes-requested" },
        { score: 40, type: "open-threads" },
      ],
      score: 130,
    });
  });

  it("assigns high automatic priority to observed rejections", () => {
    expect(calculatePriority({
      hasChangesRequested: false,
      hasConflict: false,
      hasUnreadComment: false,
      openThreadCount: 0,
      rejectionReason: "rejected-by-qa",
    })).toMatchObject({
      level: "high",
      reasons: [{ score: 60, type: "rejected-by-qa" }],
    });
  });

  it("orders planned tickets by period before automatic priority", () => {
    const tickets = createDashboardData(
      [createIssue("APP-1", "Open"), createIssue("APP-2", "Open")],
      [createPR("APP-2", { mergeable: "CONFLICTING" })],
      {},
      {
        "APP-1": createPlan("APP-1", { isPlanned: true, plannedPeriod: "today" }),
        "APP-2": createPlan("APP-2", { isPlanned: true, plannedPeriod: "week" }),
      },
    ).tickets;

    expect(tickets.map(({ issue }) => issue.key)).toEqual(["APP-1", "APP-2"]);
  });
});
