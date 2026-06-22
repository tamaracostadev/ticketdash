import { describe, expect, it } from "vitest";

import { createDashboardData } from "../../src/utils/dashboard";
import { createTicketCardViewModel } from "../../src/utils/ticketCard";
import { createIssue, createPR } from "../fixtures/domain";

describe("multi-repository pull requests", () => {
  it("aggregates signals and keeps actions attached to their source PR", () => {
    const admin = createPR("APP-100", {
      changesRequestedReviews: {
        nodes: [{ submittedAt: "2026-06-18T10:00:00.000Z" }],
      },
      number: 10,
      repository: { name: "admin", owner: { login: "org" } },
      reviewDecision: "CHANGES_REQUESTED",
      reviewThreads: {
        nodes: [{
          comments: { nodes: [] },
          isOutdated: false,
          isResolved: false,
        }],
      },
      url: "https://github.example/admin/pull/10",
    });
    const backend = createPR("APP-100", {
      mergeable: "CONFLICTING",
      number: 20,
      repository: { name: "backend", owner: { login: "org" } },
      url: "https://github.example/backend/pull/20",
    });

    const data = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      [backend, admin],
      {},
    );
    const ticket = data.tickets[0];

    expect(ticket.prs.map(({ pr }) => pr.repository.name)).toEqual([
      "admin",
      "backend",
    ]);
    expect(ticket.hasConflict).toBe(true);
    expect(ticket.openThreadCount).toBe(1);
    expect(ticket.priority.reasons.map(({ type }) => type)).toContain(
      "merge-conflict",
    );
    expect(data.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        href: backend.url,
        type: "conflict",
      }),
      expect.objectContaining({
        href: admin.url,
        type: "changes-requested",
      }),
      expect.objectContaining({
        href: admin.url,
        type: "thread",
      }),
    ]));
  });

  it("builds one presentation entry for each repository", () => {
    const prs = [
      createPR("APP-100", {
        latestOpinionatedReviews: {
          nodes: [{
            author: { login: "lead-dev" },
            state: "APPROVED",
            submittedAt: "2026-06-18T10:00:00.000Z",
          }],
        },
        number: 10,
        repository: { name: "admin", owner: { login: "org" } },
        reviewRequests: { totalCount: 1 },
        url: "https://github.example/admin/pull/10",
      }),
      createPR("APP-100", {
        mergeable: "CONFLICTING",
        number: 20,
        repository: { name: "backend", owner: { login: "org" } },
        url: "https://github.example/backend/pull/20",
      }),
    ];
    const ticket = createDashboardData(
      [createIssue("APP-100", "Code Review")],
      prs,
      {},
    ).tickets[0];

    expect(createTicketCardViewModel(ticket, []).prs).toEqual([
      expect.objectContaining({
        label: "1 approval · 1 pending",
        number: 10,
        repository: "admin",
        tooltip: "Approved by: lead-dev",
      }),
      expect.objectContaining({
        hasConflict: true,
        number: 20,
        repository: "backend",
      }),
    ]);
  });
});
