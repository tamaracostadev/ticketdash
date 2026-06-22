import type { IntegrationConfig } from "../server/config.ts";
import { sanitizeMessage } from "../server/config.ts";
import { GitHubProxyError } from "../server/github.ts";
import { JiraProxyError } from "../server/jira.ts";
import { PublicRequestError } from "./publicRequestError.ts";

export interface PublicError {
  message: string;
  status: number;
}

export function toPublicError(
  error: unknown,
  config: IntegrationConfig,
): PublicError {
  const status =
    error instanceof JiraProxyError ||
    error instanceof GitHubProxyError ||
    error instanceof PublicRequestError
      ? error.status
      : 500;
  const fallback = status === 500 ? "Internal server error." : "Request failed.";
  const message = error instanceof Error ? error.message : fallback;

  return {
    message: sanitizeMessage(status === 500 ? fallback : message, config),
    status,
  };
}
