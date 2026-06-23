import type {
  GitHubPR,
  GitHubPRResponsePayload,
  GitHubSearchResponse,
  GitHubWarning,
} from "../src/types/github";
import type { GitHubServerConfig } from "./config";

const SEARCH_PRS_QUERY = `
  query SearchPullRequests(
    $authoredSearchQuery: String!,
    $authoredSearchLimit: Int!,
    $reviewedSearchQuery: String!,
    $reviewedSearchLimit: Int!,
    $reviewRequestedSearchQuery: String!,
    $reviewRequestedSearchLimit: Int!,
  ) {
    authored: search(query: $authoredSearchQuery, type: ISSUE, first: $authoredSearchLimit) {
      nodes {
        ... on PullRequest {
          number title url headRefName mergeable reviewDecision isDraft updatedAt
          author { login }
          repository { name owner { login } }
          changesRequestedReviews: reviews(last: 1, states: CHANGES_REQUESTED) {
            nodes { submittedAt }
          }
          latestOpinionatedReviews(first: 50) {
            nodes { state submittedAt author { login } }
          }
          latestCommits: commits(last: 1) {
            nodes { commit { committedDate } }
          }
          reviewRequests(first: 50) { totalCount }
          reviewThreads(first: 50) {
            nodes {
              isResolved isOutdated
              comments(first: 1) { nodes { author { login } createdAt } }
            }
          }
        }
      }
    }
    reviewed: search(
      query: $reviewedSearchQuery,
      type: ISSUE,
      first: $reviewedSearchLimit,
    ) {
      nodes {
        ... on PullRequest {
          number title url headRefName mergeable reviewDecision isDraft updatedAt
          author { login }
          repository { name owner { login } }
          changesRequestedReviews: reviews(last: 1, states: CHANGES_REQUESTED) {
            nodes { submittedAt }
          }
          latestOpinionatedReviews(first: 50) {
            nodes { state submittedAt author { login } }
          }
          latestCommits: commits(last: 1) {
            nodes { commit { committedDate } }
          }
          reviewRequests(first: 50) { totalCount }
          reviewThreads(first: 50) {
            nodes {
              isResolved isOutdated
              comments(first: 1) { nodes { author { login } createdAt } }
            }
          }
        }
      }
    }
    reviewRequested: search(
      query: $reviewRequestedSearchQuery,
      type: ISSUE,
      first: $reviewRequestedSearchLimit,
    ) {
      nodes {
        ... on PullRequest {
          number title url headRefName mergeable reviewDecision isDraft updatedAt
          author { login }
          repository { name owner { login } }
          changesRequestedReviews: reviews(last: 1, states: CHANGES_REQUESTED) {
            nodes { submittedAt }
          }
          latestOpinionatedReviews(first: 50) {
            nodes { state submittedAt author { login } }
          }
          latestCommits: commits(last: 1) {
            nodes { commit { committedDate } }
          }
          reviewRequests(first: 50) { totalCount }
          reviewThreads(first: 50) {
            nodes {
              isResolved isOutdated
              comments(first: 1) { nodes { author { login } createdAt } }
            }
          }
        }
      }
    }
  }
`;

export class GitHubProxyError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isPermissionError(message: string): boolean {
  return message === "Resource not accessible by personal access token";
}

function isSearchResponse(value: unknown): value is GitHubSearchResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as GitHubSearchResponse;
  return (
    Array.isArray(response.errors) ||
    (
      Array.isArray(response.data?.authored.nodes) &&
      Array.isArray(response.data?.reviewed.nodes) &&
      Array.isArray(response.data?.reviewRequested.nodes)
    )
  );
}

function mergePullRequests(
  authored: GitHubPR[],
  reviewed: GitHubPR[],
  reviewRequested: GitHubPR[],
): GitHubPR[] {
  const merged = new Map<string, GitHubPR>();

  const upsert = (
    pr: GitHubPR,
    context: "authored" | "reviewRequested" | "reviewed",
  ) => {
    const existing = merged.get(pr.url);
    merged.set(pr.url, {
      ...existing,
      ...pr,
      searchContexts: {
        authored:
          (existing?.searchContexts?.authored ?? false) ||
          context === "authored",
        reviewed:
          (existing?.searchContexts?.reviewed ?? false) ||
          context === "reviewed",
        reviewRequested:
          (existing?.searchContexts?.reviewRequested ?? false) ||
          context === "reviewRequested",
      },
    });
  };

  for (const pr of authored) {
    upsert(pr, "authored");
  }
  for (const pr of reviewed) {
    upsert(pr, "reviewed");
  }
  for (const pr of reviewRequested) {
    upsert(pr, "reviewRequested");
  }

  return [...merged.values()];
}

function getErrorMessages(data: GitHubSearchResponse): string[] {
  return data.errors?.map(({ message }) => message) ?? [];
}

export async function fetchGitHubPRs(
  config: GitHubServerConfig,
  request: typeof fetch = fetch,
): Promise<GitHubPRResponsePayload> {
  const response = await request("https://api.github.com/graphql", {
    body: JSON.stringify({
      query: SEARCH_PRS_QUERY,
      variables: {
        authoredSearchLimit: config.authoredSearchLimit,
        authoredSearchQuery: [
          "type:pr",
          "state:open",
          `author:${config.username}`,
          ...config.searchScopes,
        ].join(" "),
        reviewedSearchLimit: config.reviewRequestedSearchLimit,
        reviewedSearchQuery: [
          "type:pr",
          "state:open",
          `reviewed-by:${config.username}`,
          ...config.searchScopes,
        ].join(" "),
        reviewRequestedSearchLimit: config.reviewRequestedSearchLimit,
        reviewRequestedSearchQuery: [
          "type:pr",
          "state:open",
          `review-requested:${config.username}`,
          ...config.searchScopes,
        ].join(" "),
      },
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GitHubProxyError("GitHub returned an invalid response.", 502);
  }

  if (!isSearchResponse(data)) {
    throw new GitHubProxyError("GitHub returned an invalid response.", 502);
  }

  const errors = getErrorMessages(data);
  const hasPartialData =
    Array.isArray(data.data?.authored.nodes) &&
    Array.isArray(data.data?.reviewed.nodes) &&
    Array.isArray(data.data?.reviewRequested.nodes);
  const onlyPermissionErrors =
    errors.length > 0 && errors.every(isPermissionError);

  if (!response.ok || (errors.length > 0 && !(hasPartialData && onlyPermissionErrors))) {
    throw new GitHubProxyError(
      errors.join(" ") || `GitHub request failed with status ${response.status}.`,
      response.status,
    );
  }

  const warnings: GitHubWarning[] = [];
  if (hasPartialData && onlyPermissionErrors) {
    const scopeHint = config.searchScopes.length > 0
      ? ` Scope: ${config.searchScopes.join(", ")}.`
      : "";
    warnings.push({
      code: "review-queue-access-limited",
      message:
        "Review queue is limited by GitHub token access for one or more repositories in the configured search scope." +
        scopeHint,
    });
  }

  return {
    prs: mergePullRequests(
      data.data?.authored.nodes.filter((pr): pr is GitHubPR => pr !== null) ?? [],
      data.data?.reviewed.nodes.filter((pr): pr is GitHubPR => pr !== null) ?? [],
      data.data?.reviewRequested.nodes.filter((pr): pr is GitHubPR => pr !== null) ?? [],
    ),
    warnings,
  };
}
