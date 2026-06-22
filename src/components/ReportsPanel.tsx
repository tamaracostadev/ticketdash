import { useMemo, useState } from "react";

import { useDailyWorkLog } from "../hooks/useDailyWorkLog";
import { useReports } from "../hooks/useReports";
import type { DailyWorkLogEntry, ReportPeriod } from "../types/reports";
import type { DashboardTicket } from "../utils/dashboard";
import { needsAction } from "../utils/filterTickets";
import { getWorkflowAlerts } from "../utils/workflowAlerts";

interface ReportsPanelProps {
  tickets: DashboardTicket[];
}

interface GroupedLogEntry {
  entries: DailyWorkLogEntry[];
  ticketKey: string;
  ticketTitle: string | null;
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  custom: "Custom",
  day: "Day",
  month: "Month",
  week: "Week",
  year: "Year",
};

const DELIVERY_METRIC_LABELS = {
  blocked: "Blocked",
  completed: "Completed",
  movedToRelease: "Moved To Release",
  movedToReview: "Moved To Review",
  movedToTesting: "Moved To Testing",
  planned: "Planned",
  returned: "Returned",
  started: "Started",
} as const;

const REVIEW_METRIC_LABELS = {
  reReviewsCompleted: "Re-Reviews",
  reviewsCompleted: "Reviews",
} as const;

const REWORK_METRIC_LABELS = {
  conflictRework: "Conflict Rework",
  qaRework: "QA Rework",
  reviewRework: "Review Rework",
  totalRework: "Total Rework",
} as const;

