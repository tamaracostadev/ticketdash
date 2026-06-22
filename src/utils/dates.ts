import type { IsoTimestamp } from "../types/persistence";

const relativeTime = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const ISO_TIMESTAMP_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const UNITS = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
] as const;

function parseTimestamp(timestamp: IsoTimestamp): number | null {
  if (!ISO_TIMESTAMP_WITH_TIMEZONE.test(timestamp)) {
    return null;
  }

  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? null : value;
}

export function normalizeIsoTimestamp(
  timestamp: unknown,
): IsoTimestamp | null {
  if (typeof timestamp !== "string") {
    return null;
  }

  const value = parseTimestamp(timestamp);
  return value === null ? null : new Date(value).toISOString();
}

export function isSameInstant(
  candidate: IsoTimestamp,
  reference: IsoTimestamp,
): boolean {
  const candidateValue = parseTimestamp(candidate);
  const referenceValue = parseTimestamp(reference);

  return candidateValue !== null && candidateValue === referenceValue;
}

export function isAfter(
  candidate: IsoTimestamp,
  reference: IsoTimestamp,
): boolean {
  const candidateValue = parseTimestamp(candidate);
  const referenceValue = parseTimestamp(reference);

  return (
    candidateValue !== null &&
    referenceValue !== null &&
    candidateValue > referenceValue
  );
}

export function formatRelative(
  timestamp: IsoTimestamp,
  now: Date = new Date(),
): string {
  const value = parseTimestamp(timestamp);

  if (value === null) {
    return "data invalida";
  }

  const seconds = (value - now.getTime()) / 1_000;
  const unit = UNITS.find(([, duration]) => Math.abs(seconds) >= duration);

  if (unit === undefined) {
    return relativeTime.format(Math.round(seconds), "second");
  }

  return relativeTime.format(Math.round(seconds / unit[1]), unit[0]);
}
