import { getIntegrationConfig, type IntegrationConfig } from "../server/config.ts";

export interface ApiConfig {
  databaseUrl: string;
  host: string;
  integrations: IntegrationConfig;
  port: number;
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

export function getApiConfig(
  env: Record<string, string | undefined>,
): ApiConfig {
  return {
    databaseUrl: readRequired(env, "DATABASE_URL"),
    host: env.API_HOST?.trim() || "0.0.0.0",
    integrations: getIntegrationConfig(env),
    port: readPort(env.API_PORT),
  };
}
