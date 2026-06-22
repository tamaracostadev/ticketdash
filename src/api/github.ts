import type { GitHubPRResponsePayload, GitHubWarning } from "../types/github";

function isGitHubWarnings(value: unknown): value is GitHubWarning[] {
  return Array.isArray(value) && value.every((warning) =>
    typeof warning === "object" &&
    warning !== null &&
    (warning as Record<string, unknown>).code === "review-queue-access-limited" &&
    typeof (warning as Record<string, unknown>).message === "string"
  );
}

function isGitHubPRPayload(value: unknown): value is GitHubPRResponsePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).prs) &&
    isGitHubWarnings((value as Record<string, unknown>).warnings)
  );
}

export async function fetchGitHubPRs(
  request: typeof fetch = fetch,
): Promise<GitHubPRResponsePayload> {
  const response = await request("/api/github/prs");
  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      typeof (data as Record<string, unknown>).message === "string"
        ? (data as Record<string, string>).message
        : "GitHub integration failed.";
    throw new Error(message);
  }

  if (!isGitHubPRPayload(data)) {
    throw new Error("GitHub returned an invalid response.");
  }

  return data;
}
