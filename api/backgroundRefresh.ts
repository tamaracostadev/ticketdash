import {
  fetchGitHubPRs,
} from "../server/github.ts";
import {
  fetchJiraIssues,
} from "../server/jira.ts";
import { fetchJiraDirectClosures } from "../server/jiraHistory.ts";
import { sanitizeMessage, type IntegrationConfig } from "../server/config.ts";
import type {
  ActivityObservationInput,
  ActivityReviewStatus,
} from "../src/types/activity.ts";
import type { GitHubPR, GitHubPRResponsePayload } from "../src/types/github.ts";
import type { JiraIssue } from "../src/types/jira.ts";
import type { ExternalWorkflowColumn } from "../src/types/workflow.ts";
import type {
  ActivityRepository,
  HistoricalWorkflowTransitionInput,
} from "./activityRepository.ts";

export interface BackgroundRefreshConfig {
  enabled: boolean;
  intervalMs: number;
}

export interface BackgroundRefreshStatus {
  enabled: boolean;
  intervalMs: number;
  isRunning: boolean;
  lastError: string | null;
  lastFinishedAt: string | null;
  lastStartedAt: string | null;
  lastSuccessAt: string | null;
}

interface BackgroundRefreshDependencies {
  activityRepository: ActivityRepository;
  config: BackgroundRefreshConfig;
  integrations: IntegrationConfig;
}

const TICKET_ID_PATTERN = /\b([A-Z][A-Z0-9_]{1,19}-\d+)\b/i;
const HISTORY_STARTUP_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1_000;
const HISTORY_CURSOR_OVERLAP_MS = 10 * 60 * 1_000;

function normalizeStatusName(statusName: string): string {
  return statusName.trim().toLowerCase().replace(/\s+/g, " ");
}

function getWorkflowColumnForStatus(
  statusName: string,
  config: IntegrationConfig["public"]["workflowStatuses"],
): ExternalWorkflowColumn | null {
  const normalized = normalizeStatusName(statusName);
  const groups = {
    backlog: config.backlog,
    "code-review": config.codeReview,
    development: config.development,
    finalized: config.finalized,
    release: config.release,
    testing: config.testing,
  } satisfies Record<ExternalWorkflowColumn, string[]>;

  return (
    Object.entries(groups).find(([, values]) =>
      values.some((value) => normalizeStatusName(value) === normalized)
    )?.[0] as ExternalWorkflowColumn | undefined
  ) ?? null;
}

function getOpenThreadCount(pr: GitHubPR): number {
  return pr.reviewThreads.nodes.filter(
    (thread) => !thread.isResolved && !thread.isOutdated,
  ).length;
}

function getReviewStatus(pr: GitHubPR): ActivityReviewStatus {
  const approvals = (pr.latestOpinionatedReviews?.nodes ?? []).filter(
    (review) => review.state === "APPROVED",
  );

  if (pr.isDraft) return "draft";
  if (pr.reviewDecision === "CHANGES_REQUESTED") return "changes-requested";
  if (pr.reviewDecision === "APPROVED") return "approved";
  if (approvals.length > 0) return "partially-approved";
  return "pending-review";
}

function extractTicketId(
  value: string,
  prefixes: string[] = [],
): string | null {
  const ticketId = value.match(TICKET_ID_PATTERN)?.[1].toUpperCase() ?? null;
  if (ticketId === null || prefixes.length === 0) return ticketId;
  const prefix = ticketId.split("-")[0];
  return prefixes.includes(prefix) ? ticketId : null;
}

function getPRTicketId(pr: GitHubPR, prefixes: string[] = []): string | null {
  return extractTicketId(pr.headRefName, prefixes) ??
    extractTicketId(pr.title, prefixes);
}

function isTrackedReviewPr(pr: GitHubPR, username: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  return Boolean(
    pr.searchContexts?.reviewRequested ||
      pr.searchContexts?.reviewed ||
      (pr.latestOpinionatedReviews?.nodes ?? []).some((review) =>
        review.author?.login.toLowerCase() === normalizedUsername
      ),
  );
}

