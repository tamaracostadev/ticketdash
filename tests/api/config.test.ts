import { describe, expect, it } from "vitest";

import { getApiConfig } from "../../api/config";

describe("API configuration", () => {
  it("loads database, server and integration configuration", () => {
    const config = getApiConfig({
      API_HOST: "127.0.0.1",
      API_PORT: "3100",
      BACKGROUND_REFRESH_ENABLED: "true",
      BACKGROUND_REFRESH_INTERVAL_MS: "60000",
      DATABASE_URL: "postgresql://local/test",
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
    });

    expect(config).toMatchObject({
      backgroundRefresh: {
        enabled: true,
        intervalMs: 60000,
      },
      databaseUrl: "postgresql://local/test",
      host: "127.0.0.1",
      integrations: { github: { username: "user" }, jira: null },
      port: 3100,
    });
  });

  it("rejects missing database configuration and invalid ports", () => {
    expect(() => getApiConfig({})).toThrow("DATABASE_URL");
    expect(() => getApiConfig({
      API_PORT: "invalid",
      DATABASE_URL: "postgresql://local/test",
    })).toThrow("API_PORT");
    expect(() => getApiConfig({
      BACKGROUND_REFRESH_INTERVAL_MS: "0",
      DATABASE_URL: "postgresql://local/test",
    })).toThrow("BACKGROUND_REFRESH_INTERVAL_MS");
  });
});
