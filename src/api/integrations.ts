import type { IntegrationStatus } from "../types/integrations";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIntegrationStatus(value: unknown): value is IntegrationStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = value as Record<string, unknown>;
  const config = status.config as Record<string, unknown> | undefined;
  const workflow = config?.workflowStatuses as Record<string, unknown> | undefined;
  return (
    typeof status.github === "boolean" &&
    typeof status.jira === "boolean" &&
    config !== undefined &&
    typeof config.githubUsername === "string" &&
    isStringArray(config.projectKeys) &&
    isStringArray(config.ticketKeyPrefixes) &&
    workflow !== undefined &&
    ["backlog", "codeReview", "development", "finalized", "release", "testing"]
      .every((key) => isStringArray(workflow[key]))
  );
}

export async function fetchIntegrationStatus(
  request: typeof fetch = fetch,
): Promise<IntegrationStatus> {
  const response = await request("/api/integrations/status");
  const data: unknown = await response.json();

  if (!response.ok || !isIntegrationStatus(data)) {
    throw new Error("Unable to load integration status.");
  }

  return data;
}
