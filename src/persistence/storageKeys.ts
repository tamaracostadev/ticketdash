export const STORAGE_KEYS = {
  lastSeen: "jira-github-dashboard:last-seen",
  plans: "jira-github-dashboard:ticket-plans",
} as const;

export const LEGACY_STORAGE_KEYS = {
  config: "tc-dashboard:config",
  lastSeen: "tc-dashboard:last-seen",
  plans: "tc-dashboard:ticket-plans",
} as const;

export function migrateStorageKey(
  storage: Storage,
  legacyKey: string,
  currentKey: string,
): void {
  if (storage.getItem(currentKey) === null) {
    const legacyValue = storage.getItem(legacyKey);
    if (legacyValue !== null) storage.setItem(currentKey, legacyValue);
  }
  storage.removeItem(legacyKey);
}
