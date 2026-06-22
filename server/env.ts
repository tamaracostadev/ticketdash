export type ServerEnv = Record<string, string | undefined>;

export function readValue(env: ServerEnv, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function readList(env: ServerEnv, key: string): string[] {
  return (env[key] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function readProjectKeys(env: ServerEnv, key: string): string[] {
  const values = [
    ...new Set(readList(env, key).map((value) => value.toUpperCase())),
  ];
  if (values.some((value) => !/^[A-Z][A-Z0-9_]{0,19}$/.test(value))) {
    throw new Error(`${key} contains an invalid Jira project key.`);
  }
  return values;
}

export function readSearchScopes(env: ServerEnv): string[] {
  const scopes = readList(env, "GITHUB_SEARCH_SCOPES");
  const pattern =
    /^(?:org:[A-Za-z0-9_.-]+|repo:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/;
  if (scopes.some((scope) => !pattern.test(scope))) {
    throw new Error("GITHUB_SEARCH_SCOPES contains an invalid qualifier.");
  }
  return scopes;
}
