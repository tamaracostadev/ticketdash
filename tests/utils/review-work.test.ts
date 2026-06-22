import { describe, expect, it } from "vitest";

import { createDashboardData } from "../../src/utils/dashboard";
import { createIssue, createPR } from "../fixtures/domain";

const REVIEW_CONFIG = {
  githubUsername: "reviewer",
  projectKeys: [],
  ticketKeyPrefixes: ["APP", "OPS"],
  workflowStatuses: {
    backlog: [],
    codeReview: [],
    development: [],
    finalized: [],
    release: [],
    testing: [],
  },
};

describe("review work queue", () => {
  it("surfaces pending review requests outside the delivery queue", () => {
    const reviewPr = createPR("OPS-200", {
      number: 200,
      repository: { name: "admin", owner: { login: "org" } },
      searchContexts: { authored: false, reviewRequested: true },
      url: "https://github.example/pull/200",
    });

    const data = createDashboardData(
      [createIssue("APP-100")],
      [reviewPr],
      {},
      {},
      new Date(),
      REVIEW_CONFIG,
    );

    expect(data.reviewItems).toEqual([
      expect.objectContaining({
        reason: "pending-review-request",
        ticketKey: "OPS-200",
      }),
    ]);
    expect(data.unlinkedPRs).toEqual([]);
  });

  it("creates a re-review action after new commits follow my requested changes", () => {
    const reviewPr = createPR("OPS-200", {
      latestCommits: {
        nodes: [{ commit: { committedDate: "2026-06-18T12:00:00.000Z" } }],
      },
      latestOpinionatedReviews: {
        nodes: [{
          author: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submittedAt: "2026-06-18T10:00:00.000Z",
        }],
      },
      number: 201,
      repository: { name: "admin", owner: { login: "org" } },
      searchContexts: { authored: false, reviewRequested: false },
      url: "https://github.example/pull/201",
    });

    const data = createDashboardData(
      [createIssue("APP-100")],
      [reviewPr],
      {},
      {},
      new Date(),
      REVIEW_CONFIG,
    );

    expect(data.reviewItems[0]).toMatchObject({
      reason: "re-review-required",
      ticketKey: "OPS-200",
    });
    expect(data.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "re-review",
      }),
    ]));
  });

  it("does not duplicate tickets already in the delivery queue", () => {
    const data = createDashboardData(
      [createIssue("APP-100")],
      [createPR("APP-100", {
        searchContexts: { authored: false, reviewRequested: true },
      })],
      {},
      {},
      new Date(),
      {
        ...REVIEW_CONFIG,
        ticketKeyPrefixes: ["APP"],
      },
    );

    expect(data.reviewItems).toEqual([]);
    expect(data.unlinkedPRs).toEqual([]);
  });
});
