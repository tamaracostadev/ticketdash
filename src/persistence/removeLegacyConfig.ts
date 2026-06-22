import { LEGACY_STORAGE_KEYS } from "./storageKeys";

export function removeLegacyConfig(storage: Storage = globalThis.localStorage): void {
  storage.removeItem(LEGACY_STORAGE_KEYS.config);
}
