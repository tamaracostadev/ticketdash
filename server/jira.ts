import type {
  JiraIssue,
  JiraSearchResponse,
  JiraTransition,
  JiraTransitionAssistantState,
  JiraTransitionsResponse,
} from "../src/types/jira";
import type { JiraServerConfig } from "./config";

const FIELDS = ["summary", "status", "comment", "updated"];

function getJql(projectKeys: string[]): string {
  const clauses = ["assignee = currentUser()"];
  if (projectKeys.length > 0) {
    clauses.push(`project in (${projectKeys.join(", ")})`);
  }
  clauses.push("statusCategory not in (Done)", "ORDER BY updated DESC");
  return clauses.join(" AND ").replace("AND ORDER BY", "ORDER BY");
}

interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

function getAuthHeader(config: JiraServerConfig): string {
  return `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
}

function toPublicIssue(issue: JiraIssue): JiraIssue {
  return {
    id: issue.id,
    key: issue.key,
    self: issue.self,
    fields: {
      comment: {
        comments: issue.fields.comment.comments.map((comment) => ({
          id: comment.id,
          author: {
            accountId: comment.author.accountId,
            displayName: comment.author.displayName,
          },
          created: comment.created,
          updated: comment.updated,
        })),
        maxResults: issue.fields.comment.maxResults,
        startAt: issue.fields.comment.startAt,
        total: issue.fields.comment.total,
      },
      status: {
        id: issue.fields.status.id,
        name: issue.fields.status.name,
        statusCategory: {
          key: issue.fields.status.statusCategory.key,
          name: issue.fields.status.statusCategory.name,
        },
      },
      summary: issue.fields.summary,
      updated: issue.fields.updated,
    },
  };
}

function isTransition(value: unknown): value is JiraTransition {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).id === "string" &&
    typeof (value as Record<string, unknown>).name === "string" &&
    typeof (value as Record<string, unknown>).to === "object" &&
    (value as Record<string, unknown>).to !== null &&
    typeof ((value as Record<string, unknown>).to as Record<string, unknown>).id === "string" &&
    typeof ((value as Record<string, unknown>).to as Record<string, unknown>).name === "string";
}

function isTransitionsResponse(value: unknown): value is JiraTransitionsResponse {
  const transitions = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>).transitions
    : null;
  return typeof value === "object" &&
    value !== null &&
    Array.isArray(transitions) &&
    transitions.every(isTransition);
}

function matchesDevelopmentStatus(
  transition: JiraTransition,
  developmentStatuses: string[],
): boolean {
  return developmentStatuses.some(
    (status) => status.toLowerCase() === transition.to.name.toLowerCase(),
  );
}

export class JiraProxyError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isSearchResponse(value: unknown): value is JiraSearchResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).issues)
  );
}

async function getErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as JiraErrorResponse;
    const messages = [
      ...(data.errorMessages ?? []),
      ...Object.values(data.errors ?? {}),
    ];
    return messages.length > 0 ? messages.join(" ") : null;
  } catch {
    return null;
  }
}

export async function fetchJiraIssues(
  config: JiraServerConfig,
  request: typeof fetch = fetch,
): Promise<JiraIssue[]> {
  const url = new URL(`${config.url}/rest/api/3/search/jql`);
  url.searchParams.set("jql", getJql(config.projectKeys));
  url.searchParams.set("fields", FIELDS.join(","));
  url.searchParams.set("maxResults", "50");

  const response = await request(url, {
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(config),
    },
  });

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new JiraProxyError(
      detail ?? `Jira request failed with status ${response.status}.`,
      response.status,
    );
  }

  const data: unknown = await response.json();
  if (!isSearchResponse(data)) {
    throw new JiraProxyError("Jira returned an invalid response.", 502);
  }

  return data.issues.map(toPublicIssue);
}

export async function fetchJiraTransitions(
  config: JiraServerConfig,
  ticketKey: string,
  request: typeof fetch = fetch,
): Promise<JiraTransition[]> {
  const url = new URL(`${config.url}/rest/api/3/issue/${ticketKey}/transitions`);
  const response = await request(url, {
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(config),
    },
  });

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new JiraProxyError(
      detail ?? `Jira request failed with status ${response.status}.`,
      response.status,
    );
  }

  const data: unknown = await response.json();
  if (!isTransitionsResponse(data)) {
    throw new JiraProxyError("Jira returned an invalid response.", 502);
  }

  return data.transitions;
}

export function getJiraTransitionAssistantState(
  transitions: JiraTransition[],
  developmentStatuses: string[],
): JiraTransitionAssistantState {
  if (developmentStatuses.length === 0) {
    return {
      available: false,
      reason: "No development statuses are configured for this dashboard.",
      transition: null,
    };
  }

  const candidates = transitions.filter((transition) =>
    matchesDevelopmentStatus(transition, developmentStatuses)
  );

  if (candidates.length === 1) {
    return {
      available: true,
      reason: null,
      transition: candidates[0],
    };
  }

  if (candidates.length > 1) {
    return {
      available: false,
      reason: "Multiple direct Jira transitions to development are available.",
      transition: null,
    };
  }

  return {
    available: false,
    reason: "No direct Jira transition back to development is available for this ticket workflow.",
    transition: null,
  };
}

export async function executeJiraTransition(
  config: JiraServerConfig,
  ticketKey: string,
  transitionId: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const url = new URL(`${config.url}/rest/api/3/issue/${ticketKey}/transitions`);
  const response = await request(url, {
    body: JSON.stringify({ transition: { id: transitionId } }),
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(config),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new JiraProxyError(
      detail ?? `Jira request failed with status ${response.status}.`,
      response.status,
    );
  }
}
