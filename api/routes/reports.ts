import type { FastifyInstance } from "fastify";

import type { ReportRepository } from "../reportRepository.ts";
import {
  normalizeReportPeriod,
  normalizeReportReferenceDate,
  normalizeReportTimezone,
} from "../../src/utils/reportValidation.ts";

interface ReportQuery {
  includeNotes?: string;
  period?: string;
  referenceDate?: string;
  rangeEnd?: string;
  rangeStart?: string;
  timezone?: string;
}

function isNotesEnabled(value: string | undefined): boolean {
  return value === "true";
}

export function registerReportRoutes(
  app: FastifyInstance,
  repository: ReportRepository,
): void {
  app.get<{ Querystring: Omit<ReportQuery, "period" | "referenceDate"> & { date?: string } }>(
    "/api/reports/daily-log",
    async (request, reply) => {
      const date = normalizeReportReferenceDate(request.query.date);
      const timezone = normalizeReportTimezone(request.query.timezone);
      if (!date || !timezone) {
        return reply.status(400).send({ message: "Invalid report query." });
      }
      return repository.fetchDailyLog(date, timezone);
    },
  );

  app.get<{ Querystring: ReportQuery }>(
    "/api/reports/summary",
    async (request, reply) => {
      const period = normalizeReportPeriod(request.query.period);
      const referenceDate = normalizeReportReferenceDate(
        request.query.referenceDate,
      );
      const rangeStart = normalizeReportReferenceDate(request.query.rangeStart);
      const rangeEnd = normalizeReportReferenceDate(request.query.rangeEnd);
      const timezone = normalizeReportTimezone(request.query.timezone);
      if (
        !period ||
        !referenceDate ||
        !timezone ||
        (
          period === "custom" &&
          (
            !rangeStart ||
            !rangeEnd ||
            rangeStart > rangeEnd
          )
        )
      ) {
        return reply.status(400).send({ message: "Invalid report query." });
      }
      return repository.fetchSummary(
        period,
        referenceDate,
        timezone,
        isNotesEnabled(request.query.includeNotes),
        rangeStart ?? undefined,
        rangeEnd ?? undefined,
      );
    },
  );
}
