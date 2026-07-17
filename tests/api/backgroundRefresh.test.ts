import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityRepository } from "../../api/activityRepository";
import {
  BackgroundRefreshService,
  type BackgroundRefreshConfig,
} from "../../api/backgroundRefresh";
import { getIntegrationConfig } from "../../server/config";
import * as github from "../../server/github";
import * as jira from "../../server/jira";
import * as jiraHistory from "../../server/jiraHistory";
import { createIssue, createPR } from "../fixtures/domain";

function createActivityRepository(): ActivityRepository {
  return {
    capture: vi.fn().mockResolvedValue(undefined),
    captureHistoricalWorkflowTransitions: vi.fn().mockResolvedValue(undefined),
  } as unknown as ActivityRepository;
}

function createConfig(overrides: Partial<BackgroundRefreshConfig> = {}) {
  return {
    enabled: true,
    intervalMs: 1_000,
    ...overrides,
  };
}

function createPublicConfig(overrides: Record<string, string> = {}) {
  return getIntegrationConfig({
    GITHUB_TOKEN: "token",
    GITHUB_USERNAME: "reviewer",
    ...overrides,
  }).public;
}

describe("background refresh service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(jira, "fetchJiraIssues").mockResolvedValue([createIssue("APP-100")]);
    vi.spyOn(jiraHistory, "fetchJiraDirectClosures").mockResolvedValue([]);
    vi.spyOn(github, "fetchGitHubPRs").mockResolvedValue({
      prs: [createPR("APP-100")],
      warnings: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("captures integration state on a scheduled cycle", async () => {
    const activityRepository = createActivityRepository();
    const service = new BackgroundRefreshService({
      activityRepository,
      config: createConfig(),
      integrations: {
        github: {
          authoredSearchLimit: 30,
          reviewRequestedSearchLimit: 30,
          searchScopes: [],
          token: "token",
          username: "reviewer",
        },
        jira: {
          apiToken: "token",
          email: "user@example.com",
          issueSearchLimit: 50,
          projectKeys: [],
          url: "https://jira.example",
        },
        public: createPublicConfig(),
      },
    });

    service.start();
    await vi.runOnlyPendingTimersAsync();

    expect(activityRepository.capture).toHaveBeenCalledWith([
      expect.objectContaining({
        jiraStatus: "Dev",
        ticketKey: "APP-100",
      }),
    ]);
    expect(service.getStatus()).toMatchObject({
      enabled: true,
      intervalMs: 1_000,
      isRunning: false,
      lastError: null,
    });
  });

  it("captures backlog and development closures without adding them to active issues", async () => {
    vi.mocked(jiraHistory.fetchJiraDirectClosures).mockResolvedValue([
      {
        fromStatus: "Open",
        occurredAt: "2026-07-15T21:25:00.976Z",
        ticketKey: "APP-200",
        toStatus: "Closed",
      },
      {
        fromStatus: "Dev",
        occurredAt: "2026-07-15T19:50:21.806Z",
        ticketKey: "APP-201",
        toStatus: "Closed",
      },
      {
        fromStatus: "Ready for Release",
        occurredAt: "2026-07-15T20:00:00.000Z",
        ticketKey: "APP-202",
        toStatus: "Closed",
      },
    ]);
    const activityRepository = createActivityRepository();
    const service = new BackgroundRefreshService({
      activityRepository,
      config: createConfig(),
      integrations: {
        github: null,
        jira: {
          apiToken: "token",
          email: "user@example.com",
          issueSearchLimit: 50,
          projectKeys: [],
          url: "https://jira.example",
        },
        public: createPublicConfig(),
      },
    });

    service.start();
    await vi.runOnlyPendingTimersAsync();

    expect(activityRepository.captureHistoricalWorkflowTransitions).toHaveBeenCalledWith([
      {
        currentColumn: "finalized",
        occurredAt: "2026-07-15T21:25:00.976Z",
        previousColumn: "backlog",
        ticketKey: "APP-200",
      },
      {
        currentColumn: "finalized",
        occurredAt: "2026-07-15T19:50:21.806Z",
        previousColumn: "development",
        ticketKey: "APP-201",
      },
    ]);
    await vi.runOnlyPendingTimersAsync();
    const historyCalls = vi.mocked(jiraHistory.fetchJiraDirectClosures).mock.calls;
    expect(Date.parse(String(historyCalls[1]?.[2])))
      .toBeGreaterThan(Date.parse(String(historyCalls[0]?.[2])));
  });

  it("retries after a failed cycle without exposing secrets", async () => {
    const activityRepository = createActivityRepository();
    vi.mocked(jiraHistory.fetchJiraDirectClosures).mockRejectedValueOnce(
      new Error("boom token user@example.com"),
    );
    const service = new BackgroundRefreshService({
      activityRepository,
      config: createConfig(),
      integrations: {
        github: null,
        jira: {
          apiToken: "token",
          email: "user@example.com",
          issueSearchLimit: 50,
          projectKeys: [],
          url: "https://jira.example",
        },
        public: createPublicConfig(),
      },
    });

    service.start();
    await vi.runOnlyPendingTimersAsync();

    expect(service.getStatus().lastError).toBe("boom [redacted] [redacted]");
    await vi.runOnlyPendingTimersAsync();
    expect(activityRepository.capture).toHaveBeenCalled();
  });

  it("does not start when disabled or when no integration is configured", async () => {
    const activityRepository = createActivityRepository();
    const disabled = new BackgroundRefreshService({
      activityRepository,
      config: createConfig({ enabled: false }),
      integrations: {
        github: null,
        jira: null,
        public: createPublicConfig(),
      },
    });

    disabled.start();
    await vi.runOnlyPendingTimersAsync();

    expect(activityRepository.capture).not.toHaveBeenCalled();
    expect(disabled.getStatus()).toMatchObject({
      enabled: false,
      lastStartedAt: null,
    });
  });
});
