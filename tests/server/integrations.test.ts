import { describe, expect, it, vi } from "vitest";

import { getIntegrationConfig } from "../../server/config";
import { fetchGitHubPRs } from "../../server/github";
import {
  fetchJiraIssues,
  fetchJiraTransitions,
  getJiraTransitionAssistantState,
} from "../../server/jira";
import { createIssue, createPR } from "../fixtures/domain";

describe("generic integration configuration", () => {
  it("parses projects, prefixes, scopes and workflow groups", () => {
    const config = getIntegrationConfig({
      GITHUB_SEARCH_SCOPES: "org:example, repo:owner/service",
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
      JIRA_API_TOKEN: "token",
      JIRA_EMAIL: "user@example.com",
      JIRA_PROJECT_KEYS: "app, ops",
      JIRA_URL: "https://example.atlassian.net",
      TICKET_KEY_PREFIXES: "app,ops",
      WORKFLOW_TESTING_STATUSES: "Testing,In QA",
    });

    expect(config.jira?.projectKeys).toEqual(["APP", "OPS"]);
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
      url: "https://example.atlassian.net",
    };

    await fetchJiraIssues({ ...base, projectKeys: ["APP", "OPS"] }, request);
    expect(String(request.mock.calls[0]?.[0])).toContain(
      "project+in+%28APP%2C+OPS%29",
    );

    await fetchJiraIssues({ ...base, projectKeys: [] }, request);
    expect(String(request.mock.calls[1]?.[0])).not.toContain("project+in");
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
        reviewRequested: { nodes: [] },
      },
    })));
    await fetchGitHubPRs({
      searchScopes: ["org:example", "repo:owner/service"],
      token: "token",
      username: "user",
    }, request);

    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body)) as {
      query: string;
      variables: {
        authoredSearchQuery: string;
        reviewRequestedSearchQuery: string;
      };
    };
    expect(body.variables.authoredSearchQuery).toContain(
      "author:user org:example repo:owner/service",
    );
    expect(body.variables.reviewRequestedSearchQuery).toContain(
      "review-requested:user org:example repo:owner/service",
    );
    expect(body.query).toContain("latestOpinionatedReviews");
    expect(body.query).toContain("reviewRequests(first: 50) { totalCount }");
    expect(body.query).toContain("latestCommits: commits(last: 1)");
  });

  it("keeps authored PRs when review-requested search returns permission errors", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        authored: { nodes: [createPR("APP-100")] },
        reviewRequested: { nodes: [] },
      },
      errors: [
        { message: "Resource not accessible by personal access token" },
        { message: "Resource not accessible by personal access token" },
      ],
    })));

    await expect(fetchGitHubPRs({
      searchScopes: [],
      token: "token",
      username: "user",
    }, request)).resolves.toEqual({
      prs: [
        expect.objectContaining({
          headRefName: "APP-100",
          searchContexts: {
            authored: true,
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
