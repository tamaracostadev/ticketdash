import { getIntegrationConfig, type IntegrationConfig } from "../server/config.ts";

export interface ApiConfig {
  backgroundRefresh: BackgroundRefreshConfig;
  databaseUrl: string;
  host: string;
  integrations: IntegrationConfig;
  port: number;
}

export interface BackgroundRefreshConfig {
  enabled: boolean;
  intervalMs: number;
}

function readRequired(
  env: Record<string, string | undefined>,
  key: string,
): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}.`);
  }
  return value;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("API_PORT must be a valid port.");
  }
  return port;
}

function readBoolean(
  value: string | undefined,
  defaultValue: boolean,
  key: string,
): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`${key} must be a boolean.`);
}

function readPositiveInteger(
  value: string | undefined,
  defaultValue: number,
  key: string,
): number {
  if (value === undefined || value.trim() === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}

export function getApiConfig(
  env: Record<string, string | undefined>,
): ApiConfig {
  return {
    backgroundRefresh: {
      enabled: readBoolean(
        env.BACKGROUND_REFRESH_ENABLED,
        true,
        "BACKGROUND_REFRESH_ENABLED",
      ),
      intervalMs: readPositiveInteger(
        env.BACKGROUND_REFRESH_INTERVAL_MS,
        300_000,
        "BACKGROUND_REFRESH_INTERVAL_MS",
      ),
    },
    databaseUrl: readRequired(env, "DATABASE_URL"),
    host: env.API_HOST?.trim() || "0.0.0.0",
    integrations: getIntegrationConfig(env),
    port: readPort(env.API_PORT),
  };
}
