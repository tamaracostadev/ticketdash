import type { QueryResultRow } from "pg";

import type { Database } from "./database.ts";
import type {
  CycleTimeComparison,
  CycleTimeMetric,
  DailyWorkLog,
  DailyWorkLogEntry,
  DailyWorkLogSection,
  ReportMetric,
  ReportPeriod,
  ReportReflectionEntry,
  ReportStageDuration,
  ReportSummary,
} from "../src/types/reports.ts";

export const DEFAULT_REPORT_TIMEZONE = "UTC";

interface BoundsRow extends QueryResultRow {
  end_at: Date;
  start_at: Date;
}

interface CoverageRow extends QueryResultRow {
  first_observed_at: Date | null;
}

interface MetricRow extends QueryResultRow {
  metric: keyof ReportSummary["metrics"];
  ticket_keys: string[] | null;
}

interface StageDurationRow extends QueryResultRow {
  observed_seconds: string | number;
  ticket_keys: string[] | null;
  workflow_column: ReportStageDuration["workflowColumn"];
}

interface ReflectionRow extends QueryResultRow {
  blockers: string;
  difficulty: ReportReflectionEntry["difficulty"];
  learnings: string;
  notes: string;
  outcome: ReportReflectionEntry["outcome"];
  ticket_key: string;
  updated_at: Date;
}

interface CycleEventRow extends QueryResultRow {
  current_value: unknown;
  event_type: string;
  occurred_at: Date;
  ticket_key: string;
}

interface DailyEventRow extends QueryResultRow {
  current_value: unknown;
  event_type: string;
  id: number;
  occurred_at: Date;
  origin: "system" | "user";
  previous_value: unknown;
  ticket_key: string;
}

interface ReviewEventValue {
  prNumber: number;
  repository: string;
  reviewState: "APPROVED" | "CHANGES_REQUESTED";
  submittedAt: string;
}

const METRIC_DEFINITIONS: Record<
  keyof ReportSummary["metrics"],
  Pick<ReportMetric, "eventTypes" | "source">
> = {
  blocked: {
    eventTypes: ["reflection-created", "reflection-updated"],
    source: "ticket_reflections",
  },
  completed: {
    eventTypes: ["workflow-column-changed"],
    source: "activity_events",
  },
  conflictRework: {
    eventTypes: ["merge-conflict-changed"],
    source: "activity_events",
  },
  movedToRelease: {
    eventTypes: ["workflow-column-changed"],
    source: "activity_events",
  },
  movedToReview: {
    eventTypes: ["workflow-column-changed"],
    source: "activity_events",
  },
  movedToTesting: {
    eventTypes: ["workflow-column-changed"],
    source: "activity_events",
  },
  planned: {
    eventTypes: ["planned"],
    source: "activity_events",
  },
  qaRework: {
    eventTypes: ["rejected-by-qa"],
    source: "activity_events",
  },
  reReviewsCompleted: {
    eventTypes: ["re-review-submitted"],
    source: "activity_events",
  },
  reviewRework: {
    eventTypes: ["rejected-by-review"],
    source: "activity_events",
  },
  reviewsCompleted: {
    eventTypes: ["review-submitted"],
    source: "activity_events",
  },
  returned: {
    eventTypes: ["rejected-by-review", "rejected-by-qa"],
    source: "activity_events",
  },
  started: {
    eventTypes: ["active-development-started"],
    source: "activity_events",
  },
  totalRework: {
    eventTypes: [
      "merge-conflict-changed",
      "rejected-by-qa",
      "rejected-by-review",
    ],
    source: "activity_events",
  },
};

function createEmptyMetric(
  key: keyof ReportSummary["metrics"],
): ReportMetric {
  return {
    count: 0,
    eventTypes: METRIC_DEFINITIONS[key].eventTypes,
    source: METRIC_DEFINITIONS[key].source,
    ticketKeys: [],
  };
}

