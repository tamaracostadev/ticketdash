import {
  readList,
  readPositiveInteger,
  readProjectKeys,
  readSearchScopes,
  readValue,
  type ServerEnv,
} from "./env.ts";
import {
  DEFAULT_WORKFLOW_STATUSES,
  resolveWorkflowStatuses,
} from "../src/config/workflow.ts";
import type { WorkflowStatusConfig } from "../src/types/integrations.ts";

export interface JiraServerConfig {
  apiToken: string;
  email: string;
  issueSearchLimit: number;
  projectKeys: string[];
  url: string;
}

export interface GitHubServerConfig {
  authoredSearchLimit: number;
  reviewRequestedSearchLimit: number;
  searchScopes: string[];
  token: string;
  username: string;
}

export interface PublicDashboardConfig {
  githubUsername: string;
  projectKeys: string[];
  ticketKeyPrefixes: string[];
  workflowStatuses: WorkflowStatusConfig;
}

export interface IntegrationConfig {
  github: GitHubServerConfig | null;
  jira: JiraServerConfig | null;
  public: PublicDashboardConfig;
}

export const EMPTY_PUBLIC_DASHBOARD_CONFIG: PublicDashboardConfig = {
  githubUsername: "",
  projectKeys: [],
  ticketKeyPrefixes: [],
  workflowStatuses: {
    backlog: [],
    codeReview: [],
    development: [],
    finalized: [],
    release: [],
    testing: [],
  },
};

function readJiraConfig(
  env: ServerEnv,
): JiraServerConfig | null {
  const apiToken = readValue(env, "JIRA_API_TOKEN");
  const email = readValue(env, "JIRA_EMAIL");
  const url = readValue(env, "JIRA_URL")?.replace(/\/+$/, "");

  if (!apiToken || !email || !url || !URL.canParse(url)) {
    return null;
  }

  return {
    apiToken,
    email,
    issueSearchLimit: readPositiveInteger(env, "JIRA_ISSUES_LIMIT", 50),
    projectKeys: readProjectKeys(env, "JIRA_PROJECT_KEYS"),
    url,
  };
}

function readGitHubConfig(
  env: ServerEnv,
): GitHubServerConfig | null {
  const token = readValue(env, "GITHUB_TOKEN");
  const username = readValue(env, "GITHUB_USERNAME");
  return token && username
    ? {
      authoredSearchLimit: readPositiveInteger(
        env,
        "GITHUB_AUTHORED_PRS_LIMIT",
        30,
      ),
      reviewRequestedSearchLimit: readPositiveInteger(
        env,
        "GITHUB_REVIEW_REQUESTED_PRS_LIMIT",
        30,
      ),
      searchScopes: readSearchScopes(env),
      token,
      username,
    }
    : null;
}

function readWorkflowConfig(
  env: ServerEnv,
): WorkflowStatusConfig {
  return resolveWorkflowStatuses({
    backlog: readList(env, "WORKFLOW_BACKLOG_STATUSES"),
    codeReview: readList(env, "WORKFLOW_CODE_REVIEW_STATUSES"),
    development: readList(env, "WORKFLOW_DEVELOPMENT_STATUSES"),
    finalized: readList(env, "WORKFLOW_FINALIZED_STATUSES"),
    release: readList(env, "WORKFLOW_RELEASE_STATUSES"),
    testing: readList(env, "WORKFLOW_TESTING_STATUSES"),
  });
}

export function getIntegrationConfig(
  env: ServerEnv,
): IntegrationConfig {
  const jira = readJiraConfig(env);
  const github = readGitHubConfig(env);

  return {
    github,
    jira,
    public: {
      ...EMPTY_PUBLIC_DASHBOARD_CONFIG,
      githubUsername: github?.username ?? "",
      projectKeys: jira?.projectKeys ?? readProjectKeys(env, "JIRA_PROJECT_KEYS"),
      ticketKeyPrefixes: readProjectKeys(env, "TICKET_KEY_PREFIXES"),
      workflowStatuses: readWorkflowConfig(env),
    },
  };
}

export function sanitizeMessage(
  message: string,
  config: IntegrationConfig,
): string {
  const secrets = [
    config.github?.token,
    config.jira?.apiToken,
    config.jira?.email,
  ].filter((value): value is string => Boolean(value));

  return secrets.reduce(
    (sanitized, secret) => sanitized.replaceAll(secret, "[redacted]"),
    message,
  );
}
