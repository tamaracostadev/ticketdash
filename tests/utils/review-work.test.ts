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

  it("keeps requested-changes reviews visible while threads are still open", () => {
    const reviewPr = createPR("OPS-201", {
      latestOpinionatedReviews: {
        nodes: [{
          author: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submittedAt: "2026-06-18T10:00:00.000Z",
        }],
      },
      number: 202,
      repository: { name: "admin", owner: { login: "org" } },
      reviewDecision: "CHANGES_REQUESTED",
      reviewThreads: {
        nodes: [{
          comments: { nodes: [{ author: { login: "reviewer" }, createdAt: "2026-06-18T10:01:00.000Z" }] },
          isOutdated: false,
          isResolved: false,
        }],
      },
      searchContexts: { authored: false, reviewRequested: false },
      url: "https://github.example/pull/202",
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
      reason: "changes-requested-open",
      ticketKey: "OPS-201",
      openThreadCount: 1,
    });
    expect(data.actions.some((action) => action.type === "re-review")).toBe(false);
  });

  it("treats resolved threads after my requested changes as re-review required", () => {
    const reviewPr = createPR("OPS-202", {
      latestOpinionatedReviews: {
        nodes: [{
          author: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submittedAt: "2026-06-18T10:00:00.000Z",
        }],
      },
      number: 203,
      repository: { name: "admin", owner: { login: "org" } },
      reviewDecision: "CHANGES_REQUESTED",
      reviewThreads: {
        nodes: [{
          comments: { nodes: [{ author: { login: "reviewer" }, createdAt: "2026-06-18T10:01:00.000Z" }] },
          isOutdated: false,
          isResolved: true,
        }],
      },
      searchContexts: { authored: false, reviewRequested: false },
      url: "https://github.example/pull/203",
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
      ticketKey: "OPS-202",
      openThreadCount: 0,
    });
  });

  it("does not leak reviewed PRs into the unlinked PR list", () => {
    const reviewPr = createPR("OPS-203", {
      latestOpinionatedReviews: {
        nodes: [{
          author: { login: "reviewer" },
          state: "APPROVED",
          submittedAt: "2026-06-18T10:00:00.000Z",
        }],
      },
      number: 204,
      repository: { name: "admin", owner: { login: "org" } },
      searchContexts: { authored: false, reviewed: true, reviewRequested: false },
      url: "https://github.example/pull/204",
    });

    const data = createDashboardData(
      [createIssue("APP-100")],
      [reviewPr],
      {},
      {},
      new Date(),
      REVIEW_CONFIG,
    );

    expect(data.reviewItems).toEqual([]);
    expect(data.unlinkedPRs).toEqual([]);
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
