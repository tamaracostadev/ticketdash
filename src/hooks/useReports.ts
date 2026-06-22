import { useQuery } from "@tanstack/react-query";

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
  return useQuery({
    queryFn: () =>
      fetchReportSummary(
        period,
        referenceDate,
        timezone,
        includeNotes,
        rangeStart,
        rangeEnd,
      ),
    queryKey: [
      "reports",
      period,
      referenceDate,
      timezone,
      includeNotes,
      rangeStart,
      rangeEnd,
    ],
  });
}
