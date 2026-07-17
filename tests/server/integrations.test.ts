import { describe, expect, it, vi } from "vitest";

import { getIntegrationConfig } from "../../server/config";
import { fetchGitHubPRs } from "../../server/github";
import {
  fetchJiraIssues,
  fetchJiraTransitions,
  getJiraTransitionAssistantState,
} from "../../server/jira";
import { fetchJiraDirectClosures } from "../../server/jiraHistory";
import { createIssue, createPR } from "../fixtures/domain";

describe("generic integration configuration", () => {
  it("parses projects, prefixes, scopes and workflow groups", () => {
    const config = getIntegrationConfig({
      GITHUB_AUTHORED_PRS_LIMIT: "45",
      GITHUB_REVIEW_REQUESTED_PRS_LIMIT: "20",
      GITHUB_SEARCH_SCOPES: "org:example, repo:owner/service",
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
      JIRA_API_TOKEN: "token",
      JIRA_EMAIL: "user@example.com",
      JIRA_ISSUES_LIMIT: "75",
      JIRA_PROJECT_KEYS: "app, ops",
      JIRA_URL: "https://example.atlassian.net",
      TICKET_KEY_PREFIXES: "app,ops",
      WORKFLOW_TESTING_STATUSES: "Testing,In QA",
    });

    expect(config.jira?.projectKeys).toEqual(["APP", "OPS"]);
    expect(config.jira?.issueSearchLimit).toBe(75);
    expect(config.github?.authoredSearchLimit).toBe(45);
    expect(config.github?.reviewRequestedSearchLimit).toBe(20);
    expect(config.github?.searchScopes).toEqual([
      "org:example",
      "repo:owner/service",
    ]);
    expect(config.public.githubUsername).toBe("user");
    expect(config.public.ticketKeyPrefixes).toEqual(["APP", "OPS"]);
    expect(config.public.workflowStatuses.testing).toEqual([
      "In QA",
      "QA In Progress",
      "Test",
      "Test In Progress",
      "Testing",
    ]);
  });

  it("appends configured workflow statuses to the built-in defaults", () => {
    const config = getIntegrationConfig({
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
      WORKFLOW_TESTING_STATUSES: "QA Review,Testing, In QA ",
    });

    expect(config.public.workflowStatuses.testing).toEqual([
      "In QA",
      "QA In Progress",
      "Test",
      "Test In Progress",
      "Testing",
      "QA Review",
    ]);
  });

  it("rejects unsafe project keys and GitHub qualifiers", () => {
    expect(() => getIntegrationConfig({
      JIRA_PROJECT_KEYS: "APP) OR status = Done",
    })).toThrow("invalid Jira project key");
    expect(() => getIntegrationConfig({
      GITHUB_SEARCH_SCOPES: "is:public",
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
    })).toThrow("invalid qualifier");
    expect(() => getIntegrationConfig({
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
      GITHUB_AUTHORED_PRS_LIMIT: "0",
    })).toThrow("positive integer");
  });
});

