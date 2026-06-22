import type {
  JiraIssue,
  JiraTransitionAssistantState,
} from "../types/jira";

function isJiraIssues(value: unknown): value is JiraIssue[] {
  return Array.isArray(value);
}

function isJiraTransitionAssistantState(
  value: unknown,
): value is JiraTransitionAssistantState {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).available === "boolean" &&
    (
      (value as Record<string, unknown>).reason === null ||
      typeof (value as Record<string, unknown>).reason === "string"
    ) &&
    (
      (value as Record<string, unknown>).transition === null ||
      (
        typeof (value as Record<string, unknown>).transition === "object" &&
        (value as Record<string, unknown>).transition !== null
      )
    );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

export async function fetchJiraIssues(
  request: typeof fetch = fetch,
): Promise<JiraIssue[]> {
  const response = await request("/api/jira/issues");
  const data: unknown = await readJson(response);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      typeof (data as Record<string, unknown>).message === "string"
        ? (data as Record<string, string>).message
        : "Jira integration failed.";
    throw new Error(message);
  }

  if (!isJiraIssues(data)) {
    throw new Error("Jira returned an invalid response.");
  }

  return data;
}

export async function fetchJiraTransitionAssistant(
  ticketKey: string,
  request: typeof fetch = fetch,
): Promise<JiraTransitionAssistantState> {
  const response = await request(
    `/api/jira/issues/${encodeURIComponent(ticketKey)}/transition-assistant`,
  );
  const data: unknown = await readJson(response);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      typeof (data as Record<string, unknown>).message === "string"
        ? (data as Record<string, string>).message
        : "Jira transition assistant unavailable.";
    throw new Error(message);
  }

  if (!isJiraTransitionAssistantState(data)) {
    throw new Error("Jira returned an invalid response.");
  }

  return data;
}

export async function executeJiraTransitionAssistant(
  ticketKey: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(
    `/api/jira/issues/${encodeURIComponent(ticketKey)}/transition-assistant/execute`,
    { method: "POST" },
  );
  if (response.ok) return;
  const data: unknown = await readJson(response);
  const message =
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).message === "string"
      ? (data as Record<string, string>).message
      : "Jira transition assistant failed.";
  throw new Error(message);
}
