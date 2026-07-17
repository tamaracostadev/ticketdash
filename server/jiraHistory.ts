import type { JiraServerConfig } from "./config.ts";
import { JiraProxyError } from "./jira.ts";
import type {
  JiraChangelogHistory,
  JiraChangelogResponse,
  JiraDirectClosure,
} from "../src/types/jira.ts";

interface JiraIssueReference {
  key: string;
}

interface JiraHistorySearchResponse {
  isLast?: boolean;
  issues: JiraIssueReference[];
  nextPageToken?: string;
}

interface JiraCurrentUser {
  accountId: string;
}

const CHANGELOG_PAGE_SIZE = 100;

function getHeaders(config: JiraServerConfig): Record<string, string> {
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return { Accept: "application/json", Authorization: `Basic ${token}` };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHistorySearchResponse(value: unknown): value is JiraHistorySearchResponse {
  return isObject(value) &&
    Array.isArray(value.issues) &&
    value.issues.every((issue) => isObject(issue) && typeof issue.key === "string");
}

function isCurrentUser(value: unknown): value is JiraCurrentUser {
  return isObject(value) && typeof value.accountId === "string";
}

function isChangelogHistory(value: unknown): value is JiraChangelogHistory {
  return isObject(value) &&
    typeof value.created === "string" &&
    isObject(value.author) &&
    typeof value.author.accountId === "string" &&
    typeof value.author.displayName === "string" &&
    Array.isArray(value.items) &&
    value.items.every((item) =>
      isObject(item) &&
      typeof item.field === "string" &&
      (item.fromString === null || typeof item.fromString === "string") &&
      (item.toString === null || typeof item.toString === "string")
    );
}

function isChangelogResponse(value: unknown): value is JiraChangelogResponse {
  return isObject(value) &&
    typeof value.startAt === "number" &&
    typeof value.maxResults === "number" &&
    typeof value.total === "number" &&
    Array.isArray(value.values) &&
    value.values.every(isChangelogHistory);
}

async function requestJson(
  config: JiraServerConfig,
  url: URL,
  request: typeof fetch,
): Promise<unknown> {
  const response = await request(url, { headers: getHeaders(config) });
  if (!response.ok) {
    throw new JiraProxyError(
      `Jira history request failed with status ${response.status}.`,
      response.status,
    );
  }
  return response.json();
}

function quoteJql(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function formatJqlDate(timestamp: string): string {
  return timestamp.slice(0, 16).replace("T", " ");
}

function buildHistoryJql(
  config: JiraServerConfig,
  finalizedStatuses: string[],
  startAt: string,
  endAt: string,
): string {
  const range = `DURING (${quoteJql(formatJqlDate(startAt))}, ${quoteJql(formatJqlDate(endAt))})`;
  const transitions = finalizedStatuses.map((status) =>
    `status CHANGED TO ${quoteJql(status)} BY currentUser() ${range}`
  );
  const clauses = [`(${transitions.join(" OR ")})`];
  if (config.projectKeys.length > 0) {
    clauses.unshift(`project in (${config.projectKeys.join(", ")})`);
  }
  return `${clauses.join(" AND ")} ORDER BY updated DESC`;
}

async function fetchCandidateKeys(
  config: JiraServerConfig,
  finalizedStatuses: string[],
  startAt: string,
  endAt: string,
  request: typeof fetch,
): Promise<string[]> {
  const keys = new Set<string>();
  let nextPageToken: string | undefined;
  do {
    const url = new URL(`${config.url}/rest/api/3/search/jql`);
    url.searchParams.set(
      "jql",
      buildHistoryJql(config, finalizedStatuses, startAt, endAt),
    );
    url.searchParams.set("fields", "key");
    url.searchParams.set("maxResults", String(config.issueSearchLimit));
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);
    const data = await requestJson(config, url, request);
    if (!isHistorySearchResponse(data)) {
      throw new JiraProxyError("Jira returned an invalid history search response.", 502);
    }
    for (const issue of data.issues) keys.add(issue.key);
    nextPageToken = data.isLast === false ? data.nextPageToken : undefined;
  } while (nextPageToken);
  return [...keys];
}

async function fetchChangelog(
  config: JiraServerConfig,
  ticketKey: string,
  request: typeof fetch,
): Promise<JiraChangelogHistory[]> {
  const histories: JiraChangelogHistory[] = [];
  let startAt = 0;
  while (true) {
    const url = new URL(`${config.url}/rest/api/3/issue/${ticketKey}/changelog`);
    url.searchParams.set("startAt", String(startAt));
    url.searchParams.set("maxResults", String(CHANGELOG_PAGE_SIZE));
    const data = await requestJson(config, url, request);
    if (!isChangelogResponse(data)) {
      throw new JiraProxyError("Jira returned an invalid changelog response.", 502);
    }
    histories.push(...data.values);
    startAt = data.startAt + data.maxResults;
    if (startAt >= data.total || data.values.length === 0) return histories;
  }
}

export async function fetchJiraDirectClosures(
  config: JiraServerConfig,
  finalizedStatuses: string[],
  startAt: string,
  endAt: string,
  request: typeof fetch = fetch,
): Promise<JiraDirectClosure[]> {
  if (finalizedStatuses.length === 0) return [];
  const myselfUrl = new URL(`${config.url}/rest/api/3/myself`);
  const currentUser = await requestJson(config, myselfUrl, request);
  if (!isCurrentUser(currentUser)) {
    throw new JiraProxyError("Jira returned an invalid current user response.", 502);
  }
  const keys = await fetchCandidateKeys(
    config,
    finalizedStatuses,
    startAt,
    endAt,
    request,
  );
  const finalized = new Set(finalizedStatuses.map((status) => status.toLowerCase()));
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  const closures: JiraDirectClosure[] = [];

  for (const ticketKey of keys) {
    const histories = await fetchChangelog(config, ticketKey, request);
    for (const history of histories) {
      const occurredAtMs = Date.parse(history.created);
      if (
        history.author.accountId !== currentUser.accountId ||
        !Number.isFinite(occurredAtMs) ||
        occurredAtMs < startMs ||
        occurredAtMs >= endMs
      ) continue;
      for (const item of history.items) {
        if (
          item.field !== "status" ||
          item.fromString === null ||
          item.toString === null ||
          !finalized.has(item.toString.toLowerCase())
        ) continue;
        closures.push({
          fromStatus: item.fromString,
          occurredAt: new Date(occurredAtMs).toISOString(),
          ticketKey,
          toStatus: item.toString,
        });
      }
    }
  }
  return closures.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
}