function getReferenceDate(now: Date): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatDateValue(now: Date): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatRange(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat(navigator.language || "en-US", {
    dateStyle: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function formatInclusiveEnd(timestamp: string, timezone: string): string {
  return formatRange(new Date(Date.parse(timestamp) - 1).toISOString(), timezone);
}

function formatCoverage(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat(navigator.language || "en-US", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "No data";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getCycleTimeTitle(
  startAt: string,
  endAt: string,
  timezone: string,
): string {
  return `Cycle time - ${formatRange(startAt, timezone)} to ${formatInclusiveEnd(endAt, timezone)}`;
}

function getPlannedForToday(tickets: DashboardTicket[]): DashboardTicket[] {
  return tickets
    .filter((ticket) =>
      ticket.plan.isPlanned &&
      ticket.planningVisibility === "operational" &&
      (ticket.plan.plannedPeriod === "today" || needsAction(ticket))
    )
    .sort((left, right) => {
      const leftToday = left.plan.plannedPeriod === "today" ? 1 : 0;
      const rightToday = right.plan.plannedPeriod === "today" ? 1 : 0;
      if (leftToday !== rightToday) return rightToday - leftToday;
      const leftAction = needsAction(left) ? 1 : 0;
      const rightAction = needsAction(right) ? 1 : 0;
      return rightAction - leftAction;
    });
}

function getPlannedReasons(ticket: DashboardTicket): string[] {
  const reasons: string[] = [];
  if (ticket.plan.plannedPeriod === "today") reasons.push("Today");
  if (ticket.hasChangesRequested) reasons.push("Changes requested");
  if (ticket.hasConflict) reasons.push("Merge conflict");
  if (ticket.rejectionReason === "rejected-by-review") {
    reasons.push("Returned from review");
  }
  if (ticket.rejectionReason === "rejected-by-qa") {
    reasons.push("Returned from QA");
  }
  if (ticket.hasUnreadComment) reasons.push("New comments");
  if (ticket.openThreadCount > 0) reasons.push("Open threads");
  for (const alert of getWorkflowAlerts(ticket)) {
    if (alert === "code-review-without-pr") reasons.push("Code review without PR");
    if (alert === "release-with-open-pr") reasons.push("Release with open PR");
    if (alert === "testing-with-open-threads") reasons.push("Test with open threads");
  }
  if (reasons.length === 0) reasons.push("Planned");
  return reasons;
}

function groupEntriesByTicket(
  entries: DailyWorkLogEntry[],
  tickets: DashboardTicket[],
): GroupedLogEntry[] {
  const ticketTitles = new Map(
    tickets.map((ticket) => [
      ticket.issue.key.toUpperCase(),
      ticket.issue.fields.summary,
    ]),
  );
  const groups = new Map<string, GroupedLogEntry>();

  for (const entry of entries) {
    const ticketKey = entry.ticketKey.toUpperCase();
    const existing = groups.get(ticketKey);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    groups.set(ticketKey, {
      entries: [entry],
      ticketKey,
      ticketTitle: ticketTitles.get(ticketKey) ?? null,
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    entries: [...group.entries]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .filter((entry, index, all) =>
        all.findIndex((candidate) =>
          candidate.eventType === entry.eventType &&
          candidate.title === entry.title &&
          candidate.description === entry.description
        ) === index
      ),
  }));
}

function filterDailyEntries(
  entries: DailyWorkLogEntry[],
  tickets: DashboardTicket[],
): DailyWorkLogEntry[] {
  const ticketsByKey = new Map(
    tickets.map((ticket) => [ticket.issue.key.toUpperCase(), ticket]),
  );
  return entries.filter((entry) => {
    const ticket = ticketsByKey.get(entry.ticketKey.toUpperCase());
    if (entry.eventType === "planned") return false;
    if (
      entry.eventType === "merge-conflict-changed" &&
      ticket?.hasConflict
    ) {
      return false;
    }
    return true;
  });
}

export function ReportsPanel({ tickets }: ReportsPanelProps) {
  const [reportView, setReportView] = useState<"daily-log" | "summary">(
    "daily-log",
  );
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [includeNotes, setIncludeNotes] = useState(false);
  const [reportReferenceDate, setReportReferenceDate] = useState(() =>
    formatDateValue(new Date())
  );
  const [rangeStart, setRangeStart] = useState(() => formatDateValue(new Date()));
  const [rangeEnd, setRangeEnd] = useState(() => formatDateValue(new Date()));
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateValue(new Date())
  );
  const [expandedTickets, setExpandedTickets] = useState<
    Record<string, boolean>
  >({});

  const referenceDate = useMemo(() => getReferenceDate(new Date()), []);
  const timezone = useMemo(() => getBrowserTimezone(), []);
  const dailyLog = useDailyWorkLog(selectedDate, timezone);
  const report = useReports(
    period,
    period === "custom" ? rangeEnd : reportReferenceDate || referenceDate,
    timezone,
    includeNotes,
    period === "custom" ? rangeStart : undefined,
    period === "custom" ? rangeEnd : undefined,
  );
  const plannedForToday = useMemo(() => getPlannedForToday(tickets), [tickets]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Personal summary
            </h2>
            <p className="text-sm text-slate-400">
              Day, week, month, year and custom-range metrics from persisted activity.
            </p>
          </div>
          <div className="ml-auto rounded-full bg-slate-950 p-1">
            {([
              ["daily-log", "Daily log"],
              ["summary", "Summary"],
            ] as const).map(([value, label]) => (
              <button
                className={`rounded-full px-3 py-1 text-sm ${
                  reportView === value
                    ? "bg-sky-500/20 text-sky-200"
                    : "text-slate-400"
                }`}
                key={value}
                type="button"
                onClick={() => setReportView(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {reportView === "daily-log" ? (
        dailyLog.isPending ? (
          <p className="mt-4 text-sm text-slate-400">Loading daily log...</p>
        ) : dailyLog.error ? (
          <p className="mt-4 text-sm text-rose-300">
            {dailyLog.error instanceof Error
              ? dailyLog.error.message
              : "Daily work log unavailable."}
          </p>
        ) : dailyLog.data ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <label className="flex items-center gap-2">
                <span>Date:</span>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
              <span>Timezone: {dailyLog.data.timezone}</span>
              <span>
                Ignored noisy transitions: {dailyLog.data.ignoredNoiseCount}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="text-sm font-semibold text-slate-200">
                Planned for today
              </h3>
              {plannedForToday.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No planned tickets for today or with action required right now.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {plannedForToday.map((ticket) => (
                    <article
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                      key={ticket.issue.key}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-100">
                          {ticket.issue.key}
                        </span>
                        <span className="text-slate-300">
                          {ticket.issue.fields.summary}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                        {getPlannedReasons(ticket).map((reason) => (
                          <span
                            className="rounded-full bg-slate-800 px-2 py-1"
                            key={`${ticket.issue.key}:${reason}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {([
              ["my-actions", `Done ${selectedDate}`],
              ["workflow-progress", "Workflow progress"],
              ["workflow-regressions", "Workflow regressions"],
            ] as const).map(([key, label]) => {
              const groups = groupEntriesByTicket(
                filterDailyEntries(dailyLog.data.sections[key], tickets),
                tickets,
              );
              return (
                <div
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
                  key={key}
                >
                  <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
                  {groups.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      No events in this section.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {groups.map((group) => {
                        const expansionKey = `${key}:${group.ticketKey}`;
                        const isExpanded = expandedTickets[expansionKey] ?? false;
                        const [firstEntry, ...remainingEntries] = group.entries;

                        return (
                          <article
                            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                            key={expansionKey}
                          >
                            <div className="flex flex-wrap items-start gap-2 text-sm">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-100">
                                    {group.ticketKey}
                                  </span>
                                  {group.ticketTitle && (
                                    <span className="text-slate-300">
                                      {group.ticketTitle}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-slate-300">
                                  {firstEntry.title}
                                </p>
                                <p className="mt-1 text-slate-400">
                                  {firstEntry.description}
                                </p>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  {formatCoverage(
                                    firstEntry.occurredAt,
                                    dailyLog.data.timezone,
                                  )}
                                </span>
                                {remainingEntries.length > 0 && (
                                  <button
                                    className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300"
                                    type="button"
                                    onClick={() =>
                                      setExpandedTickets((current) => ({
                                        ...current,
                                        [expansionKey]: !isExpanded,
                                      }))}
                                  >
                                    {isExpanded ? "-" : "+"}{" "}
                                    {remainingEntries.length}
                                  </button>
                                )}
                              </div>
                            </div>
                            {isExpanded && remainingEntries.length > 0 && (
                              <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                                {remainingEntries.map((entry) => (
                                  <div
                                    key={`${group.ticketKey}:${entry.occurredAt}:${entry.eventType}`}
                                  >
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                      <span className="text-slate-300">
                                        {entry.title}
                                      </span>
                                      <span className="ml-auto text-xs text-slate-500">
                                        {formatCoverage(
                                          entry.occurredAt,
                                          dailyLog.data.timezone,
                                        )}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-400">
                                      {entry.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null
      ) : report.isPending ? (
        <p className="mt-4 text-sm text-slate-400">Loading summary...</p>
      ) : report.error ? (
        <p className="mt-4 text-sm text-rose-300">
          {report.error instanceof Error
            ? report.error.message
            : "Report summary unavailable."}
        </p>
      ) : report.data ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <div className="flex flex-wrap gap-3">
              <span>
                Period: {formatRange(report.data.startAt, report.data.timezone)}{" "}
                to {formatInclusiveEnd(report.data.endAt, report.data.timezone)}
              </span>
              <span>Timezone: {report.data.timezone}</span>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {(["day", "week", "month", "year", "custom"] as const).map((value) => (
                <button
                  className={`rounded-full px-3 py-1 text-sm ${
                    period === value
                      ? "bg-sky-500/20 text-sky-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                  key={`summary-inline-${value}`}
                  type="button"
                  onClick={() => setPeriod(value)}
                >
                  {PERIOD_LABELS[value]}
                </button>
              ))}
              {period === "custom" ? (
                <>
                  <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                    <span>From</span>
                    <input
                      className="bg-transparent text-slate-100"
                      type="date"
                      value={rangeStart}
                      onChange={(event) => setRangeStart(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                    <span>To</span>
                    <input
                      className="bg-transparent text-slate-100"
                      type="date"
                      value={rangeEnd}
                      onChange={(event) => setRangeEnd(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  <span>Reference</span>
                  <input
                    className="bg-transparent text-slate-100"
                    type="date"
                    value={reportReferenceDate}
                    onChange={(event) => setReportReferenceDate(event.target.value)}
                  />
                </label>
              )}
              <button
                className={`rounded-full px-3 py-1 text-sm ${
                  includeNotes
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-slate-800 text-slate-400"
                }`}
                type="button"
                onClick={() => setIncludeNotes((value) => !value)}
              >
                {includeNotes ? "Hide notes" : "Show notes"}
              </button>
            </div>
          </div>

          {([
            ["Delivery", DELIVERY_METRIC_LABELS],
            ["Review", REVIEW_METRIC_LABELS],
            ["Rework", REWORK_METRIC_LABELS],
          ] as const).map(([sectionLabel, labels]) => (
            <div
              className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
              key={sectionLabel}
            >
              <h3 className="text-sm font-semibold text-slate-200">
                {sectionLabel}
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(labels).map(([key, label]) => {
                  const metric =
                    report.data.metrics[key as keyof typeof report.data.metrics];
                  return (
                    <article
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                      key={key}
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-100">
                        {metric.count}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {metric.ticketKeys.length > 0
                          ? metric.ticketKeys.join(", ")
                          : "No tickets in this period."}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              {getCycleTimeTitle(
                report.data.startAt,
                report.data.endAt,
                report.data.timezone,
              )}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Based on persisted <span className="text-slate-300">active development</span> start events.
              The cycle ends on the first move to <span className="text-slate-300">code review</span> or{" "}
              <span className="text-slate-300">release</span> in the selected period.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {([
                [
                  "Development active → Code review",
                  report.data.cycleTimes.developmentActiveToReview,
                ],
                [
                  "Development active → Release",
                  report.data.cycleTimes.developmentActiveToRelease,
                ],
              ] as const).map(([label, cycle]) => (
                <article
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                  key={label}
                >
                  <p className="text-sm font-medium text-slate-100">{label}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Current period
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Count: {cycle.current.count}
                      </p>
                      <p className="text-sm text-slate-300">
                        Average: {formatDuration(cycle.current.averageSeconds)}
                      </p>
                      <p className="text-sm text-slate-300">
                        Median: {formatDuration(cycle.current.medianSeconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Previous equivalent period
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Count: {cycle.previous.count}
                      </p>
                      <p className="text-sm text-slate-300">
                        Average: {formatDuration(cycle.previous.averageSeconds)}
                      </p>
                      <p className="text-sm text-slate-300">
                        Median: {formatDuration(cycle.previous.medianSeconds)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {includeNotes && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="text-sm font-semibold text-slate-200">
                Reflections and learnings
              </h3>
              {report.data.reflections.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No saved reflections in this period.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {report.data.reflections.map((reflection) => (
                    <article
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                      key={`${reflection.ticketKey}:${reflection.updatedAt}`}
                    >
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="font-semibold text-slate-100">
                          {reflection.ticketKey}
                        </span>
                        {reflection.outcome && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                            {reflection.outcome}
                          </span>
                        )}
                        {reflection.difficulty && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                            {reflection.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-2 text-sm text-slate-300">
                        {reflection.blockers && (
                          <p>Blockers: {reflection.blockers}</p>
                        )}
                        {reflection.learnings && (
                          <p>Learnings: {reflection.learnings}</p>
                        )}
                        {reflection.notes && <p>Notes: {reflection.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