function toObservationPR(pr: GitHubPR) {
  return {
    latestCommitAt: pr.latestCommits?.nodes[0]?.commit.committedDate ?? null,
    latestOpinionatedReviews: (pr.latestOpinionatedReviews?.nodes ?? []).map(
      (review) => ({
        authorLogin: review.author?.login ?? null,
        state: review.state,
        submittedAt: review.submittedAt,
      }),
    ),
    mergeable: pr.mergeable,
    number: pr.number,
    openThreadCount: getOpenThreadCount(pr),
    repository: `${pr.repository.owner.login}/${pr.repository.name}`,
    reviewStatus: getReviewStatus(pr),
  };
}

function createObservations(
  issues: JiraIssue[],
  prs: GitHubPR[],
  observedAt: string,
  integrations: IntegrationConfig,
): ActivityObservationInput[] {
  const issuesByKey = new Map(
    issues.map((issue) => [issue.key.toUpperCase(), issue]),
  );
  const prefixes = integrations.public.ticketKeyPrefixes.length > 0
    ? integrations.public.ticketKeyPrefixes
    : [...new Set([...issuesByKey.keys()].map((key) => key.split("-")[0]))];
  const prsByTicketId = new Map<string, GitHubPR[]>();

  for (const pr of prs) {
    const ticketId = getPRTicketId(pr, prefixes);
    if (ticketId === null) continue;
    const linked = prsByTicketId.get(ticketId) ?? [];
    linked.push(pr);
    prsByTicketId.set(ticketId, linked);
  }

  const observations: ActivityObservationInput[] = [];
  for (const issue of issues) {
    const workflowColumn =
      issue.fields.status.statusCategory.key.toLowerCase() === "done"
        ? "finalized"
        : getWorkflowColumnForStatus(
          issue.fields.status.name,
          integrations.public.workflowStatuses,
        );
    if (workflowColumn === null) continue;

    const linkedPRs = prsByTicketId.get(issue.key.toUpperCase()) ?? [];
    const pullRequests = linkedPRs.map(toObservationPR);
    observations.push({
      hasConflict: linkedPRs.some((pr) => pr.mergeable === "CONFLICTING"),
      jiraStatus: issue.fields.status.name,
      observedAt,
      openThreadCount: pullRequests.reduce(
        (total, pr) => total + pr.openThreadCount,
        0,
      ),
      pullRequests,
      reviewState: pullRequests.map((pr) => pr.reviewStatus).join(",") || "no-pr",
      ticketKey: issue.key,
      workflowColumn,
    });
  }

  const githubUsername = integrations.public.githubUsername;
  if (!githubUsername) return observations;

  const capturedKeys = new Set(
    observations.map((observation) => observation.ticketKey.toUpperCase()),
  );
  const reviewOnlyByTicket = new Map<string, GitHubPR[]>();
  for (const pr of prs) {
    if (pr.searchContexts?.authored) continue;
    if (!isTrackedReviewPr(pr, githubUsername)) continue;

    const ticketKey = getPRTicketId(pr, prefixes);
    if (ticketKey === null || capturedKeys.has(ticketKey)) continue;

    const linked = reviewOnlyByTicket.get(ticketKey) ?? [];
    linked.push(pr);
    reviewOnlyByTicket.set(ticketKey, linked);
  }

  for (const [ticketKey, ticketPrs] of reviewOnlyByTicket.entries()) {
    const pullRequests = ticketPrs.map(toObservationPR);
    observations.push({
      hasConflict: ticketPrs.some((pr) => pr.mergeable === "CONFLICTING"),
      jiraStatus: "Code Review",
      observedAt,
      openThreadCount: pullRequests.reduce(
        (total, pr) => total + pr.openThreadCount,
        0,
      ),
      pullRequests,
      reviewState: pullRequests.map((pr) => pr.reviewStatus).join(",") || "no-pr",
      ticketKey,
      workflowColumn: "code-review",
    });
  }

  return observations;
}

