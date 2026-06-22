import type { IsoTimestamp } from "./persistence";

export type ReportPeriod = "custom" | "day" | "month" | "week" | "year";
export type DailyWorkLogSection =
  | "my-actions"
  | "workflow-progress"
  | "workflow-regressions";

export interface DailyWorkLogEntry {
  category: DailyWorkLogSection;
  description: string;
  eventType: string;
  occurredAt: IsoTimestamp;
  ticketKey: string;
  title: string;
}

export interface DailyWorkLog {
  date: string;
  ignoredNoiseCount: number;
  sections: Record<DailyWorkLogSection, DailyWorkLogEntry[]>;
  timezone: string;
}

export interface ReportMetric {
  count: number;
  eventTypes: string[];
  source: "activity_events" | "ticket_reflections";
  ticketKeys: string[];
}

export interface ReportStageDuration {
  observedSeconds: number;
  ticketKeys: string[];
  workflowColumn: "backlog" | "development" | "code-review" | "testing" | "release" | "finalized";
}

export interface CycleTimeMetric {
  averageSeconds: number | null;
  count: number;
  medianSeconds: number | null;
}

export interface CycleTimeComparison {
  current: CycleTimeMetric;
  previous: CycleTimeMetric;
}

export interface ReportReflectionEntry {
  blockers: string;
  difficulty: "low" | "medium" | "high" | null;
  learnings: string;
  notes: string;
  outcome: "done" | "partial" | "blocked" | "dropped" | null;
  ticketKey: string;
  updatedAt: IsoTimestamp;
}

export interface ReportSummary {
  cycleTimes: {
    developmentActiveToRelease: CycleTimeComparison;
    developmentActiveToReview: CycleTimeComparison;
  };
  endAt: IsoTimestamp;
  hasCompleteObservationCoverage: boolean;
  metrics: {
    blocked: ReportMetric;
    completed: ReportMetric;
    conflictRework: ReportMetric;
    movedToRelease: ReportMetric;
    movedToReview: ReportMetric;
    movedToTesting: ReportMetric;
    planned: ReportMetric;
    qaRework: ReportMetric;
    reReviewsCompleted: ReportMetric;
    reviewRework: ReportMetric;
    reviewsCompleted: ReportMetric;
    returned: ReportMetric;
    started: ReportMetric;
    totalRework: ReportMetric;
  };
  observationCoverageStartAt: IsoTimestamp | null;
  period: ReportPeriod;
  reflections: ReportReflectionEntry[];
  stageDurations: ReportStageDuration[];
  startAt: IsoTimestamp;
  timezone: string;
}
