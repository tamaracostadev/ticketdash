import { describe, expect, it } from "vitest";

import { hasUnreadComment } from "../../src/utils/comments";
import { linkPRsToTickets } from "../../src/utils/linkTickets";
import { createIssue, createPR } from "../fixtures/domain";

describe("ticket linking", () => {
  it("links PRs from branch or title and preserves unlinked PRs", () => {
    const issue = createIssue("APP-100");
    const linked = createPR("feature", { title: "APP-100 fix" });
    const unlinked = createPR("feature", { number: 200, title: "maintenance" });
    const result = linkPRsToTickets([issue], [linked, unlinked]);

    expect(result.prsByTicketId.get("APP-100")).toEqual([linked]);
    expect(result.unlinkedPRs).toEqual([unlinked]);
  });

  it("supports generic Jira prefixes", () => {
    const issue = createIssue("APP-42");
    const linked = createPR("feature/APP-42-dashboard");
    const result = linkPRsToTickets([issue], [linked], ["APP"]);

    expect(result.prsByTicketId.get("APP-42")).toEqual([linked]);
  });

  it("keeps every PR linked to a multi-repository ticket", () => {
    const issue = createIssue("APP-100");
    const admin = createPR("APP-100", {
      number: 10,
      repository: { name: "admin", owner: { login: "org" } },
      url: "https://github.example/admin/pull/10",
    });
    const backend = createPR("APP-100", {
      number: 20,
      repository: { name: "backend", owner: { login: "org" } },
      url: "https://github.example/backend/pull/20",
    });
    const result = linkPRsToTickets([issue], [admin, backend]);

    expect(result.prsByTicketId.get("APP-100")).toEqual([admin, backend]);
    expect(result.unlinkedPRs).toEqual([]);
  });
});

describe("unread Jira comments", () => {
  it("compares the latest comment with last seen", () => {
    const issue = createIssue("APP-100");
    issue.fields.comment.comments = [{
      author: { accountId: "1", displayName: "User" },
      created: "2026-06-15T09:00:00.000Z",
      id: "1",
      updated: "2026-06-15T10:00:00.000Z",
    }];

    expect(hasUnreadComment(issue, {})).toBe(true);
    expect(hasUnreadComment(issue, {
      "APP-100": "2026-06-15T11:00:00.000Z",
    })).toBe(false);
  });
});