function createHistoricalTransitions(
  closures: Awaited<ReturnType<typeof fetchJiraDirectClosures>>,
  integrations: IntegrationConfig,
): HistoricalWorkflowTransitionInput[] {
  return closures.flatMap((closure) => {
    const previousColumn = getWorkflowColumnForStatus(
      closure.fromStatus,
      integrations.public.workflowStatuses,
    );
    const currentColumn = getWorkflowColumnForStatus(
      closure.toStatus,
      integrations.public.workflowStatuses,
    );
    if (
      (previousColumn !== "backlog" && previousColumn !== "development") ||
      currentColumn !== "finalized"
    ) return [];
    return [{
      currentColumn,
      occurredAt: closure.occurredAt,
      previousColumn,
      ticketKey: closure.ticketKey,
    }];
  });
}

export class BackgroundRefreshService {
  private readonly activityRepository: ActivityRepository;
  private readonly config: BackgroundRefreshConfig;
  private readonly integrations: IntegrationConfig;
  private readonly status: BackgroundRefreshStatus;
  private historyCursorAt: string | null = null;
  private isStarted = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  public constructor(dependencies: BackgroundRefreshDependencies) {
    this.activityRepository = dependencies.activityRepository;
    this.config = dependencies.config;
    this.integrations = dependencies.integrations;
    this.status = {
      enabled: dependencies.config.enabled,
      intervalMs: dependencies.config.intervalMs,
      isRunning: false,
      lastError: null,
      lastFinishedAt: null,
      lastStartedAt: null,
      lastSuccessAt: null,
    };
  }

  public start(): void {
    if (this.isStarted || !this.isAvailable()) return;
    this.isStarted = true;
    this.schedule(0);
  }

  public stop(): void {
    this.isStarted = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public getStatus(): BackgroundRefreshStatus {
    return { ...this.status };
  }

  private isAvailable(): boolean {
    return this.config.enabled &&
      (this.integrations.github !== null || this.integrations.jira !== null);
  }

  private schedule(delayMs: number): void {
    if (!this.isStarted) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runCycle();
    }, delayMs);
  }

  private async runCycle(): Promise<void> {
    if (!this.isStarted || this.status.isRunning) {
      this.schedule(this.config.intervalMs);
      return;
    }

    const startedAt = new Date().toISOString();
    this.status.isRunning = true;
    this.status.lastStartedAt = startedAt;

    try {
      const historyStartAt = new Date(
        this.historyCursorAt === null
          ? Date.parse(startedAt) - HISTORY_STARTUP_LOOKBACK_MS
          : Date.parse(this.historyCursorAt) - HISTORY_CURSOR_OVERLAP_MS,
      ).toISOString();
      const [issues, prsResponse, closures] = await Promise.all([
        this.integrations.jira
          ? fetchJiraIssues(this.integrations.jira)
          : Promise.resolve([]),
        this.integrations.github
          ? fetchGitHubPRs(this.integrations.github)
          : Promise.resolve<GitHubPRResponsePayload>({ prs: [], warnings: [] }),
        this.integrations.jira
          ? fetchJiraDirectClosures(
            this.integrations.jira,
            this.integrations.public.workflowStatuses.finalized,
            historyStartAt,
            startedAt,
          )
          : Promise.resolve([]),
      ]);
      const observations = createObservations(
        issues,
        prsResponse.prs,
        startedAt,
        this.integrations,
      );

      if (observations.length > 0) {
        await this.activityRepository.capture(observations);
      }
      const historicalTransitions = createHistoricalTransitions(
        closures,
        this.integrations,
      );
      if (historicalTransitions.length > 0) {
        await this.activityRepository.captureHistoricalWorkflowTransitions(
          historicalTransitions,
        );
      }
      this.historyCursorAt = startedAt;
      this.status.lastError = null;
      this.status.lastSuccessAt = new Date().toISOString();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status.lastError = sanitizeMessage(message, this.integrations);
    } finally {
      this.status.isRunning = false;
      this.status.lastFinishedAt = new Date().toISOString();
      this.schedule(this.config.intervalMs);
    }
  }
}
