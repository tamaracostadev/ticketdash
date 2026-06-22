import { useQuery } from "@tanstack/react-query";

import { createDemoReportSummary } from "../demo/demoData";
import { getCurrentDemoMode } from "../demo/mode";
import { fetchReportSummary } from "../api/reports";
import type { ReportPeriod } from "../types/reports";

export function useReports(
  period: ReportPeriod,
  referenceDate: string,
  timezone: string,
  includeNotes: boolean,
  rangeStart?: string,
  rangeEnd?: string,
) {
  const demoMode = getCurrentDemoMode();
  return useQuery({
    queryFn: () =>
      demoMode
        ? Promise.resolve(
          createDemoReportSummary(
            period,
            referenceDate,
            timezone,
            includeNotes,
            rangeStart,
            rangeEnd,
          ),
        )
        : fetchReportSummary(
          period,
          referenceDate,
          timezone,
          includeNotes,
          rangeStart,
          rangeEnd,
        ),
    queryKey: [
      "reports",
      demoMode ? "demo" : "live",
      period,
      referenceDate,
      timezone,
      includeNotes,
      rangeStart,
      rangeEnd,
    ],
  });
}