function parseObservedSeconds(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function getEventTimestamp(row: DailyEventRow): number {
  return row.occurred_at.getTime();
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isReviewEventValue(value: unknown): value is ReviewEventValue {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).prNumber === "number" &&
    typeof (value as Record<string, unknown>).repository === "string" &&
    (
      (value as Record<string, unknown>).reviewState === "APPROVED" ||
      (value as Record<string, unknown>).reviewState === "CHANGES_REQUESTED"
    ) &&
    typeof (value as Record<string, unknown>).submittedAt === "string";
}

function getReviewActionLabel(reviewState: ReviewEventValue["reviewState"]): string {
  return reviewState === "APPROVED" ? "approved" : "requested changes on";
}

function createDailyEntry(
  category: DailyWorkLogSection,
  row: DailyEventRow,
  title: string,
  description: string,
): DailyWorkLogEntry {
  return {
    category,
    description,
    eventType: row.event_type,
    occurredAt: row.occurred_at.toISOString(),
    ticketKey: row.ticket_key,
    title,
  };
}

function createEmptyCycleMetric(): CycleTimeMetric {
  return {
    averageSeconds: null,
    count: 0,
    medianSeconds: null,
  };
}

function createEmptyCycleComparison(): CycleTimeComparison {
  return {
    current: createEmptyCycleMetric(),
    previous: createEmptyCycleMetric(),
  };
}

function toCycleMetric(values: number[]): CycleTimeMetric {
  if (values.length === 0) return createEmptyCycleMetric();
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const middle = Math.floor(count / 2);
  const medianSeconds = count % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];

  return {
    averageSeconds: Math.round(total / count),
    count,
    medianSeconds,
  };
}

const NOISE_WINDOW_MS = 10 * 60 * 1_000;

function collectIgnoredNoiseIds(rows: DailyEventRow[]): Set<number> {
  const ignored = new Set<number>();
  let index = 0;
  while (index < rows.length) {
    const start = rows[index];
    if (start.event_type !== "workflow-column-changed") {
      index += 1;
      continue;
    }
    const startPrevious = isString(start.previous_value) ? start.previous_value : null;
    if (!startPrevious) {
      index += 1;
      continue;
    }
    const chain = [start];
    let cursor = index + 1;
    while (cursor < rows.length) {
      const next = rows[cursor];
      if (
        next.event_type !== "workflow-column-changed" ||
        next.ticket_key !== start.ticket_key ||
        getEventTimestamp(next) - getEventTimestamp(chain[chain.length - 1]) >
          NOISE_WINDOW_MS
      ) {
        break;
      }
      chain.push(next);
      cursor += 1;
    }
    if (chain.length >= 2) {
      const lastCurrent = chain[chain.length - 1].current_value;
      if (isString(lastCurrent) && lastCurrent === startPrevious) {
        for (const event of chain) ignored.add(event.id);
        index = cursor;
        continue;
      }
    }
    index += 1;
  }
  return ignored;
}

