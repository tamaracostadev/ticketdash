import { describe, expect, it } from "vitest";

import { getApiConfig } from "../../api/config";

describe("API configuration", () => {
  it("loads database, server and integration configuration", () => {
    const config = getApiConfig({
      API_HOST: "127.0.0.1",
      API_PORT: "3100",
      DATABASE_URL: "postgresql://local/test",
      GITHUB_TOKEN: "token",
      GITHUB_USERNAME: "user",
    });

    expect(config).toMatchObject({
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
  });
});
