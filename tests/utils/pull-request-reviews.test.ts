import { describe, expect, it } from "vitest";

import { getPRReviewSummary } from "../../src/utils/pullRequests";
import { createPR } from "../fixtures/domain";

describe("pull request review summary", () => {
  it("shows partial approval with counts and approvers", () => {
    const summary = getPRReviewSummary(createPR("APP-100", {
      latestOpinionatedReviews: {
        nodes: [
          {
            author: { login: "lead-dev" },
            state: "APPROVED",
            submittedAt: "2026-06-18T10:00:00.000Z",
          },
          {
            author: { login: "review-bot" },
            state: "APPROVED",
            submittedAt: "2026-06-18T11:00:00.000Z",
          },
        ],
      },
      reviewDecision: null,
      reviewRequests: { totalCount: 1 },
    }));

    expect(summary).toMatchObject({
      approvalCount: 2,
      label: "2 approvals · 1 pending",
      pendingCount: 1,
      status: "partially-approved",
      tooltip: "Approved by: lead-dev, review-bot",
    });
  });

  it("uses an unknown label when an approved author is inaccessible", () => {
    const summary = getPRReviewSummary(createPR("APP-100", {
      latestOpinionatedReviews: {
        nodes: [{
          author: null,
          state: "APPROVED",
          submittedAt: "2026-06-18T10:00:00.000Z",
        }],
      },
      reviewDecision: "REVIEW_REQUIRED",
      reviewRequests: { totalCount: 1 },
    }));

    expect(summary.tooltip).toBe("Approved by: Unknown reviewer");
    expect(summary.status).toBe("partially-approved");
  });

  it("preserves draft, changes requested and full approval precedence", () => {
    const approval = {
      nodes: [{
        author: { login: "reviewer" },
        state: "APPROVED" as const,
        submittedAt: "2026-06-18T10:00:00.000Z",
      }],
    };

    expect(getPRReviewSummary(createPR("APP-1", {
      isDraft: true,
      latestOpinionatedReviews: approval,
    })).status).toBe("draft");
    expect(getPRReviewSummary(createPR("APP-2", {
      latestOpinionatedReviews: approval,
      reviewDecision: "CHANGES_REQUESTED",
    })).status).toBe("changes-requested");
    expect(getPRReviewSummary(createPR("APP-3", {
      latestOpinionatedReviews: approval,
      reviewDecision: "APPROVED",
    })).status).toBe("approved");
    expect(getPRReviewSummary(createPR("APP-4")).status).toBe("pending-review");
  });
});