function classifyDailyEvent(row: DailyEventRow): DailyWorkLogEntry | null {
  if (row.origin === "user") {
    return null;
  }

  if (row.event_type === "merge-conflict-changed") {
    if (row.previous_value === true && row.current_value === false) {
      return createDailyEntry(
        "my-actions",
        row,
        "Resolved merge conflict",
        `${row.ticket_key} no longer has a merge conflict.`,
      );
    }
    return null;
  }

  if (row.event_type === "review-submitted" && isReviewEventValue(row.current_value)) {
    return createDailyEntry(
      "my-actions",
      row,
      "Reviewed PR",
      `${row.ticket_key} ${getReviewActionLabel(row.current_value.reviewState)} ${row.current_value.repository} #${row.current_value.prNumber}.`,
    );
  }
  if (
    row.event_type === "re-review-submitted" &&
    isReviewEventValue(row.current_value)
  ) {
    return createDailyEntry(
      "my-actions",
      row,
      "Re-reviewed PR",
      `${row.ticket_key} ${getReviewActionLabel(row.current_value.reviewState)} ${row.current_value.repository} #${row.current_value.prNumber} after updates.`,
    );
  }

  if (row.event_type === "rejected-by-review") {
    return createDailyEntry(
      "workflow-regressions",
      row,
      "Returned from code review",
      `${row.ticket_key} returned to development after review feedback.`,
    );
  }
  if (row.event_type === "rejected-by-qa") {
    return createDailyEntry(
      "workflow-regressions",
      row,
      "Returned from QA",
      `${row.ticket_key} returned to development after QA rejection.`,
    );
  }
  if (row.event_type === "workflow-column-changed") {
    const previous = isString(row.previous_value) ? row.previous_value : null;
    const current = isString(row.current_value) ? row.current_value : null;
    if (!previous || !current) return null;
    if (previous === "development" && current === "code-review") {
      return createDailyEntry(
        "my-actions",
        row,
        "Completed development",
        `${row.ticket_key} moved from development to code review.`,
      );
    }
    if (previous === "development" && current === "testing") {
      return createDailyEntry(
        "my-actions",
        row,
        "Completed development",
        `${row.ticket_key} moved from development to testing.`,
      );
    }
    if (previous === "code-review" && current === "testing") {
      return createDailyEntry(
        "workflow-progress",
        row,
        "Moved to testing",
        `${row.ticket_key} progressed from code review to testing.`,
      );
    }
    if (previous === "testing" && current === "release") {
      return createDailyEntry(
        "workflow-progress",
        row,
        "Moved to release",
        `${row.ticket_key} progressed from testing to release.`,
      );
    }
    if (previous === "release" && current === "finalized") {
      return createDailyEntry(
        "workflow-progress",
        row,
        "Finalized ticket",
        `${row.ticket_key} progressed from release to finalized.`,
      );
    }
    if (previous === "code-review" && current === "development") {
      return createDailyEntry(
        "workflow-regressions",
        row,
        "Returned to development",
        `${row.ticket_key} moved from code review back to development.`,
      );
    }
    if (previous === "testing" && current === "development") {
      return createDailyEntry(
        "workflow-regressions",
        row,
        "Returned to development",
        `${row.ticket_key} moved from testing back to development.`,
      );
    }
  }
  return null;
}

export class ReportRepository {
  private readonly database: Database;

  public constructor(database: Database, _githubUsername = "") {
    this.database = database;
  }

  public async fetchSummary(
    period: ReportPeriod,
    referenceDate: string,
    timezone: string,
    includeNotes: boolean,
    rangeStart?: string,
    rangeEnd?: string,
  ): Promise<ReportSummary> {
    const effectiveTimezone = timezone || DEFAULT_REPORT_TIMEZONE;
    const bounds = await this.getBounds(
      period,
      referenceDate,
      effectiveTimezone,
      rangeStart,
      rangeEnd,
    );
    const coverageStart = await this.getCoverageStart();
    const hasCompleteObservationCoverage =
      coverageStart !== null && coverageStart.getTime() <= bounds.start_at.getTime();
    const previousBounds = this.getPreviousBounds(bounds.start_at, bounds.end_at);
    const [metrics, stageDurations, reflections, cycleTimes] = await Promise.all([
      this.getMetrics(bounds.start_at, bounds.end_at),
      hasCompleteObservationCoverage
        ? this.getStageDurations(bounds.start_at, bounds.end_at)
        : Promise.resolve([]),
      includeNotes
        ? this.getReflections(bounds.start_at, bounds.end_at)
        : Promise.resolve([]),
      this.getCycleTimes(
        bounds.start_at,
        bounds.end_at,
        previousBounds.startAt,
        previousBounds.endAt,
      ),
    ]);

    return {
      cycleTimes,
      endAt: bounds.end_at.toISOString(),
      hasCompleteObservationCoverage,
      metrics,
      observationCoverageStartAt: coverageStart?.toISOString() ?? null,
      period,
      reflections,
      stageDurations,
      startAt: bounds.start_at.toISOString(),
      timezone: effectiveTimezone,
    };
  }

