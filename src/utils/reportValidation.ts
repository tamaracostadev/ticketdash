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
} from "../types/reports.ts";
import { normalizeIsoTimestamp } from "./dates.ts";
import { normalizeTicketKey } from "./ticketKeys.ts";

const PERIODS = new Set<ReportPeriod>(["custom", "day", "month", "week", "year"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_LOG_SECTIONS = new Set<DailyWorkLogSection>([
  "my-actions",
  "workflow-progress",
  "workflow-regressions",
]);
const WORKFLOW_COLUMNS = new Set([
  "backlog",
  "development",
  "code-review",
  "testing",
  "release",
  "finalized",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCycleTimeMetric(value: unknown): CycleTimeMetric | null {
  if (!isRecord(value) || typeof value.count !== "number" || value.count < 0) {
    return null;
  }
  if (
    !(
      value.averageSeconds === null ||
      (typeof value.averageSeconds === "number" && value.averageSeconds >= 0)
    ) ||
    !(
      value.medianSeconds === null ||
      (typeof value.medianSeconds === "number" && value.medianSeconds >= 0)
    )
  ) {
    return null;
  }
  return {
    averageSeconds: value.averageSeconds as number | null,
    count: value.count,
    medianSeconds: value.medianSeconds as number | null,
  };
}

function parseCycleTimeComparison(value: unknown): CycleTimeComparison | null {
  if (!isRecord(value)) return null;
  const current = parseCycleTimeMetric(value.current);
  const previous = parseCycleTimeMetric(value.previous);
  if (!current || !previous) return null;
  return { current, previous };
}

function parseMetric(value: unknown): ReportMetric | null {
  if (!isRecord(value) || typeof value.count !== "number" || value.count < 0) {
    return null;
  }
  if (
    value.source !== "activity_events" &&
    value.source !== "ticket_reflections"
  ) {
    return null;
  }
  if (
    !Array.isArray(value.eventTypes) ||
    !value.eventTypes.every((item) => typeof item === "string")
  ) {
    return null;
  }
  if (
    !Array.isArray(value.ticketKeys) ||
    !value.ticketKeys.every((item) => normalizeTicketKey(item) !== null)
  ) {
    return null;
  }
  return {
    count: value.count,
    eventTypes: value.eventTypes,
    source: value.source,
    ticketKeys: value.ticketKeys.map((item) => item.toUpperCase()),
  };
}

function parseStageDuration(value: unknown): ReportStageDuration | null {
  if (
    !isRecord(value) ||
    typeof value.observedSeconds !== "number" ||
    value.observedSeconds < 0 ||
    typeof value.workflowColumn !== "string" ||
    !WORKFLOW_COLUMNS.has(value.workflowColumn)
  ) {
    return null;
  }
  if (
    !Array.isArray(value.ticketKeys) ||
    !value.ticketKeys.every((item) => normalizeTicketKey(item) !== null)
  ) {
    return null;
  }
  return {
    observedSeconds: value.observedSeconds,
    ticketKeys: value.ticketKeys.map((item) => item.toUpperCase()),
    workflowColumn: value.workflowColumn as ReportStageDuration["workflowColumn"],
  };
}

function parseReflection(value: unknown): ReportReflectionEntry | null {
  if (!isRecord(value)) return null;
  const ticketKey = typeof value.ticketKey === "string"
    ? normalizeTicketKey(value.ticketKey)
    : null;
  const updatedAt = normalizeIsoTimestamp(value.updatedAt);
  if (!ticketKey || !updatedAt) return null;
  if (
    value.difficulty !== null &&
    value.difficulty !== "low" &&
    value.difficulty !== "medium" &&
    value.difficulty !== "high"
  ) {
    return null;
  }
  if (
    value.outcome !== null &&
    value.outcome !== "done" &&
    value.outcome !== "partial" &&
    value.outcome !== "blocked" &&
    value.outcome !== "dropped"
  ) {
    return null;
  }
  if (
    typeof value.blockers !== "string" ||
    typeof value.learnings !== "string" ||
    typeof value.notes !== "string"
  ) {
    return null;
  }
  return {
    blockers: value.blockers,
    difficulty: value.difficulty as ReportReflectionEntry["difficulty"],
    learnings: value.learnings,
    notes: value.notes,
    outcome: value.outcome as ReportReflectionEntry["outcome"],
    ticketKey,
    updatedAt,
  };
}

export function normalizeReportPeriod(value: unknown): ReportPeriod | null {
  return typeof value === "string" && PERIODS.has(value as ReportPeriod)
    ? value as ReportPeriod
    : null;
}

export function normalizeReportReferenceDate(value: unknown): string | null {
  return typeof value === "string" && DATE_PATTERN.test(value) ? value : null;
}

export function normalizeReportTimezone(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

function parseDailyWorkLogEntry(value: unknown): DailyWorkLogEntry | null {
  if (!isRecord(value)) return null;
  const ticketKey = typeof value.ticketKey === "string"
    ? normalizeTicketKey(value.ticketKey)
    : null;
  const occurredAt = normalizeIsoTimestamp(value.occurredAt);
  if (
    !ticketKey ||
    !occurredAt ||
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    typeof value.eventType !== "string" ||
    typeof value.category !== "string" ||
    !DAILY_LOG_SECTIONS.has(value.category as DailyWorkLogSection)
  ) {
    return null;
  }
  return {
    category: value.category as DailyWorkLogSection,
    description: value.description,
    eventType: value.eventType,
    occurredAt,
    ticketKey,
    title: value.title,
  };
}

export function parseDailyWorkLog(value: unknown): DailyWorkLog | null {
  if (!isRecord(value)) return null;
  const timezone = normalizeReportTimezone(value.timezone);
  const date = normalizeReportReferenceDate(value.date);
  if (
    !timezone ||
    !date ||
    typeof value.ignoredNoiseCount !== "number" ||
    value.ignoredNoiseCount < 0 ||
    !isRecord(value.sections)
  ) {
    return null;
  }
  const sections: DailyWorkLog["sections"] = {
    "my-actions": [],
    "workflow-progress": [],
    "workflow-regressions": [],
  };
  for (const key of DAILY_LOG_SECTIONS) {
    const rawEntries = value.sections[key];
    if (!Array.isArray(rawEntries)) return null;
    const entries = rawEntries.map(parseDailyWorkLogEntry);
    if (entries.some((entry) => entry === null)) return null;
    sections[key] = entries as DailyWorkLogEntry[];
  }
  return {
    date,
    ignoredNoiseCount: value.ignoredNoiseCount,
    sections,
    timezone,
  };
}

export function parseReportSummary(value: unknown): ReportSummary | null {
  if (!isRecord(value)) return null;
  const period = normalizeReportPeriod(value.period);
  const startAt = normalizeIsoTimestamp(value.startAt);
  const endAt = normalizeIsoTimestamp(value.endAt);
  const cycleTimes = isRecord(value.cycleTimes) ? value.cycleTimes : null;
  if (
    !period ||
    !startAt ||
    !endAt ||
    typeof value.timezone !== "string" ||
    typeof value.hasCompleteObservationCoverage !== "boolean" ||
    !isRecord(value.metrics) ||
    cycleTimes === null
  ) {
    return null;
  }
  const observationCoverageStartAt =
    value.observationCoverageStartAt === null
      ? null
      : normalizeIsoTimestamp(value.observationCoverageStartAt);
  if (
    value.observationCoverageStartAt !== null &&
    observationCoverageStartAt === null
  ) {
    return null;
  }

  const planned = parseMetric(value.metrics.planned);
  const started = parseMetric(value.metrics.started);
  const completed = parseMetric(value.metrics.completed);
  const returned = parseMetric(value.metrics.returned);
  const blocked = parseMetric(value.metrics.blocked);
  const movedToReview = parseMetric(value.metrics.movedToReview);
  const movedToTesting = parseMetric(value.metrics.movedToTesting);
  const movedToRelease = parseMetric(value.metrics.movedToRelease);
  const reviewRework = parseMetric(value.metrics.reviewRework);
  const qaRework = parseMetric(value.metrics.qaRework);
  const conflictRework = parseMetric(value.metrics.conflictRework);
  const totalRework = parseMetric(value.metrics.totalRework);
  const reviewsCompleted = parseMetric(value.metrics.reviewsCompleted);
  const reReviewsCompleted = parseMetric(value.metrics.reReviewsCompleted);
  if (!planned || !started || !completed || !returned || !blocked) {
    return null;
  }
  if (
    !movedToReview ||
    !movedToTesting ||
    !movedToRelease ||
    !reviewRework ||
    !qaRework ||
    !conflictRework ||
    !totalRework ||
    !reviewsCompleted ||
    !reReviewsCompleted
  ) {
    return null;
  }
  if (
    !Array.isArray(value.stageDurations) ||
    !Array.isArray(value.reflections)
  ) {
    return null;
  }
  const stageDurations = value.stageDurations
    .map(parseStageDuration);
  const reflections = value.reflections
    .map(parseReflection);
  if (
    stageDurations.some((item) => item === null) ||
    reflections.some((item) => item === null)
  ) {
    return null;
  }
  const developmentActiveToReview = parseCycleTimeComparison(
    cycleTimes.developmentActiveToReview,
  );
  const developmentActiveToRelease = parseCycleTimeComparison(
    cycleTimes.developmentActiveToRelease,
  );
  if (!developmentActiveToReview || !developmentActiveToRelease) {
    return null;
  }
  return {
    cycleTimes: {
      developmentActiveToRelease,
      developmentActiveToReview,
    },
    endAt,
    hasCompleteObservationCoverage: value.hasCompleteObservationCoverage,
    metrics: {
      blocked,
      completed,
      conflictRework,
      movedToRelease,
      movedToReview,
      movedToTesting,
      planned,
      qaRework,
      reReviewsCompleted,
      reviewRework,
      reviewsCompleted,
      returned,
      started,
      totalRework,
    },
    observationCoverageStartAt,
    period,
    reflections: reflections as ReportReflectionEntry[],
    stageDurations: stageDurations as ReportStageDuration[],
    startAt,
    timezone: value.timezone,
  };
}