describe("generated provider queries", () => {
  it("adds configured Jira projects and omits the clause when empty", async () => {
    const request = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ issues: [createIssue()] })))
    );
    const base = {
      apiToken: "token",
      email: "user@example.com",
      issueSearchLimit: 75,
      url: "https://example.atlassian.net",
    };

    await fetchJiraIssues({ ...base, projectKeys: ["APP", "OPS"] }, request);
    expect(String(request.mock.calls[0]?.[0])).toContain(
      "project+in+%28APP%2C+OPS%29",
    );
    expect(String(request.mock.calls[0]?.[0])).toContain("maxResults=75");

    await fetchJiraIssues({ ...base, projectKeys: [] }, request);
    expect(String(request.mock.calls[1]?.[0])).not.toContain("project+in");
  });

  it("loads paginated direct-closure changelog entries with exact timestamps", async () => {
    const request = vi.fn().mockImplementation((input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/myself")) {
        return Promise.resolve(new Response(JSON.stringify({ accountId: "user-1" })));
      }
      if (url.pathname.endsWith("/search/jql")) {
        const next = url.searchParams.get("nextPageToken");
        return Promise.resolve(new Response(JSON.stringify(next
          ? { isLast: true, issues: [{ key: "APP-200" }] }
          : {
            isLast: false,
            issues: [{ key: "APP-100" }],
            nextPageToken: "page-2",
          })));
      }
      const ticketKey = url.pathname.includes("APP-100") ? "APP-100" : "APP-200";
      return Promise.resolve(new Response(JSON.stringify({
        maxResults: 100,
        startAt: 0,
        total: 1,
        values: [{
          author: { accountId: "user-1", displayName: "User" },
          created: ticketKey === "APP-100"
            ? "2026-07-15T19:50:21.806Z"
            : "2026-07-15T21:25:00.976Z",
          items: [{
            field: "status",
            fromString: ticketKey === "APP-100" ? "Dev" : "Open",
            toString: "Closed",
          }],
        }],
      })));
    });
    const config = {
      apiToken: "token",
      email: "user@example.com",
      issueSearchLimit: 50,
      projectKeys: ["APP"],
      url: "https://example.atlassian.net",
    };

    const closures = await fetchJiraDirectClosures(
      config,
      ["Closed", 'Done "Verified"'],
      "2026-07-15T00:00:00.000Z",
      "2026-07-16T00:00:00.000Z",
      request,
    );

    expect(closures).toEqual([
      {
        fromStatus: "Dev",
        occurredAt: "2026-07-15T19:50:21.806Z",
        ticketKey: "APP-100",
        toStatus: "Closed",
      },
      {
        fromStatus: "Open",
        occurredAt: "2026-07-15T21:25:00.976Z",
        ticketKey: "APP-200",
        toStatus: "Closed",
      },
    ]);
    const searchCalls = request.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/search/jql"));
    expect(searchCalls).toHaveLength(2);
    expect(searchCalls[1]?.searchParams.get("nextPageToken")).toBe("page-2");
    expect(searchCalls[0]?.searchParams.get("jql")).toContain(
      'status CHANGED TO "Done \\"Verified\\"" BY currentUser()',
    );
  });

  it("loads Jira transitions and resolves a single safe development candidate", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transitions: [
        {
          id: "11",
          name: "Back to development",
          to: { id: "101", name: "Development" },
        },
        {
          id: "12",
          name: "Send to QA",
          to: { id: "102", name: "Testing" },
        },
      ],
    })));
    const base = {
      apiToken: "token",
      email: "user@example.com",
      issueSearchLimit: 50,
      projectKeys: [],
      url: "https://example.atlassian.net",
    };

    const transitions = await fetchJiraTransitions(base, "APP-100", request);
    expect(String(request.mock.calls[0]?.[0])).toContain(
      "/rest/api/3/issue/APP-100/transitions",
    );
    expect(
      getJiraTransitionAssistantState(transitions, ["Development"]),
    ).toEqual({
      available: true,
      reason: null,
      transition: {
        id: "11",
        name: "Back to development",
        to: { id: "101", name: "Development" },
      },
    });
  });

  it("blocks the assistant when multiple direct development transitions exist", () => {
    expect(getJiraTransitionAssistantState([
      {
        id: "11",
        name: "Back to dev",
        to: { id: "101", name: "Development" },
      },
      {
        id: "12",
        name: "Resume dev",
        to: { id: "102", name: "Development" },
      },
    ], ["Development"])).toEqual({
      available: false,
      reason: "Multiple direct Jira transitions to development are available.",
      transition: null,
    });
  });

  it("adds optional GitHub scopes to the PR search", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        authored: { nodes: [createPR()] },
        reviewed: { nodes: [] },
        reviewRequested: { nodes: [] },
      },
    })));
    await fetchGitHubPRs({
      authoredSearchLimit: 40,
      reviewRequestedSearchLimit: 12,
      searchScopes: ["org:example", "repo:owner/service"],
      token: "token",
      username: "user",
    }, request);

    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body)) as {
      query: string;
      variables: {
        authoredSearchLimit: number;
        authoredSearchQuery: string;
        reviewedSearchLimit: number;
        reviewedSearchQuery: string;
        reviewRequestedSearchLimit: number;
        reviewRequestedSearchQuery: string;
      };
    };
    expect(body.variables.authoredSearchLimit).toBe(40);
    expect(body.variables.authoredSearchQuery).toContain(
      "author:user org:example repo:owner/service",
    );
    expect(body.variables.reviewRequestedSearchLimit).toBe(12);
    expect(body.variables.reviewRequestedSearchQuery).toContain(
      "review-requested:user org:example repo:owner/service",
    );
    expect(body.variables.reviewedSearchLimit).toBe(12);
    expect(body.variables.reviewedSearchQuery).toContain(
      "reviewed-by:user org:example repo:owner/service",
    );
    expect(body.query).toContain("latestOpinionatedReviews");
    expect(body.query).toContain("reviewRequests(first: 50) { totalCount }");
    expect(body.query).toContain("latestCommits: commits(last: 1)");
  });

  it("keeps authored PRs when review-requested search returns permission errors", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        authored: { nodes: [createPR("APP-100")] },
        reviewed: { nodes: [] },
        reviewRequested: { nodes: [] },
      },
      errors: [
        { message: "Resource not accessible by personal access token" },
        { message: "Resource not accessible by personal access token" },
      ],
    })));

    await expect(fetchGitHubPRs({
      authoredSearchLimit: 30,
      reviewRequestedSearchLimit: 30,
      searchScopes: [],
      token: "token",
      username: "user",
    }, request)).resolves.toEqual({
      prs: [
        expect.objectContaining({
          headRefName: "APP-100",
          searchContexts: {
            authored: true,
            reviewed: false,
            reviewRequested: false,
          },
        }),
      ],
      warnings: [
        expect.objectContaining({
          code: "review-queue-access-limited",
        }),
      ],
    });
  });
});