  public async fetchDailyLog(
    date: string,
    timezone: string,
  ): Promise<DailyWorkLog> {
    const effectiveTimezone = timezone || DEFAULT_REPORT_TIMEZONE;
    const bounds = await this.getBounds("day", date, effectiveTimezone);
    const result = await this.database.query<DailyEventRow>(
      `SELECT id, ticket_key, event_type, origin, occurred_at,
              previous_value, current_value
       FROM ticketdash.activity_events
       WHERE occurred_at >= $1
         AND occurred_at < $2
       ORDER BY ticket_key ASC, occurred_at ASC, id ASC`,
      [bounds.start_at, bounds.end_at],
    );
    const ignoredNoiseIds = collectIgnoredNoiseIds(result.rows);
    const sections: DailyWorkLog["sections"] = {
      "my-actions": [],
      "workflow-progress": [],
      "workflow-regressions": [],
    };
    for (const row of result.rows) {
      if (ignoredNoiseIds.has(row.id)) continue;
      const entry = classifyDailyEvent(row);
      if (entry) sections[entry.category].push(entry);
    }
    for (const key of Object.keys(sections) as DailyWorkLogSection[]) {
      sections[key].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt)
      );
    }
    return {
      date,
      ignoredNoiseCount: ignoredNoiseIds.size,
      sections,
      timezone: effectiveTimezone,
    };
  }

  private async getCoverageStart(): Promise<Date | null> {
    const result = await this.database.query<CoverageRow>(
      `SELECT MIN(observed_at) AS first_observed_at
       FROM ticketdash.activity_observations`,
    );
    return result.rows[0]?.first_observed_at ?? null;
  }

  private async getBounds(
    period: ReportPeriod,
    referenceDate: string,
    timezone: string,
    rangeStart?: string,
    rangeEnd?: string,
  ): Promise<BoundsRow> {
    if (period === "custom") {
      if (!rangeStart || !rangeEnd) {
        throw new Error("Custom report range unavailable.");
      }
      const result = await this.database.query<BoundsRow>(
        `SELECT
           ($1::date::timestamp AT TIME ZONE $3) AS start_at,
           (($2::date + INTERVAL '1 day')::timestamp AT TIME ZONE $3) AS end_at`,
        [rangeStart, rangeEnd, timezone],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Report period bounds unavailable.");
      return row;
    }

    const result = await this.database.query<BoundsRow>(
      `SELECT
         CASE $1
           WHEN 'day' THEN ($2::date::timestamp AT TIME ZONE $3)
           WHEN 'week' THEN (date_trunc('week', $2::date::timestamp) AT TIME ZONE $3)
           WHEN 'month' THEN (date_trunc('month', $2::date::timestamp) AT TIME ZONE $3)
           ELSE (date_trunc('year', $2::date::timestamp) AT TIME ZONE $3)
         END AS start_at,
         CASE $1
           WHEN 'day' THEN (($2::date + INTERVAL '1 day')::timestamp AT TIME ZONE $3)
           WHEN 'week' THEN ((date_trunc('week', $2::date::timestamp) + INTERVAL '7 day') AT TIME ZONE $3)
           WHEN 'month' THEN ((date_trunc('month', $2::date::timestamp) + INTERVAL '1 month') AT TIME ZONE $3)
           ELSE ((date_trunc('year', $2::date::timestamp) + INTERVAL '1 year') AT TIME ZONE $3)
         END AS end_at`,
      [period, referenceDate, timezone],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Report period bounds unavailable.");
    return row;
  }

  private async getMetrics(
    startAt: Date,
    endAt: Date,
  ): Promise<ReportSummary["metrics"]> {
    const result = await this.database.query<MetricRow>(
      `SELECT metric, array_agg(DISTINCT ticket_key ORDER BY ticket_key) AS ticket_keys
       FROM (
         SELECT 'planned' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'user'
           AND event_type = 'planned'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'started' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE event_type = 'active-development-started'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'movedToReview' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'workflow-column-changed'
           AND current_value = '\"code-review\"'::jsonb
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'movedToTesting' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'workflow-column-changed'
           AND current_value = '\"testing\"'::jsonb
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'movedToRelease' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'workflow-column-changed'
           AND current_value = '\"release\"'::jsonb
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'completed' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'workflow-column-changed'
           AND current_value = '\"finalized\"'::jsonb
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'returned' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type IN ('rejected-by-review', 'rejected-by-qa')
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'reviewRework' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'rejected-by-review'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'qaRework' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'rejected-by-qa'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'conflictRework' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'merge-conflict-changed'
           AND current_value = 'true'::jsonb
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'totalRework' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND (
             event_type IN ('rejected-by-review', 'rejected-by-qa') OR
             (event_type = 'merge-conflict-changed' AND current_value = 'true'::jsonb)
           )
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'reviewsCompleted' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 'review-submitted'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'reReviewsCompleted' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'system'
           AND event_type = 're-review-submitted'
           AND occurred_at >= $1
           AND occurred_at < $2
         UNION ALL
         SELECT 'blocked' AS metric, ticket_key
         FROM ticketdash.activity_events
         WHERE origin = 'user'
           AND event_type IN ('reflection-created', 'reflection-updated')
           AND current_value ->> 'outcome' = 'blocked'
           AND occurred_at >= $1
           AND occurred_at < $2
       ) AS metric_events
       GROUP BY metric`,
      [startAt, endAt],
    );

    const metrics: ReportSummary["metrics"] = {
      blocked: createEmptyMetric("blocked"),
      completed: createEmptyMetric("completed"),
      conflictRework: createEmptyMetric("conflictRework"),
      movedToRelease: createEmptyMetric("movedToRelease"),
      movedToReview: createEmptyMetric("movedToReview"),
      movedToTesting: createEmptyMetric("movedToTesting"),
      planned: createEmptyMetric("planned"),
      qaRework: createEmptyMetric("qaRework"),
      reReviewsCompleted: createEmptyMetric("reReviewsCompleted"),
      reviewRework: createEmptyMetric("reviewRework"),
      reviewsCompleted: createEmptyMetric("reviewsCompleted"),
      returned: createEmptyMetric("returned"),
      started: createEmptyMetric("started"),
      totalRework: createEmptyMetric("totalRework"),
    };

    for (const row of result.rows) {
      metrics[row.metric] = {
        count: row.ticket_keys?.length ?? 0,
        eventTypes: METRIC_DEFINITIONS[row.metric].eventTypes,
        source: METRIC_DEFINITIONS[row.metric].source,
        ticketKeys: row.ticket_keys ?? [],
      };
    }

    return metrics;
  }

  private async getStageDurations(
    startAt: Date,
    endAt: Date,
  ): Promise<ReportStageDuration[]> {
    const result = await this.database.query<StageDurationRow>(
      `WITH ordered_observations AS (
         SELECT ticket_key, workflow_column, observed_at,
                LEAD(observed_at) OVER (
                  PARTITION BY ticket_key
                  ORDER BY observed_at, id
                ) AS next_at
         FROM ticketdash.activity_observations
       ),
       spans AS (
         SELECT workflow_column,
                ticket_key,
                GREATEST(observed_at, $1::timestamptz) AS span_start,
                LEAST(COALESCE(next_at, $2::timestamptz), $2::timestamptz) AS span_end
         FROM ordered_observations
         WHERE observed_at < $2
           AND COALESCE(next_at, $2::timestamptz) > $1
       )
       SELECT workflow_column,
              array_agg(DISTINCT ticket_key ORDER BY ticket_key) AS ticket_keys,
              COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (span_end - span_start)))), 0) AS observed_seconds
       FROM spans
       WHERE span_end > span_start
       GROUP BY workflow_column
       ORDER BY observed_seconds DESC, workflow_column ASC`,
      [startAt, endAt],
    );

    return result.rows.map((row) => ({
      observedSeconds: parseObservedSeconds(row.observed_seconds),
      ticketKeys: row.ticket_keys ?? [],
      workflowColumn: row.workflow_column,
    }));
  }

  private async getReflections(
    startAt: Date,
    endAt: Date,
  ): Promise<ReportReflectionEntry[]> {
    const result = await this.database.query<ReflectionRow>(
      `SELECT ticket_key, difficulty, outcome, blockers, learnings, notes, updated_at
       FROM ticketdash.ticket_reflections
       WHERE updated_at >= $1
         AND updated_at < $2
         AND (blockers <> '' OR learnings <> '' OR notes <> '')
       ORDER BY updated_at DESC, ticket_key ASC`,
      [startAt, endAt],
    );

    return result.rows.map((row) => ({
      blockers: row.blockers,
      difficulty: row.difficulty,
      learnings: row.learnings,
      notes: row.notes,
      outcome: row.outcome,
      ticketKey: row.ticket_key,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  private getPreviousBounds(startAt: Date, endAt: Date) {
    const spanMs = endAt.getTime() - startAt.getTime();
    return {
      endAt: new Date(startAt.getTime()),
      startAt: new Date(startAt.getTime() - spanMs),
    };
  }

  private async getCycleTimes(
    currentStartAt: Date,
    currentEndAt: Date,
    previousStartAt: Date,
    previousEndAt: Date,
  ): Promise<ReportSummary["cycleTimes"]> {
    const result = await this.database.query<CycleEventRow>(
      `SELECT ticket_key, event_type, occurred_at, current_value
       FROM ticketdash.activity_events
       WHERE occurred_at >= $1
         AND occurred_at < $2
         AND (
           event_type = 'active-development-started' OR
           (
             event_type = 'workflow-column-changed' AND
             current_value IN ('"code-review"'::jsonb, '"release"'::jsonb)
           )
         )
       ORDER BY ticket_key ASC, occurred_at ASC, id ASC`,
      [previousStartAt, currentEndAt],
    );

    const currentReviewDurations: number[] = [];
    const currentReleaseDurations: number[] = [];
    const previousReviewDurations: number[] = [];
    const previousReleaseDurations: number[] = [];
    const latestStartByTicket = new Map<string, number>();

    for (const row of result.rows) {
      const occurredAtMs = row.occurred_at.getTime();
      if (row.event_type === "active-development-started") {
        latestStartByTicket.set(row.ticket_key, occurredAtMs);
        continue;
      }

      const latestStartAt = latestStartByTicket.get(row.ticket_key);
      if (latestStartAt === undefined || occurredAtMs < latestStartAt) continue;
      if (!isString(row.current_value)) continue;

      const durationSeconds = Math.round((occurredAtMs - latestStartAt) / 1000);
      const targetBucket =
        occurredAtMs >= currentStartAt.getTime() && occurredAtMs < currentEndAt.getTime()
          ? "current"
          : occurredAtMs >= previousStartAt.getTime() && occurredAtMs < previousEndAt.getTime()
            ? "previous"
            : null;
      if (!targetBucket) continue;

      if (row.current_value === "code-review") {
        (targetBucket === "current"
          ? currentReviewDurations
          : previousReviewDurations).push(durationSeconds);
      }
      if (row.current_value === "release") {
        (targetBucket === "current"
          ? currentReleaseDurations
          : previousReleaseDurations).push(durationSeconds);
      }
    }

    return {
      developmentActiveToRelease: {
        current: toCycleMetric(currentReleaseDurations),
        previous: toCycleMetric(previousReleaseDurations),
      },
      developmentActiveToReview: {
        current: toCycleMetric(currentReviewDurations),
        previous: toCycleMetric(previousReviewDurations),
      },
    };
  }
}
