import { describe, expect, it } from "vitest";

import { parseActivityCapture, parseActivityStates } from "../../src/utils/activityValidation";
import { createActivityCapture } from "../../src/utils/activityCapture";
import { createDashboardData } from "../../src/utils/dashboard";
import { createIssue, createPlan, createPR } from "../fixtures/domain";

describe("activity payload", () => {
  it("contains operational state without personal notes or comments", () => {
    const issue = createIssue("APP-100");
    issue.fields.comment.comments.push({
      author: { accountId: "1", displayName: "Private user" },
      created: "2026-06-18T10:00:00.000Z",
      id: "comment-1",
      updated: "2026-06-18T10:00:00.000Z",
    });
    const ticket = createDashboardData([issue], [], {}, {
      "APP-100": createPlan("APP-100", { notes: "private note" }),
    }).tickets[0];
    const payload = createActivityCapture(
      [ticket],
      [],
      "2026-06-18T12:00:00.000Z",
    );
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain("private note");
    expect(serialized).not.toContain("Private user");
    expect(serialized).not.toContain("comment-1");
  });

  it("validates captures and normalized activity states", () => {
    const capture = [{
      hasConflict: false,
      jiraStatus: "Dev",
      observedAt: "2026-06-18T09:00:00-03:00",
      openThreadCount: 0,
      pullRequests: [],
      reviewState: "no-pr",
      ticketKey: "app-100",
      workflowColumn: "development",
    }];
    expect(parseActivityCapture(capture)?.[0]).toMatchObject({
      observedAt: "2026-06-18T12:00:00.000Z",
      ticketKey: "APP-100",
    });
    expect(parseActivityStates({
      "APP-100": {
        rejectionReason: "rejected-by-qa",
        ticketKey: "APP-100",
        workflowColumn: "development",
      },
    })?.["APP-100"]?.rejectionReason).toBe("rejected-by-qa");
    expect(parseActivityCapture([{ invalid: true }])).toBeNull();
  });

  it("captures reviewed PRs outside the assigned Jira queue", () => {
    const payload = createActivityCapture(
      [],
      [createPR("OPS-200", {
        latestOpinionatedReviews: {
          nodes: [{
            author: { login: "reviewer" },
            state: "APPROVED",
            submittedAt: "2026-06-18T11:00:00.000Z",
          }],
        },
        searchContexts: { authored: false, reviewed: true, reviewRequested: false },
      })],
      "2026-06-18T12:00:00.000Z",
      ["OPS"],
      "reviewer",
    );

    expect(payload).toEqual([
      expect.objectContaining({
        jiraStatus: "Code Review",
        ticketKey: "OPS-200",
        workflowColumn: "code-review",
      }),
    ]);
  });
});
