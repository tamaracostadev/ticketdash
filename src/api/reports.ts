import type { DailyWorkLog, ReportPeriod, ReportSummary } from "../types/reports";
import { parseDailyWorkLog, parseReportSummary } from "../utils/reportValidation";

async function readJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      typeof (body as Record<string, unknown>).message === "string"
        ? String((body as Record<string, unknown>).message)
        : "Report summary unavailable.";
    throw new Error(message);
  }
  return body;
}

export async function fetchReportSummary(
  period: ReportPeriod,
  referenceDate: string,
  timezone: string,
  includeNotes = false,
  rangeStart?: string,
  rangeEnd?: string,
  request: typeof fetch = fetch,
): Promise<ReportSummary> {
  const query = new URLSearchParams({
    includeNotes: includeNotes ? "true" : "false",
    period,
    referenceDate,
    timezone,
  });
  if (rangeStart) query.set("rangeStart", rangeStart);
  if (rangeEnd) query.set("rangeEnd", rangeEnd);
  const parsed = parseReportSummary(
    await readJson(await request(`/api/reports/summary?${query.toString()}`)),
  );
  if (parsed === null) {
    throw new Error("Report summary returned invalid data.");
  }
  return parsed;
}

export async function fetchDailyWorkLog(
  date: string,
  timezone: string,
  request: typeof fetch = fetch,
): Promise<DailyWorkLog> {
  const query = new URLSearchParams({ date, timezone });
  const parsed = parseDailyWorkLog(
    await readJson(await request(`/api/reports/daily-log?${query.toString()}`)),
  );
  if (parsed === null) {
    throw new Error("Daily work log returned invalid data.");
  }
  return parsed;
}
